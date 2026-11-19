import { useState, useRef, useMemo } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { exOr } from '../lib/exercises.js'
import { fmtNum, fmtDate, todayISO } from '../lib/format.js'
import { t, exerciseNameFor } from '../lib/i18n.js'
import { syncWorkoutPostToCloud, trackEvent } from '../lib/analytics.js'
import Icon from './Icon.jsx'
import { Button } from './ui.jsx'

/**
 * Compress an uploaded image File into a compact Data URL (<= 720px) for fast local & Firestore storage.
 */
function compressImageFile(file, maxDim = 720, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read image file'))
    reader.onload = ev => {
      const img = new Image()
      img.onerror = () => reject(new Error('Invalid image format'))
      img.onload = () => {
        let w = img.width || 600
        let h = img.height || 600
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w)
            w = maxDim
          } else {
            w = Math.round((w * maxDim) / h)
            h = maxDim
          }
        }
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
  })
}

/**
 * Summarize a workout object into Hevy-style metrics and exercise best-set rows.
 */
export function summarizeWorkoutForPost(workout, unit = 'kg') {
  if (!workout) {
    return {
      title: 'Freestyle Hypertrophy Session',
      date: todayISO(),
      durationMin: 45,
      totalVolume: 0,
      totalSets: 0,
      exercises: []
    }
  }
  const entries = workout.entries || []
  let totalVolume = 0
  let totalSets = 0
  const exercises = []

  for (const e of entries) {
    const doneSets = (e.sets || []).filter(s => s.done)
    if (!doneSets.length) continue
    totalSets += doneSets.length
    let bestSet = doneSets[0]
    for (const s of doneSets) {
      const vol = (Number(s.w) || 0) * (Number(s.r) || 0)
      totalVolume += vol
      if ((Number(s.w) || 0) > (Number(bestSet.w) || 0) ||
          ((Number(s.w) || 0) === (Number(bestSet.w) || 0) && (Number(s.r) || 0) > (Number(bestSet.r) || 0))) {
        bestSet = s
      }
    }
    const ex = exOr(e.id)
    exercises.push({
      id: e.id,
      name: ex ? exerciseNameFor(ex) : e.id,
      setCount: doneSets.length,
      bestWeight: Number(bestSet.w) || 0,
      bestReps: Number(bestSet.r) || 0
    })
  }

  const durationMin = (workout.start && workout.end)
    ? Math.max(1, Math.round((workout.end - workout.start) / 60000))
    : 45

  return {
    title: workout.name || workout.routineName || (exercises[0] ? `${exercises[0].name} & Hypertrophy` : 'Gym Training Session'),
    date: workout.d || todayISO(),
    durationMin,
    totalVolume: Math.round(totalVolume),
    totalSets,
    unit,
    exercises: exercises.slice(0, 6)
  }
}

export default function WorkoutPhotoFeed() {
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const update = useStore(s => s.update)
  const workouts = S.workouts || []
  const posts = S.workoutPosts || []

  const [viewMode, setViewMode] = useState('feed') // 'feed' | 'grid'
  const [showComposer, setShowComposer] = useState(false)
  const [selectedWorkoutIdx, setSelectedWorkoutIdx] = useState(0)
  const [caption, setCaption] = useState('')
  const [photoDataUrl, setPhotoDataUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const fileInputRef = useRef(null)

  const recentWorkouts = useMemo(() =>
    workouts.slice().sort((a, b) => String(b.d || '').localeCompare(String(a.d || ''))).slice(0, 15),
    [workouts]
  )

  const handleFileChange = async e => {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    try {
      const compressed = await compressImageFile(file)
      setPhotoDataUrl(compressed)
    } catch (err) {
      useUI.getState().toast(err.message || t('Could not process photo'))
    } finally {
      setBusy(false)
    }
  }

  const handleCreatePost = async e => {
    e?.preventDefault?.()
    const targetWorkout = recentWorkouts[selectedWorkoutIdx] || null
    const summary = summarizeWorkoutForPost(targetWorkout, S.unit)

    const newPost = {
      id: 'post_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
      athleteName: user?.name || 'Athlete',
      caption: caption.trim() || t('Crushed today’s session on SmiTriX! 💪'),
      photoDataUrl: photoDataUrl || '',
      workoutId: targetWorkout?.id || null,
      summary,
      kudos: 1,
      createdAt: Date.now()
    }

    update(s => {
      s.workoutPosts = [newPost, ...(s.workoutPosts || [])].slice(0, 50)
    })

    syncWorkoutPostToCloud(user, newPost).catch(() => {})
    trackEvent('workout_photo_posted', { hasPhoto: !!photoDataUrl, exercises: summary.exercises.length })

    setCaption('')
    setPhotoDataUrl('')
    setShowComposer(false)
    useUI.getState().toast(t('Workout post published to your profile feed!'))
  }

  const handleToggleKudos = postId => {
    update(s => {
      const p = (s.workoutPosts || []).find(x => x.id === postId)
      if (p) p.kudos = (p.kudos || 0) + 1
    })
  }

  const handleDeletePost = postId => {
    update(s => {
      s.workoutPosts = (s.workoutPosts || []).filter(x => x.id !== postId)
    })
    useUI.getState().toast(t('Workout post removed'))
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      {/* Header Bar */}
      <div className="row between" style={{ marginBottom: 12 }}>
        <div className="row" style={{ gap: 8, alignItems: 'center' }}>
          <Icon name="camera" style={{ color: 'var(--acc)', fontSize: 18 }} />
          <div>
            <h2 style={{ margin: 0, fontSize: 16, color: 'var(--label)' }}>{t('Workout Photos & Activity Feed')}</h2>
            <div className="dim small" style={{ fontSize: 11 }}>{t('Share your gym photos alongside your logged sets & volume')}</div>
          </div>
        </div>
        <Button size="sm" variant="primary" icon="plus" style={{ width: 'auto', padding: '7px 12px', fontSize: 12 }} onClick={() => setShowComposer(v => !v)}>
          {t('Post Workout')}
        </Button>
      </div>

      {/* Inline Post Composer */}
      {showComposer && (
        <form
          onSubmit={handleCreatePost}
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 14,
            padding: 14,
            marginBottom: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}
        >
          <div className="row between">
            <span style={{ fontSize: 13, fontWeight: 700 }}>{t('Create Workout Post')}</span>
            <button type="button" className="iconbtn" style={{ width: 26, height: 26 }} onClick={() => setShowComposer(false)}>
              <Icon name="xmark" size={13} />
            </button>
          </div>

          {/* Select Linked Workout */}
          <div>
            <label className="small dim" style={{ display: 'block', marginBottom: 4 }}>{t('Attach Logged Workout')}</label>
            {recentWorkouts.length > 0 ? (
              <select
                className="input"
                value={selectedWorkoutIdx}
                onChange={e => setSelectedWorkoutIdx(Number(e.target.value))}
                style={{ fontSize: 13, padding: '10px 12px' }}
              >
                {recentWorkouts.map((w, idx) => {
                  const s = summarizeWorkoutForPost(w, S.unit)
                  return (
                    <option key={w.id || idx} value={idx}>
                      {fmtDate(s.date)} — {s.title} ({s.totalSets} {t('sets')} · {fmtNum(s.totalVolume)} {S.unit})
                    </option>
                  )
                })}
              </select>
            ) : (
              <div className="small dim" style={{ padding: '8px 10px', background: 'var(--surface)', borderRadius: 8 }}>
                {t('No logged workouts yet — your post will attach a Freestyle Session card.')}
              </div>
            )}
          </div>

          {/* Photo Picker / Camera Capture */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            {photoDataUrl ? (
              <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', maxHeight: 240, background: '#000' }}>
                <img src={photoDataUrl} alt="Workout preview" style={{ width: '100%', maxHeight: 240, objectFit: 'cover', display: 'block' }} />
                <button
                  type="button"
                  className="iconbtn"
                  onClick={() => setPhotoDataUrl('')}
                  style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.75)', color: '#fff', width: 30, height: 30 }}
                >
                  <Icon name="trash" size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '100%',
                  padding: '18px 12px',
                  borderRadius: 12,
                  border: '1.5px dashed var(--acc)',
                  background: 'color-mix(in srgb, var(--acc) 8%, var(--surface))',
                  color: 'var(--acc)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 13
                }}
              >
                <Icon name="camera" size={22} />
                <span>{busy ? t('Compressing photo...') : t('Upload or Take Workout Photo')}</span>
              </button>
            )}
          </div>

          {/* Caption */}
          <input
            className="input"
            type="text"
            placeholder={t('Write a caption (e.g. Heavy chest day PR, feeling strong!)')}
            value={caption}
            onChange={e => setCaption(e.target.value)}
            maxLength={220}
            style={{ fontSize: 13 }}
          />

          <div className="row" style={{ gap: 8 }}>
            <Button variant="ghost" type="button" onClick={() => setShowComposer(false)} style={{ flex: 1 }}>
              {t('Cancel')}
            </Button>
            <Button variant="primary" type="submit" disabled={busy} style={{ flex: 1.5 }}>
              {t('Publish Workout Post')}
            </Button>
          </div>
        </form>
      )}

      {/* Feed / Grid View Switcher */}
      {posts.length > 0 && (
        <div className="row between" style={{ marginBottom: 10 }}>
          <span className="small dim">{t('{0} Workout Posts', posts.length)}</span>
          <div className="row" style={{ gap: 4, background: 'var(--surface-2)', padding: 3, borderRadius: 8 }}>
            <button
              type="button"
              className={`btn ${viewMode === 'feed' ? 'primary' : 'ghost'}`}
              style={{ width: 'auto', padding: '4px 10px', fontSize: 11, borderRadius: 6 }}
              onClick={() => setViewMode('feed')}
            >
              {t('Feed')}
            </button>
            <button
              type="button"
              className={`btn ${viewMode === 'grid' ? 'primary' : 'ghost'}`}
              style={{ width: 'auto', padding: '4px 10px', fontSize: 11, borderRadius: 6 }}
              onClick={() => setViewMode('grid')}
            >
              {t('Photos')}
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {posts.length === 0 ? (
        <div
          style={{
            padding: '20px 14px',
            borderRadius: 14,
            background: 'var(--surface-2)',
            textAlign: 'center',
            border: '1px dashed var(--border-hairline)'
          }}
        >
          <div style={{ fontSize: 24, marginBottom: 6 }}>📸</div>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{t('Post Your First Workout Photo')}</div>
          <div className="muted small" style={{ maxWidth: 320, margin: '0 auto 12px', lineHeight: 1.45 }}>
            {t('Capture your post-workout progress photo paired automatically with your exercises, sets, and total volume lifted.')}
          </div>
          <Button size="sm" variant="tinted" icon="camera" style={{ width: 'auto' }} onClick={() => setShowComposer(true)}>
            {t('Add Workout Photo Post')}
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {posts.map(post => (
            <div
              key={post.id}
              onClick={() => setViewMode('feed')}
              style={{
                aspectRatio: '1/1',
                borderRadius: 10,
                overflow: 'hidden',
                position: 'relative',
                background: 'var(--surface-2)',
                cursor: 'pointer',
                border: '1px solid var(--border-hairline)'
              }}
            >
              {post.photoDataUrl ? (
                <img src={post.photoDataUrl} alt={post.summary?.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 6, textAlign: 'center' }}>
                  <Icon name="dumbbell" style={{ color: 'var(--acc)', fontSize: 20, marginBottom: 4 }} />
                  <span style={{ fontSize: 10, fontWeight: 700 }}>{fmtNum(post.summary?.totalVolume || 0)} {post.summary?.unit || S.unit}</span>
                </div>
              )}
              <div style={{ position: 'absolute', bottom: 4, left: 4, right: 4, background: 'rgba(0,0,0,0.68)', color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {fmtDate(post.summary?.date)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {posts.map(post => {
            const sum = post.summary || {}
            return (
              <div
                key={post.id}
                style={{
                  background: 'var(--surface-2)',
                  borderRadius: 16,
                  border: '1px solid var(--border-hairline)',
                  overflow: 'hidden'
                }}
              >
                {/* Athlete Post Header */}
                <div className="row between" style={{ padding: '12px 14px 8px' }}>
                  <div className="row" style={{ gap: 10 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: 'var(--acc)',
                        color: 'var(--on-acc)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: 14
                      }}
                    >
                      {(post.athleteName || 'A').slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{post.athleteName || user?.name || 'Athlete'}</div>
                      <div className="dim small" style={{ fontSize: 11 }}>{fmtDate(sum.date)} · {sum.title}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="iconbtn"
                    style={{ width: 28, height: 28 }}
                    onClick={() => handleDeletePost(post.id)}
                    aria-label={t('Delete post')}
                  >
                    <Icon name="trash" size={13} />
                  </button>
                </div>

                {/* Caption */}
                {post.caption && (
                  <div style={{ padding: '0 14px 10px', fontSize: 13.5, lineHeight: 1.4 }}>
                    {post.caption}
                  </div>
                )}

                {/* Workout Photo with Telemetry Overlay */}
                {post.photoDataUrl && (
                  <div style={{ position: 'relative', background: '#000', maxHeight: 320, overflow: 'hidden' }}>
                    <img
                      src={post.photoDataUrl}
                      alt={sum.title}
                      style={{ width: '100%', maxHeight: 320, objectFit: 'cover', display: 'block' }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 10,
                        left: 10,
                        right: 10,
                        background: 'rgba(0,0,0,0.72)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        borderRadius: 10,
                        padding: '8px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        color: '#fff',
                        border: '1px solid rgba(255,255,255,0.16)'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--acc)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                          SmiTriX Verified Session
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{sum.title}</div>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 700 }}>
                        <div>{fmtNum(sum.totalVolume || 0)} {sum.unit || S.unit}</div>
                        <div style={{ fontSize: 10, opacity: 0.75 }}>{sum.durationMin || 45}m · {sum.totalSets || 0} sets</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Hevy-Style Workout Stats Strip */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    padding: '10px 14px',
                    background: 'var(--surface)',
                    borderTop: '1px solid var(--border-hairline)',
                    borderBottom: '1px solid var(--border-hairline)',
                    fontSize: 12
                  }}
                >
                  <div>
                    <div className="dim small" style={{ fontSize: 10, textTransform: 'uppercase' }}>{t('Duration')}</div>
                    <div style={{ fontWeight: 700 }}>{sum.durationMin || 45} min</div>
                  </div>
                  <div>
                    <div className="dim small" style={{ fontSize: 10, textTransform: 'uppercase' }}>{t('Volume')}</div>
                    <div style={{ fontWeight: 700, color: 'var(--acc)' }}>{fmtNum(sum.totalVolume || 0)} {sum.unit || S.unit}</div>
                  </div>
                  <div>
                    <div className="dim small" style={{ fontSize: 10, textTransform: 'uppercase' }}>{t('Working Sets')}</div>
                    <div style={{ fontWeight: 700 }}>{sum.totalSets || 0} {t('sets')}</div>
                  </div>
                </div>

                {/* Exercise & Best Set Breakdown */}
                {(sum.exercises || []).length > 0 && (
                  <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {sum.exercises.map(exItem => (
                      <div key={exItem.id} className="row between" style={{ fontSize: 12.5 }}>
                        <div className="row" style={{ gap: 8, minWidth: 0 }}>
                          <span
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: 6,
                              background: 'var(--surface)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 11,
                              fontWeight: 700,
                              color: 'var(--acc)',
                              flex: 'none'
                            }}
                          >
                            {exItem.setCount}×
                          </span>
                          <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'capitalize' }}>
                            {exItem.name}
                          </span>
                        </div>
                        <span className="dim" style={{ fontSize: 12, fontWeight: 600, flex: 'none' }}>
                          {exItem.bestWeight > 0 ? `${fmtNum(exItem.bestWeight)} ${sum.unit || S.unit} × ${exItem.bestReps}` : `${exItem.bestReps} reps`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reaction / Kudos Footer */}
                <div className="row between" style={{ padding: '8px 14px 12px', borderTop: '1px solid var(--border-hairline)' }}>
                  <button
                    type="button"
                    className="chip"
                    onClick={() => handleToggleKudos(post.id)}
                    style={{ fontSize: 12, fontWeight: 700, padding: '5px 12px', background: 'var(--surface)' }}
                  >
                    🔥 {post.kudos || 1} {t('Pump Kudos')}
                  </button>
                  <span className="dim small" style={{ fontSize: 11 }}>
                    <Icon name="checkCircle" size={12} style={{ color: 'var(--acc)', marginRight: 4 }} />
                    {t('Synced with Profile')}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
