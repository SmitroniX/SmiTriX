import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import Icon from '../components/Icon.jsx'
import { CollapsedHeader, Rise } from '../components/GymManeMotion.jsx'
import { confirmSheet, exerciseDetailSheet } from '../sheets.jsx'
import { allExercises, exOr, matchExercise } from '../lib/exercises.js'
import { fmtDate, todayISO, uid } from '../lib/format.js'
import { exerciseNameFor, t } from '../lib/i18n.js'

const TAGS = [
  { id: 'training', label: 'Training', color: '#D9A184' },
  { id: 'pr', label: 'PR & Form', color: '#E0B15A' },
  { id: 'pain', label: 'Pain / Recovery', color: '#D97B72' },
  { id: 'nutrition', label: 'Nutrition', color: '#8FA377' },
  { id: 'mindset', label: 'Mindset', color: '#7FA8C9' },
]

function compressNotePhoto(file, maxDim = 900) {
  return new Promise((resolve, reject) => {
    const rd = new FileReader()
    rd.onerror = () => reject(new Error('Could not read photo'))
    rd.onload = ev => {
      const img = new Image()
      img.onerror = () => reject(new Error('Invalid photo'))
      img.onload = () => {
        let w = img.width || 600
        let h = img.height || 600
        if (w > maxDim || h > maxDim) {
          if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim }
          else { w = Math.round((w * maxDim) / h); h = maxDim }
        }
        const c = document.createElement('canvas')
        c.width = w
        c.height = h
        c.getContext('2d').drawImage(img, 0, 0, w, h)
        resolve(c.toDataURL('image/jpeg', 0.8))
      }
      img.src = ev.target.result
    }
    rd.readAsDataURL(file)
  })
}

function NoteEditorSheet({ existing, defaultDate, close }) {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const toast = useUI(s => s.toast)

  const [title, setTitle] = useState(existing?.title || '')
  const [body, setBody] = useState(existing?.body || '')
  const [date, setDate] = useState(existing?.d || defaultDate || todayISO())
  const [tag, setTag] = useState(existing?.tag || 'training')
  const [folderId, setFolderId] = useState(existing?.folderId || '')
  const [exId, setExId] = useState(existing?.exId || '')
  const [exQuery, setExQuery] = useState('')
  const [photo, setPhoto] = useState(existing?.photo || '')
  const fileRef = useRef(null)

  const folders = S.noteFolders || []
  const linkedEx = exId ? exOr(exId) : null
  const exSuggestions = useMemo(() => {
    const q = exQuery.trim()
    if (!q) return []
    return allExercises().filter(e => matchExercise(e, q)).slice(0, 6)
  }, [exQuery])

  const onPhoto = async e => {
    const f = e.target.files?.[0]
    if (!f) return
    try {
      const url = await compressNotePhoto(f)
      setPhoto(url)
    } catch {
      toast(t('Could not read photo'))
    } finally {
      e.target.value = ''
    }
  }

  const save = () => {
    if (!title.trim() && !body.trim()) {
      toast(t('Write a title or note first'))
      return
    }
    const item = {
      id: existing?.id || uid(),
      title: title.trim() || t('Untitled note'),
      body: body.trim(),
      d: date || todayISO(),
      tag,
      folderId: folderId || null,
      exId: exId || null,
      photo: photo || null,
      updatedAt: Date.now(),
      createdAt: existing?.createdAt || Date.now(),
    }
    update(s => {
      s.notes = s.notes || []
      const idx = s.notes.findIndex(n => n.id === item.id)
      if (idx >= 0) s.notes[idx] = item
      else s.notes.unshift(item)
    })
    toast(existing ? t('Note updated') : t('Note saved'))
    close()
  }

  const remove = () => {
    confirmSheet({
      title: t('Delete note?'),
      message: t('This journal entry will be permanently removed.'),
      confirmText: t('Delete'),
      danger: true,
      onConfirm: () => {
        update(s => {
          s.notes = (s.notes || []).filter(n => n.id !== existing.id)
        })
        toast(t('Note deleted'))
        close()
      },
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="row between">
        <h3 style={{ margin: 0 }}>{existing ? t('Edit note') : t('New journal note')}</h3>
        {existing && (
          <button type="button" className="iconbtn" style={{ color: 'var(--red)' }} onClick={remove} aria-label={t('Delete')}>
            <Icon name="trash" />
          </button>
        )}
      </div>

      <input
        className="input"
        placeholder={t('Title (e.g. Bench cues, knee check...)')}
        value={title}
        onChange={e => setTitle(e.target.value)}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
        <select className="input" value={folderId} onChange={e => setFolderId(e.target.value)}>
          <option value="">{t('No folder')}</option>
          {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </div>

      <div className="chips">
        {TAGS.map(tg => (
          <button
            key={tg.id}
            type="button"
            className={'chip' + (tag === tg.id ? ' on' : '')}
            onClick={() => setTag(tg.id)}
          >
            {t(tg.label)}
          </button>
        ))}
      </div>

      <textarea
        className="input"
        rows={5}
        placeholder={t('Write form cues, how the session felt, energy, recovery notes...')}
        value={body}
        onChange={e => setBody(e.target.value)}
        style={{ resize: 'vertical', minHeight: 110, lineHeight: 1.5 }}
      />

      {/* Exercise link */}
      <div>
        <div className="gm-micro" style={{ fontSize: 10, marginBottom: 6 }}>{t('LINK EXERCISE (OPTIONAL)')}</div>
        {linkedEx ? (
          <div className="row between" style={{ background: 'var(--surface-2)', borderRadius: 12, padding: '8px 12px' }}>
            <span style={{ fontWeight: 700, fontSize: 13, textTransform: 'capitalize' }}>{exerciseNameFor(linkedEx)}</span>
            <button type="button" className="iconbtn" style={{ width: 28, height: 28 }} onClick={() => setExId('')}>
              <Icon name="xmark" style={{ fontSize: 12 }} />
            </button>
          </div>
        ) : (
          <>
            <input
              className="input"
              placeholder={t('Search exercise to link...')}
              value={exQuery}
              onChange={e => setExQuery(e.target.value)}
            />
            {exSuggestions.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {exSuggestions.map(ex => (
                  <button
                    key={ex.id}
                    type="button"
                    className="chip"
                    onClick={() => { setExId(ex.id); setExQuery('') }}
                  >
                    {exerciseNameFor(ex)}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Photo attachment */}
      <div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onPhoto} />
        {photo ? (
          <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', border: '1px solid var(--sep-op)' }}>
            <img src={photo} alt="" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }} />
            <button
              type="button"
              onClick={() => setPhoto('')}
              style={{
                position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: '50%',
                background: 'rgba(0,0,0,0.65)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Icon name="xmark" style={{ fontSize: 13 }} />
            </button>
          </div>
        ) : (
          <button type="button" className="btn ghost" onClick={() => fileRef.current?.click()}>
            <Icon name="camera" /> {t('Attach photo')}
          </button>
        )}
      </div>

      <button type="button" className="btn primary" onClick={save}>
        {existing ? t('Save changes') : t('Save note')}
      </button>
    </div>
  )
}

export default function Journal() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const openSheet = useUI(s => s.openSheet)
  const toast = useUI(s => s.toast)

  const [view, setView] = useState('notes') // 'notes' | 'calendar'
  const [query, setQuery] = useState('')
  const [tagFilter, setTagFilter] = useState('all')
  const [folderFilter, setFolderFilter] = useState('all')
  const [selectedDay, setSelectedDay] = useState('')

  const now = new Date()
  const [calYear, setCalYear] = useState(now.getFullYear())
  const [calMonth, setCalMonth] = useState(now.getMonth())

  const notes = S.notes || []
  const folders = S.noteFolders || []
  const workoutDays = useMemo(() => new Set((S.workouts || []).map(w => w.d).filter(Boolean)), [S.workouts])
  const noteDays = useMemo(() => new Set(notes.map(n => n.d).filter(Boolean)), [notes])

  const openEditor = (existing = null, defaultDate = '') => {
    openSheet(close => <NoteEditorSheet existing={existing} defaultDate={defaultDate} close={close} />)
  }

  const addFolder = () => {
    openSheet(close => {
      const FolderCreator = () => {
        const [name, setName] = useState('')
        const create = () => {
          const clean = name.trim()
          if (!clean) return
          update(s => {
            s.noteFolders = [...(s.noteFolders || []), { id: uid(), name: clean }]
          })
          toast(t('Folder created'))
          close()
        }
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ margin: 0 }}>{t('New journal folder')}</h3>
            <input className="input" placeholder={t('e.g. Rehab, Form Cues, Meet Prep')} value={name} onChange={e => setName(e.target.value)} autoFocus />
            <button type="button" className="btn primary" onClick={create}>{t('Create folder')}</button>
          </div>
        )
      }
      return <FolderCreator />
    })
  }

  const filteredNotes = useMemo(() => {
    const q = query.trim().toLowerCase()
    return notes
      .filter(n => {
        if (tagFilter !== 'all' && n.tag !== tagFilter) return false
        if (folderFilter !== 'all' && (n.folderId || '') !== folderFilter) return false
        if (view === 'calendar' && selectedDay && n.d !== selectedDay) return false
        if (q) {
          const ex = n.exId ? exOr(n.exId) : null
          const hay = `${n.title || ''} ${n.body || ''} ${ex ? exerciseNameFor(ex) : ''}`.toLowerCase()
          if (!hay.includes(q)) return false
        }
        return true
      })
      .sort((a, b) => String(b.d || '').localeCompare(String(a.d || '')) || (b.updatedAt || 0) - (a.updatedAt || 0))
  }, [notes, tagFilter, folderFilter, view, selectedDay, query])

  const calCells = useMemo(() => {
    const first = new Date(calYear, calMonth, 1)
    const startPad = (first.getDay() + 6) % 7 // Monday first
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
    const cells = []
    for (let i = 0; i < startPad; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      cells.push({ d, iso })
    }
    return cells
  }, [calYear, calMonth])

  const monthLabel = new Date(calYear, calMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="narrow" style={{ paddingBottom: 40 }}>
      <CollapsedHeader title={t('Journal')} />

      <div className="hdr" style={{ gap: 10 }}>
        <button type="button" className="iconbtn" onClick={() => nav(-1)} aria-label={t('Back')}>
          <Icon name="chevronLeft" />
        </button>
        <div style={{ flex: 1 }}>
          <h1>{t('Journal')}</h1>
          <div className="sub">{notes.length} {notes.length === 1 ? t('entry') : t('entries')}</div>
        </div>
        <button type="button" className="btn primary" style={{ width: 'auto', padding: '9px 14px', fontSize: 13 }} onClick={() => openEditor(null, selectedDay || todayISO())}>
          <Icon name="plus" style={{ fontSize: 13 }} /> {t('Note')}
        </button>
      </div>

      {/* View switcher */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button
          type="button"
          className={'chip' + (view === 'notes' ? ' on' : '')}
          style={{ flex: 1, justifyContent: 'center' }}
          onClick={() => { setView('notes'); setSelectedDay('') }}
        >
          <Icon name="notebook" style={{ fontSize: 14 }} /> {t('All Notes')}
        </button>
        <button
          type="button"
          className={'chip' + (view === 'calendar' ? ' on' : '')}
          style={{ flex: 1, justifyContent: 'center' }}
          onClick={() => setView('calendar')}
        >
          <Icon name="calendar" style={{ fontSize: 14 }} /> {t('Calendar')}
        </button>
      </div>

      {view === 'calendar' && (
        <Rise index={0} className="card" style={{ marginBottom: 16 }}>
          <div className="row between" style={{ marginBottom: 12 }}>
            <button
              type="button"
              className="iconbtn"
              onClick={() => {
                if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) }
                else setCalMonth(m => m - 1)
              }}
            >
              <Icon name="chevronLeft" />
            </button>
            <div style={{ fontWeight: 800, fontSize: 15 }}>{monthLabel}</div>
            <button
              type="button"
              className="iconbtn"
              onClick={() => {
                if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) }
                else setCalMonth(m => m + 1)
              }}
            >
              <Icon name="chevronRight" />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center', marginBottom: 6 }}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((l, i) => (
              <div key={i} className="gm-micro" style={{ fontSize: 10 }}>{l}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5 }}>
            {calCells.map((cell, idx) => {
              if (!cell) return <div key={'e' + idx} />
              const hasNote = noteDays.has(cell.iso)
              const hasWo = workoutDays.has(cell.iso)
              const isSel = selectedDay === cell.iso
              const isToday = cell.iso === todayISO()
              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => setSelectedDay(prev => (prev === cell.iso ? '' : cell.iso))}
                  style={{
                    height: 40,
                    borderRadius: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 3,
                    background: isSel ? 'var(--acc)' : isToday ? 'var(--surface-2)' : 'transparent',
                    color: isSel ? 'var(--acc-ink)' : 'var(--label)',
                    border: isToday && !isSel ? '1px solid var(--acc)' : '1px solid transparent',
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  <span>{cell.d}</span>
                  <span style={{ display: 'flex', gap: 3, height: 5 }}>
                    {hasNote && <span style={{ width: 5, height: 5, borderRadius: '50%', background: isSel ? 'var(--acc-ink)' : 'var(--acc)' }} />}
                    {hasWo && <span style={{ width: 5, height: 5, borderRadius: '50%', background: isSel ? 'var(--acc-ink)' : 'var(--gm-sage)' }} />}
                  </span>
                </button>
              )
            })}
          </div>
          {selectedDay && (
            <div className="row between" style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--sep-op)' }}>
              <span className="small" style={{ fontWeight: 700 }}>{fmtDate(selectedDay, true)}</span>
              <button type="button" className="chip on" onClick={() => openEditor(null, selectedDay)}>
                + {t('Add note for day')}
              </button>
            </div>
          )}
        </Rise>
      )}

      {/* Search & Folders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        <input
          className="input"
          placeholder={t('Search journal notes...')}
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <div className="chips">
          <button type="button" className={'chip' + (folderFilter === 'all' ? ' on' : '')} onClick={() => setFolderFilter('all')}>
            {t('All folders')}
          </button>
          {folders.map(f => (
            <button
              key={f.id}
              type="button"
              className={'chip' + (folderFilter === f.id ? ' on' : '')}
              onClick={() => setFolderFilter(f.id)}
            >
              {f.name}
            </button>
          ))}
          <button type="button" className="chip" onClick={addFolder}>
            <Icon name="plus" style={{ fontSize: 11 }} /> {t('Folder')}
          </button>
        </div>
        <div className="chips">
          <button type="button" className={'chip' + (tagFilter === 'all' ? ' on' : '')} onClick={() => setTagFilter('all')}>
            {t('All tags')}
          </button>
          {TAGS.map(tg => (
            <button
              key={tg.id}
              type="button"
              className={'chip' + (tagFilter === tg.id ? ' on' : '')}
              onClick={() => setTagFilter(tg.id)}
            >
              {t(tg.label)}
            </button>
          ))}
        </div>
      </div>

      {/* Notes list */}
      {filteredNotes.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '32px 18px' }}>
          <Icon name="notebook" style={{ fontSize: 32, color: 'var(--label-3)', marginBottom: 10 }} />
          <div style={{ fontWeight: 800, fontSize: 16 }}>{t('No notes yet')}</div>
          <div className="dim small" style={{ marginTop: 4, marginBottom: 16 }}>
            {t('Capture form cues, pain checks, PR thoughts, and session reflections.')}
          </div>
          <button type="button" className="btn primary" style={{ width: 'auto', padding: '10px 20px' }} onClick={() => openEditor(null, selectedDay || todayISO())}>
            {t('Write first note')}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredNotes.map((note, idx) => {
            const tagObj = TAGS.find(x => x.id === note.tag) || TAGS[0]
            const folder = folders.find(f => f.id === note.folderId)
            const linked = note.exId ? exOr(note.exId) : null
            return (
              <Rise key={note.id} index={idx}>
                <div className="card" onClick={() => openEditor(note)} style={{ cursor: 'pointer', margin: 0 }}>
                  <div className="row between" style={{ marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 800,
                          padding: '3px 9px',
                          borderRadius: 999,
                          background: `color-mix(in srgb, ${tagObj.color} 20%, var(--surface-2))`,
                          color: tagObj.color,
                        }}
                      >
                        {t(tagObj.label)}
                      </span>
                      {folder && (
                        <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: 'var(--surface-2)', color: 'var(--label-2)' }}>
                          {folder.name}
                        </span>
                      )}
                    </div>
                    <span className="dim small">{fmtDate(note.d, true)}</span>
                  </div>

                  <div style={{ fontSize: 16, fontWeight: 800, marginBottom: note.body ? 5 : 0 }}>{note.title}</div>
                  {note.body && (
                    <div style={{ fontSize: 13.5, color: 'var(--label-2)', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                      {note.body.length > 220 ? note.body.slice(0, 220) + '…' : note.body}
                    </div>
                  )}

                  {note.photo && (
                    <img
                      src={note.photo}
                      alt=""
                      style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 12, marginTop: 10, display: 'block' }}
                    />
                  )}

                  {linked && (
                    <button
                      type="button"
                      className="chip"
                      style={{ marginTop: 10 }}
                      onClick={e => { e.stopPropagation(); exerciseDetailSheet(linked) }}
                    >
                      <Icon name="dumbbell" style={{ fontSize: 12 }} /> {exerciseNameFor(linked)}
                    </button>
                  )}
                </div>
              </Rise>
            )
          })}
        </div>
      )}
    </div>
  )
}
