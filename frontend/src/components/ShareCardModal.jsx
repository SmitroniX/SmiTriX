import { useState, useEffect, useRef } from 'react'
import { generateShareCard, renderShareCardCanvas, SHARE_THEMES } from '../lib/share-card.js'
import { t } from '../lib/i18n.js'
import { fmtDate, fmtDur, fmtVol, fmtNum } from '../lib/format.js'
import { setsDone, workSetsDone } from '../lib/history.js'
import { exerciseNameFor } from '../lib/i18n-core.js'
import { exOr } from '../lib/exercises.js'
import { musclesOf, MUSCLE_NAME } from '../lib/muscles.js'
import Icon from './Icon.jsx'
import { Button } from './ui.jsx'
import { useUI } from '../store/useUI.js'

export default function ShareCardModal({ workout, prs = [], e1prs = [], unit = 'kg', streak = 0, athleteName = '', close }) {
  const [theme, setTheme] = useState('obsidian')
  const [showPrs, setShowPrs] = useState(true)
  const [showExercises, setShowExercises] = useState(true)
  const [showMuscles, setShowMuscles] = useState(true)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const toast = useUI(s => s.toast)

  const w = workout || {}
  const durationStr = w.end && w.start ? fmtDur(w.end - w.start) : '0:00'
  const dateStr = w.d ? fmtDate(w.d, true) : ''

  // Derived muscles
  const workoutMuscles = (() => {
    if (!w.entries?.length) return []
    const counts = {}
    for (const item of w.entries) {
      const ex = exOr(item.id)
      if (!ex) continue
      const m = musclesOf(ex)
      for (const [slug, weight] of Object.entries(m)) {
        counts[slug] = (counts[slug] || 0) + weight
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([slug]) => MUSCLE_NAME[slug] || slug)
  })()

  // Derived PR details
  const prDetails = [
    ...(prs || []).map(id => exerciseNameFor(exOr(id))),
    ...(e1prs || []).map(p => `${exerciseNameFor(exOr(p.id))} (1RM: ${fmtNum(p.est)} ${unit})`),
    ...(w.prs || []).map(id => exerciseNameFor(exOr(id)))
  ].filter((v, i, a) => a.indexOf(v) === i)

  // Derived exercise list
  const exerciseList = (w.entries || [])
    .filter(e => (e.sets || []).some(s => s.done))
    .map(e => ({
      name: exerciseNameFor(exOr(e.id)),
      sets: `${(e.sets || []).filter(s => s.done).length} sets`
    }))

  const cardOptions = {
    theme,
    duration: durationStr,
    volume: w.vol || 0,
    sets: setsDone(w),
    workSets: workSetsDone(w),
    prs: showPrs ? prDetails : [],
    muscles: showMuscles ? workoutMuscles : [],
    unit,
    name: w.name || 'Workout',
    date: dateStr,
    exercises: showExercises ? exerciseList : [],
    streak,
    athleteName
  }

  // Generate live preview on canvas
  useEffect(() => {
    let canceled = false
    const canvas = renderShareCardCanvas(cardOptions)
    if (canvas && typeof canvas.toDataURL === 'function') {
      try {
        const url = canvas.toDataURL('image/png')
        if (!canceled) setPreviewUrl(url)
      } catch (e) {
        // Fallback
      }
    }
    return () => { canceled = true }
  }, [theme, showPrs, showExercises, showMuscles])

  const handleShare = async () => {
    setLoading(true)
    try {
      const blob = await generateShareCard(cardOptions)
      if (!blob) {
        toast(t('Could not generate share image'))
        setLoading(false)
        return
      }

      const file = new File([blob], `smitrix-workout-${w.d || 'summary'}.png`, { type: 'image/png' })
      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'SmiTriX Workout Telemetry',
          text: `Crushed my workout on SmiTriX! ${setsDone(w)} sets, ${fmtVol(w.vol || 0, unit)} volume moved.`,
        })
      } else if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: 'SmiTriX Workout Telemetry',
          text: `Crushed my workout on SmiTriX! ${setsDone(w)} sets, ${fmtVol(w.vol || 0, unit)} volume moved.`,
        })
      } else {
        handleDownload()
      }
    } catch (e) {
      if (e?.name !== 'AbortError') {
        toast(t('Share card generated'))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    const blob = await generateShareCard(cardOptions)
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `smitrix-${(w.name || 'workout').toLowerCase().replace(/\s+/g, '-')}-${w.d || 'summary'}.png`
    a.click()
    URL.revokeObjectURL(url)
    toast(t('Image saved to downloads'))
  }

  const handleCopyText = () => {
    const lines = [
      `⚡ ${w.name || 'WORKOUT'} · SMITRIX`,
      `📅 ${dateStr}`,
      `⏱️ Duration: ${durationStr}`,
      `📊 Volume: ${fmtVol(w.vol || 0, unit)} (${setsDone(w)} sets)`,
      `----------------------------`
    ]
    if (exerciseList.length) {
      lines.push('Exercises:')
      exerciseList.forEach(e => lines.push(`• ${e.name} (${e.sets})`))
      lines.push(`----------------------------`)
    }
    if (prDetails.length) {
      lines.push(`🏆 PRs: ${prDetails.join(', ')}`)
      lines.push(`----------------------------`)
    }
    lines.push(`Tracked with SmiTriX Local-First Fitness`)

    const text = lines.join('\n')
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => toast(t('Summary copied to clipboard')))
    }
  }

  return (
    <div className="share-modal-content" style={{ padding: '4px 0' }}>
      <div className="row between" style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>{t('Share Workout Card')}</h3>
        <button className="iconbtn" onClick={close} aria-label="Close"><Icon name="xmark" /></button>
      </div>

      {/* Theme Picker Chips */}
      <div className="small dim" style={{ marginBottom: 8, fontWeight: 600 }}>{t('Card Style Theme')}</div>
      <div className="share-theme-selector" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        {SHARE_THEMES.map(th => (
          <button
            key={th.id}
            type="button"
            className={'share-theme-pill' + (theme === th.id ? ' active' : '')}
            onClick={() => setTheme(th.id)}
            style={{
              padding: '10px 12px',
              borderRadius: 12,
              border: theme === th.id ? '1.5px solid var(--acc)' : '1px solid var(--sep-op)',
              background: theme === th.id ? 'var(--acc-soft)' : 'var(--surface-2)',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: 2
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: theme === th.id ? 'var(--acc)' : 'var(--label)' }}>{th.name}</span>
            <span style={{ fontSize: 11, color: 'var(--label-3)' }}>{th.subtitle}</span>
          </button>
        ))}
      </div>

      {/* Live Preview Canvas Container */}
      <div
        className="share-preview-box"
        style={{
          borderRadius: 16,
          overflow: 'hidden',
          background: '#040608',
          border: '1px solid var(--sep)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          maxHeight: 340,
          marginBottom: 16,
          boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
        }}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Workout Share Preview"
            style={{ maxHeight: 340, width: 'auto', objectFit: 'contain' }}
          />
        ) : (
          <div style={{ padding: 40, color: 'var(--dim)' }}>{t('Generating high-res card...')}</div>
        )}
      </div>

      {/* Customization Toggles */}
      <div className="row" style={{ gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button
          type="button"
          className={'tag' + (showPrs ? ' acc' : ' dim')}
          onClick={() => setShowPrs(!showPrs)}
          style={{ cursor: 'pointer', padding: '6px 12px', fontSize: 12 }}
        >
          <Icon name="trophy" style={{ marginRight: 4 }} />
          {t('PRs: {0}', showPrs ? t('On') : t('Off'))}
        </button>
        <button
          type="button"
          className={'tag' + (showExercises ? ' acc' : ' dim')}
          onClick={() => setShowExercises(!showExercises)}
          style={{ cursor: 'pointer', padding: '6px 12px', fontSize: 12 }}
        >
          <Icon name="list" style={{ marginRight: 4 }} />
          {t('Exercises: {0}', showExercises ? t('On') : t('Off'))}
        </button>
        <button
          type="button"
          className={'tag' + (showMuscles ? ' acc' : ' dim')}
          onClick={() => setShowMuscles(!showMuscles)}
          style={{ cursor: 'pointer', padding: '6px 12px', fontSize: 12 }}
        >
          <Icon name="figureStrength" style={{ marginRight: 4 }} />
          {t('Target Muscles: {0}', showMuscles ? t('On') : t('Off'))}
        </button>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Button variant="primary" icon="share" onClick={handleShare} disabled={loading}>
          {loading ? t('Preparing...') : t('Share to Social / Friends')}
        </Button>
        <div className="row" style={{ gap: 8 }}>
          <Button variant="tinted" icon="download" onClick={handleDownload} style={{ flex: 1 }}>
            {t('Save Image')}
          </Button>
          <Button variant="ghost" icon="copy" onClick={handleCopyText} style={{ flex: 1 }}>
            {t('Copy Text')}
          </Button>
        </div>
      </div>
    </div>
  )
}
