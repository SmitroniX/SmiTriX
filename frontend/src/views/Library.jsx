import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { EXDB, BODYPARTS, allExercises, equipmentOf, matchExercise, scoreExercise, usageMap, QUICK_EQ_PRESETS, matchesMuscleGroup } from '../lib/exercises.js'
import { activeProfile, exAvailable } from '../lib/equipment.js'
import { bestWeightFor } from '../lib/history.js'
import { fmtNum } from '../lib/format.js'
import { t, exerciseNameFor } from '../lib/i18n.js'
import { Thumb } from '../components/Media.jsx'
import { exerciseDetailSheet, addToRoutineSheet, customExSheet } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'
import { tappable, useRevealActiveChip } from '../lib/use-sheet-keyboard.js'
import { isFav, sortFavouritesFirst } from '../lib/favourites.js'

export default function Library() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const usage = usageMap(S)
  const [q, setQ] = useState('')
  const [bp, setBp] = useState('')           // '' = all, '★' = chosen, '☆' = favourites, or muscle group
  const [eqQuick, setEqQuick] = useState('') // '' = all gear, 'machine', 'cable', 'dumbbell', etc.
  const [eq, setEq] = useState('')           // specific raw equipment if selected
  const [showAll, setShowAll] = useState(false)   // ignore the active equipment profile for this session
  const [shown, setShown] = useState(40)
  const searchRef = useRef(null)
  const bpStrip = useRef(null), eqStrip = useRef(null)
  const profile = activeProfile(S)

  const inScope = e => {
    if (bp === '★') return !!usage[e.id]
    if (bp === '☆') return isFav(S, e.id)
    return matchesMuscleGroup(e, bp)
  }

  const matchesEquipment = e => {
    if (eqQuick) {
      const preset = QUICK_EQ_PRESETS.find(p => p.id === eqQuick)
      if (preset?.match && !preset.match(e.eq)) return false
    }
    if (eq && e.eq !== eq) return false
    return true
  }

  const base = allExercises(S).filter(e => inScope(e) && matchesEquipment(e) && matchExercise(e, q))
  const eqFiltered = (profile && !showAll) ? base.filter(e => exAvailable(S, e)) : base
  const eqOpts = equipmentOf(eqFiltered)
  // Drop the equipment filter if the search narrowed it away, so you never hit a dead end.
  const eqOn = eqOpts.includes(eq) ? eq : ''

  // Favourites float to the top; when searching, sort by smart relevance score
  const f = q ? [...(eqOn ? eqFiltered.filter(e => e.eq === eqOn) : eqFiltered)].sort((a, b) => {
    const sB = scoreExercise(b, q, usage, isFav(S, b.id))
    const sA = scoreExercise(a, q, usage, isFav(S, a.id))
    return sB - sA || (usage[b.id] || 0) - (usage[a.id] || 0) || exerciseNameFor(a).localeCompare(exerciseNameFor(b))
  }) : sortFavouritesFirst(eqOn ? eqFiltered.filter(e => e.eq === eqOn) : eqFiltered, S)

  const favCount = (S.favEx || []).length
  useRevealActiveChip(bpStrip, bp)
  useRevealActiveChip(eqStrip, eqOn)

  return <>
    <div className="hdr"><div><h1>{t('Exercises')}</h1><div className="sub">{t('{0} exercises with animations', EXDB.length)}</div></div>
      <Button size="sm" variant="tinted" icon="target" onClick={() => nav('/muscles')}>{t('By muscle')}</Button>
    </div>

    {/* Search field with instant one-tap clear button */}
    <div className="search" style={{ position: 'relative', marginBottom: 10 }}>
      <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
      <input
        ref={searchRef}
        className="input"
        placeholder={t('Search machine, exercise, muscle…')}
        value={q}
        onChange={e => { setQ(e.target.value); setShown(40) }}
      />
      {q && (
        <button
          type="button"
          className="iconbtn"
          style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', padding: 4, width: 28, height: 28 }}
          aria-label={t('Clear search')}
          onClick={() => { setQ(''); searchRef.current?.focus() }}
        >
          <Icon name="xmark" style={{ fontSize: 13 }} />
        </button>
      )}
    </div>

    {profile && <div className="small dim row" style={{ margin: '-4px 2px 10px', gap: 6, alignItems: 'center' }}>
      <Icon name="dumbbell" style={{ fontSize: 13 }} />
      {showAll ? t('Showing all equipment') : t('Showing what you have in "{0}"', profile.name)}
      <button className="chip nocap" style={{ marginLeft: 'auto', padding: '3px 10px', fontSize: 12 }} onClick={() => setShowAll(v => !v)}>
        {showAll ? t('Filter by "{0}"', profile.name) : t('Show all equipment')}
      </button>
    </div>}

    {/* Quick Equipment Presets (Machine, Cable, Dumbbell, Barbell, Bodyweight) */}
    <div className="chips" style={{ margin: '4px 0 6px', display: 'flex', gap: 6, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      {QUICK_EQ_PRESETS.map(p => (
        <button
          key={p.id}
          type="button"
          className={'chip nocap' + (eqQuick === p.id ? ' on' : '')}
          onClick={() => { setEqQuick(p.id); setEq(''); setShown(40) }}
        >
          {p.id === 'machine' && <Icon name="gear" style={{ fontSize: 11, marginRight: 4 }} />}
          {p.id === 'cable' && <Icon name="link" style={{ fontSize: 11, marginRight: 4 }} />}
          {p.id === 'dumbbell' && <Icon name="dumbbell" style={{ fontSize: 11, marginRight: 4 }} />}
          {t(p.label)}
        </button>
      ))}
    </div>

    {/* Quick Muscle Groups (Chest, Back, Legs, Shoulders, Arms, Core) */}
    <div className="chips" ref={bpStrip} style={{ margin: '4px 0 8px', display: 'flex', gap: 6, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      {favCount > 0 && <button type="button" className={'chip' + (bp === '☆' ? ' on' : '')} onClick={() => { setBp(b => b === '☆' ? '' : '☆'); setShown(40) }}><Icon name="starFill" className="fav-star" />{t('Favourites')} ({favCount})</button>}
      <button type="button" className={'chip nocap' + (!bp ? ' on' : '')} onClick={() => { setBp(''); setEq(''); setShown(40) }}>{t('All')}</button>
      <button type="button" className={'chip' + (bp === 'chest' ? ' on' : '')} onClick={() => { setBp(b => b === 'chest' ? '' : 'chest'); setEq(''); setShown(40) }}>{t('chest')}</button>
      <button type="button" className={'chip' + (bp === 'back' ? ' on' : '')} onClick={() => { setBp(b => b === 'back' ? '' : 'back'); setEq(''); setShown(40) }}>{t('back')}</button>
      <button type="button" className={'chip' + (bp === 'legs' ? ' on' : '')} onClick={() => { setBp(b => b === 'legs' ? '' : 'legs'); setEq(''); setShown(40) }}>{t('legs')}</button>
      <button type="button" className={'chip' + (bp === 'shoulders' ? ' on' : '')} onClick={() => { setBp(b => b === 'shoulders' ? '' : 'shoulders'); setEq(''); setShown(40) }}>{t('shoulders')}</button>
      <button type="button" className={'chip' + (bp === 'arms' ? ' on' : '')} onClick={() => { setBp(b => b === 'arms' ? '' : 'arms'); setEq(''); setShown(40) }}>{t('arms')}</button>
      <button type="button" className={'chip' + (bp === 'core' ? ' on' : '')} onClick={() => { setBp(b => b === 'core' ? '' : 'core'); setEq(''); setShown(40) }}>{t('core')}</button>
      {BODYPARTS.filter(b => !['chest', 'back', 'upper legs', 'lower legs', 'shoulders', 'upper arms', 'lower arms', 'waist'].includes(b)).map(b => (
        <button key={b} type="button" className={'chip' + (bp === b ? ' on' : '')} onClick={() => { setBp(b => b === b ? '' : b); setShown(40) }}>{t(b)}</button>
      ))}
    </div>

    {/* Specific Equipment sub-strip if narrowing further without a quick preset */}
    {eqOpts.length > 1 && !eqQuick && <div className="chips" ref={eqStrip} style={{ marginBottom: 12 }}>
      <button type="button" className={'chip nocap' + (!eqOn ? ' on' : '')} onClick={() => { setEq(''); setShown(40) }}>{t('Any equipment')}</button>
      {eqOpts.map(x => <button key={x} type="button" className={'chip' + (eqOn === x ? ' on' : '')} onClick={() => { setEq(x); setShown(40) }}>{t(x)}</button>)}
    </div>}

    <div className="list">
      <div className="item" {...tappable(() => customExSheet(null, ex => exerciseDetailSheet(ex), q.trim()))}>
        <div className="thumb thumb-x"><Icon name="sparkles" /></div>
        <div className="grow"><div className="tt">{t('Create your own exercise')}</div><div className="ss">{t('name + body part, no animation')}</div></div><Icon name="plus" className="chev" />
      </div>
      {f.slice(0, shown).map(e => {
        const best = bestWeightFor(S, e.id)
        const isMachine = (e.eq || '').includes('machine') || e.eq === 'assisted'
        const isCable = e.eq === 'cable'
        return <div key={e.id} className="item" {...tappable(() => exerciseDetailSheet(e))}>
          <Thumb ex={e} />
          <div className="grow">
            <div className="tt capitalize">{isFav(S, e.id) && <Icon name="starFill" className="fav-star" />}{exerciseNameFor(e)}</div>
            <div className="ss capitalize row" style={{ gap: 5, alignItems: 'center', marginTop: 2 }}>
              <span>{t(e.tg || e.bp)}</span>
              <span style={{ opacity: 0.35 }}>•</span>
              <span style={{
                fontWeight: isMachine || isCable ? 600 : 400,
                color: isMachine ? 'var(--teal)' : isCable ? 'var(--blue)' : 'inherit'
              }}>
                {isMachine && '⚙️ '}{isCable && '🔗 '}{t(e.eq)}
              </span>
            </div>
          </div>
          {best > 0 && <span className="tag acc">{fmtNum(best)}</span>}
          <Button size="sm" variant="tinted" icon="plus" onClick={ev => { ev.stopPropagation(); addToRoutineSheet(e) }}>{t('Plan')}</Button>
        </div>
      })}
      {f.length === 0 && <div className="empty"><div className="ico"><Icon name="magnifier" /></div>{t('No match')}</div>}
    </div>
    {f.length > shown && <><div style={{ height: 10 }} /><Button onClick={() => setShown(s => s + 40)}>{t('Show more')}</Button></>}
  </>
}
