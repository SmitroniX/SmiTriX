import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { loadOfWorkouts } from '../lib/muscles.js'
import { todayISO, fmtDate, uid } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import BodyMap from '../components/BodyMap.jsx'
import { Rise, CollapsedHeader } from '../components/GymManeMotion.jsx'
import Icon from '../components/Icon.jsx'

function compressPhoto(file, maxDim = 960) {
  return new Promise((resolve, reject) => {
    const rd = new FileReader()
    rd.onerror = reject
    rd.onload = () => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        let { width: w, height: h } = img
        if (w > maxDim || h > maxDim) {
          if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim }
          else { w = Math.round((w * maxDim) / h); h = maxDim }
        }
        const c = document.createElement('canvas')
        c.width = w; c.height = h
        c.getContext('2d').drawImage(img, 0, 0, w, h)
        resolve(c.toDataURL('image/jpeg', 0.82))
      }
      img.src = rd.result
    }
    rd.readAsDataURL(file)
  })
}

const POSES = [
  { id: 'front', label: 'Front' },
  { id: 'side', label: 'Side' },
  { id: 'back', label: 'Back' },
]

// GymMane Progress Photos, Muscle Timeline & Side-by-Side Compare (timeline_screen.dart + compare_screen.dart)
export default function Timeline() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const [mode, setMode] = useState('photos') // 'photos' | 'body' | 'compare'
  const [windowDays, setWindowDays] = useState(14)
  const [uploadTarget, setUploadTarget] = useState({ date: todayISO(), pose: 'front' })
  const [comparePose, setComparePose] = useState('front')
  const [leftIdx, setLeftIdx] = useState(0)
  const [rightIdx, setRightIdx] = useState(0)
  const fileRef = useRef(null)

  const shots = useMemo(() =>
    (S.progressShots || []).slice().sort((a, b) => String(b.d || '').localeCompare(String(a.d || ''))),
    [S.progressShots]
  )

  const comparable = useMemo(() =>
    shots.filter(s => s.shots?.[comparePose]).slice().reverse(),
    [shots, comparePose]
  )

  const bodyWindows = useMemo(() => {
    const workouts = (S.workouts || []).filter(w => w.d).sort((a, b) => String(b.d).localeCompare(String(a.d)))
    if (!workouts.length) return []
    const now = new Date()
    const out = []
    for (let i = 0; i < 6; i++) {
      const to = new Date(now.getTime() - i * windowDays * 86400000)
      const from = new Date(to.getTime() - windowDays * 86400000)
      const fromIso = from.toISOString().slice(0, 10)
      const toIso = to.toISOString().slice(0, 10)
      const slice = workouts.filter(w => w.d > fromIso && w.d <= toIso)
      if (!slice.length) continue
      out.push({ fromIso, toIso, count: slice.length, load: loadOfWorkouts(slice) })
    }
    return out
  }, [S.workouts, windowDays])

  const triggerPhoto = (date, pose) => {
    setUploadTarget({ date, pose })
    fileRef.current?.click()
  }

  const onFile = async e => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const url = await compressPhoto(file)
      update(s => {
        s.progressShots = s.progressShots || []
        const existing = s.progressShots.find(x => x.d === uploadTarget.date)
        if (existing) {
          existing.shots = { ...(existing.shots || {}), [uploadTarget.pose]: url }
        } else {
          s.progressShots.push({ id: uid(), d: uploadTarget.date, shots: { [uploadTarget.pose]: url } })
        }
      })
      useUI.getState().toast(t('Progress photo saved'), { icon: 'camera', accent: 'var(--gm-sage)' })
    } catch {
      useUI.getState().toast(t('Could not read image'))
    } finally {
      e.target.value = ''
    }
  }

  const deleteEntry = id => {
    update(s => { s.progressShots = (s.progressShots || []).filter(x => x.id !== id) })
  }

  const beforeShot = comparable[Math.min(leftIdx, Math.max(0, comparable.length - 1))]
  const afterShot = comparable[rightIdx ? Math.min(rightIdx, comparable.length - 1) : Math.max(0, comparable.length - 1)]

  return (
    <div className="narrow">
      <CollapsedHeader title={t('Timeline')} />
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFile} />

      <div className="hdr" style={{ alignItems: 'center' }}>
        <button type="button" className="iconbtn" onClick={() => nav('/stats')} aria-label={t('Back')}>
          <Icon name="chevronLeft" />
        </button>
        <div style={{ flex: 1, marginLeft: 10 }}>
          <h1 style={{ fontSize: 26 }}>{t('Timeline')}</h1>
          <div className="sub">
            {mode === 'body' ? t('{0} workouts mapped', (S.workouts || []).length) : t('{0} check-ins', shots.length)}
          </div>
        </div>
      </div>

      {/* Mode Switcher: Photos | Muscle Map | Compare */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--surface)', padding: 4, borderRadius: 999, marginBottom: 18 }}>
        {[
          { id: 'photos', icon: 'image', label: t('Photos') },
          { id: 'body', icon: 'person', label: t('Muscles') },
          { id: 'compare', icon: 'compare', label: t('Compare') },
        ].map(m => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            style={{
              flex: 1, height: 38, borderRadius: 999, fontSize: 13, fontWeight: 800,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              background: mode === m.id ? 'var(--ember)' : 'transparent',
              color: mode === m.id ? 'var(--on-ember)' : 'var(--label-2)',
            }}
          >
            <Icon name={m.icon} style={{ fontSize: 14 }} />
            <span>{m.label}</span>
          </button>
        ))}
      </div>

      {mode === 'photos' && (
        <Rise index={0}>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="gm-micro" style={{ marginBottom: 10 }}>{t("ADD TODAY'S CHECK-IN")}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {POSES.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => triggerPhoto(todayISO(), p.id)}
                  style={{
                    padding: '14px 8px', borderRadius: 16, background: 'var(--surface-2)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: 13,
                  }}
                >
                  <Icon name="camera" style={{ fontSize: 20, color: 'var(--acc)' }} />
                  <span>{t(p.label)}</span>
                </button>
              ))}
            </div>
          </div>

          {!shots.length ? (
            <div className="card" style={{ textAlign: 'center', padding: 28 }}>
              <Icon name="image" style={{ fontSize: 32, color: 'var(--label-3)', margin: '0 auto 10px' }} />
              <div style={{ fontWeight: 800, marginBottom: 4 }}>{t('Your visual timeline starts here')}</div>
              <div className="muted small">{t('Capture Front, Side, and Back photos to track physique changes over time.')}</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {shots.map(entry => (
                <div key={entry.id} className="card" style={{ margin: 0 }}>
                  <div className="row between" style={{ marginBottom: 10 }}>
                    <strong>{fmtDate(entry.d, true, true)}</strong>
                    <button type="button" style={{ color: 'var(--label-3)', fontSize: 15 }} onClick={() => deleteEntry(entry.id)}>
                      <Icon name="trash" />
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {POSES.map(p => {
                      const src = entry.shots?.[p.id]
                      return (
                        <div
                          key={p.id}
                          onClick={() => triggerPhoto(entry.d, p.id)}
                          style={{
                            aspectRatio: '3 / 4', borderRadius: 14, overflow: 'hidden',
                            background: 'var(--surface-2)', cursor: 'pointer', position: 'relative',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          {src ? (
                            <img src={src} alt={p.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <>
                              <Icon name="plus" style={{ color: 'var(--label-3)', fontSize: 18 }} />
                              <span className="dim" style={{ fontSize: 10.5, fontWeight: 700, marginTop: 4 }}>{t(p.label)}</span>
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Rise>
      )}

      {mode === 'body' && (
        <Rise index={0}>
          <div className="row between" style={{ marginBottom: 14 }}>
            <span className="gm-micro">{t('WINDOW SIZE')}</span>
            <div className="row" style={{ gap: 6 }}>
              {[7, 14, 30].map(d => (
                <button key={d} type="button" className={'chip' + (windowDays === d ? ' on' : '')} onClick={() => setWindowDays(d)}>
                  {d}d
                </button>
              ))}
            </div>
          </div>

          {!bodyWindows.length ? (
            <div className="card" style={{ textAlign: 'center', padding: 28 }}>
              <div className="muted small">{t('Log workouts to see your muscle heatmap evolve across time.')}</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {bodyWindows.map(win => (
                <div key={win.toIso} className="card" style={{ margin: 0 }}>
                  <div className="row between" style={{ marginBottom: 8 }}>
                    <strong style={{ fontSize: 14 }}>{fmtDate(win.fromIso)} – {fmtDate(win.toIso)}</strong>
                    <span className="tag acc" style={{ fontSize: 11 }}>{t('{0} sessions', win.count)}</span>
                  </div>
                  <BodyMap load={win.load} body={S.body} />
                </div>
              ))}
            </div>
          )}
        </Rise>
      )}

      {mode === 'compare' && (
        <Rise index={0}>
          <div className="row" style={{ gap: 6, marginBottom: 14 }}>
            {POSES.map(p => (
              <button key={p.id} type="button" className={'chip' + (comparePose === p.id ? ' on' : '')} onClick={() => { setComparePose(p.id); setLeftIdx(0); setRightIdx(0) }}>
                {t(p.label)}
              </button>
            ))}
          </div>

          {comparable.length < 2 ? (
            <div className="card" style={{ textAlign: 'center', padding: 28 }}>
              <Icon name="compare" style={{ fontSize: 32, color: 'var(--label-3)', margin: '0 auto 10px' }} />
              <div style={{ fontWeight: 800, marginBottom: 4 }}>{t('Add at least 2 {0} photos', comparePose)}</div>
              <div className="muted small">{t('Once you have photos from two different dates, compare them side-by-side here.')}</div>
            </div>
          ) : (
            <div className="card">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { label: t('Before'), shot: beforeShot, idx: leftIdx, setIdx: setLeftIdx },
                  { label: t('After'), shot: afterShot, idx: rightIdx || comparable.length - 1, setIdx: setRightIdx },
                ].map((side, i) => (
                  <div key={i}>
                    <div className="gm-micro" style={{ marginBottom: 6 }}>{side.label}</div>
                    <div style={{ aspectRatio: '3 / 4', borderRadius: 16, overflow: 'hidden', background: 'var(--surface-2)', marginBottom: 8 }}>
                      <img src={side.shot.shots[comparePose]} alt={side.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <select
                      className="input"
                      style={{ fontSize: 12, padding: '6px 8px' }}
                      value={side.idx}
                      onChange={e => side.setIdx(Number(e.target.value))}
                    >
                      {comparable.map((c, ci) => (
                        <option key={c.id} value={ci}>{fmtDate(c.d, true, true)}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Rise>
      )}
    </div>
  )
}
