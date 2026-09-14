import { useMemo, useRef, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { BODYPARTS, allExercises, equipmentOf, matchExercise, scoreExercise, usageMap, QUICK_EQ_PRESETS } from '../lib/exercises.js'
import { activeProfile, exAvailable } from '../lib/equipment.js'
import { bestWeightFor } from '../lib/history.js'
import { fmtNum } from '../lib/format.js'
import { MUSCLES, MUSCLE_NAME, musclesOf } from '../lib/muscles.js'
import { t, exerciseNameFor } from '../lib/i18n.js'
import BodyMap from './BodyMap.jsx'
import { Thumb } from './Media.jsx'
import Icon from './Icon.jsx'
import { Button } from './ui.jsx'
import { tappable } from '../lib/use-sheet-keyboard.js'
import { isFav, sortFavouritesFirst } from '../lib/favourites.js'

// One explorer for the Library and every catalogue picker. Supplying `onPick` turns
// a result into a selection; without it the explorer behaves like the normal Library.
export default function MuscleExplorer({ onPick, onDetail, onPlan }) {
  const S = useStore(s => s.S)
  const usage = usageMap(S)
  const [selected, setSelected] = useState(null)
  const [q, setQ] = useState('')
  const [bp, setBp] = useState('')
  const [eqQuick, setEqQuick] = useState('')
  const [eq, setEq] = useState('')
  const [shown, setShown] = useState(40)
  const [showAll, setShowAll] = useState(false)   // ignore the active equipment profile for this session
  const searchRef = useRef(null)

  // Same rule as the Library and the picker: the active equipment profile narrows the catalogue
  // (and the per-muscle counts) unless the user asks for everything.
  const profile = activeProfile(S)
  const catalog = useMemo(() => {
    const all = allExercises(S)
    return (profile && !showAll) ? all.filter(e => exAvailable(S, e)) : all
  }, [S.customEx, S.equipFilterOn, S.activeEquipId, S.equipProfiles, showAll])

  const counts = useMemo(() => Object.fromEntries(MUSCLES.map(m => [m,
    catalog.filter(e => musclesOf(e)[m]).length
  ])), [catalog])

  const pick = muscle => { setSelected(muscle === selected ? null : muscle); setEq(''); setEqQuick(''); setShown(40) }
  const targeted = selected ? catalog.filter(e => musclesOf(e)[selected]) : []

  const matchesEquipment = e => {
    if (eqQuick) {
      const preset = QUICK_EQ_PRESETS.find(p => p.id === eqQuick)
      if (preset?.match && !preset.match(e.eq)) return false
    }
    if (eq && e.eq !== eq) return false
    return true
  }

  const base = targeted.filter(e => (!bp || e.bp === bp) && matchesEquipment(e) && matchExercise(e, q))
  const eqOpts = equipmentOf(base)
  const eqOn = eqOpts.includes(eq) ? eq : ''

  // Favourites float to the top; when searching, sort by smart relevance score
  const exercises = q ? [...(eqOn ? base.filter(e => e.eq === eqOn) : base)].sort((a, b) => {
    const sB = scoreExercise(b, q, usage, isFav(S, b.id))
    const sA = scoreExercise(a, q, usage, isFav(S, a.id))
    return sB - sA || (usage[b.id] || 0) - (usage[a.id] || 0) || exerciseNameFor(a).localeCompare(exerciseNameFor(b))
  }) : sortFavouritesFirst(eqOn ? base.filter(e => e.eq === eqOn) : base, S)

  const choose = ex => onPick ? onPick(ex) : onDetail(ex)

  return <>
    {profile && <div className="small dim row" style={{ margin: '-4px 2px 10px', gap: 6, alignItems: 'center' }}>
      <Icon name="dumbbell" style={{ fontSize: 13 }} />
      {showAll ? t('Showing all equipment') : t('Showing what you have in "{0}"', profile.name)}
      <button className="chip nocap" style={{ marginLeft: 'auto', padding: '3px 10px', fontSize: 12 }} onClick={() => { setShowAll(v => !v); setEq(''); setShown(40) }}>
        {showAll ? t('Filter by "{0}"', profile.name) : t('Show all equipment')}
      </button>
    </div>}
    <div className="card">
      <BodyMap className="tappable" body={S.body} selected={selected} onMuscle={pick} />
      <div className="chips" style={{ marginTop: 10 }}>
        {MUSCLES.map(m => <button key={m} className={'chip' + (selected === m ? ' on' : '')}
          aria-pressed={selected === m} onClick={() => pick(m)}>
          {t(MUSCLE_NAME[m])} <span className="dim">{counts[m]}</span>
        </button>)}
      </div>
    </div>

    {!selected && onPick && <div className="empty"><div className="ico"><Icon name="target" /></div>{t('Choose a muscle to see exercises that train it.')}</div>}

    {selected && <>
      <div className="row between" style={{ margin: '2px 0 10px' }}>
        <h4 className="sec" style={{ margin: 0 }}>{t('Exercises for {0}', t(MUSCLE_NAME[selected]))}</h4>
        <Button size="sm" variant="ghost" onClick={() => pick(selected)}>{t('Clear selection')}</Button>
      </div>

      {/* Search field with instant one-tap clear button */}
      <div className="search" style={{ position: 'relative', marginBottom: 10 }}>
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
        <input
          ref={searchRef}
          className="input"
          placeholder={t('Search…')}
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

      {/* Quick Equipment Presets (Machine, Cable, Dumbbell, Barbell, Bodyweight) */}
      <div className="chips" style={{ margin: '4px 0 8px', display: 'flex', gap: 6, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
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

      {eqOpts.length > 1 && !eqQuick && <div className="chips" style={{ marginBottom: 12 }}>
        <button className={'chip nocap' + (!eqOn ? ' on' : '')} onClick={() => { setEq(''); setShown(40) }}>{t('Any equipment')}</button>
        {eqOpts.map(x => <button key={x} className={'chip' + (eqOn === x ? ' on' : '')} onClick={() => { setEq(x); setShown(40) }}>{t(x)}</button>)}
      </div>}

      <div className="list">
        {exercises.slice(0, shown).map(e => {
          const best = bestWeightFor(S, e.id)
          const primary = musclesOf(e)[selected] === 1
          const isMachine = (e.eq || '').includes('machine') || e.eq === 'assisted'
          const isCable = e.eq === 'cable'
          return <div key={e.id} className="item" {...tappable(() => choose(e))}>
            <Thumb ex={e} />
            <div className="grow">
              <div className="tt capitalize">{isFav(S, e.id) && <Icon name="starFill" className="fav-star" />}{exerciseNameFor(e)}</div>
              <div className="ss">
                {t(primary ? 'Primary target' : 'Also trains')} · <span className="capitalize">{t(e.tg || e.bp)}</span> · <span style={{
                  fontWeight: isMachine || isCable ? 600 : 400,
                  color: isMachine ? 'var(--teal)' : isCable ? 'var(--blue)' : 'inherit'
                }}>
                  {isMachine && '⚙️ '}{isCable && '🔗 '}{t(e.eq)}
                </span>
              </div>
            </div>
            {onPick ? <Icon name="plus" className="chev" /> : <>
              {best > 0 && <span className="tag acc">{fmtNum(best)}</span>}
              <Button size="sm" variant="tinted" icon="plus" onClick={ev => { ev.stopPropagation(); onPlan(e) }}>{t('Plan')}</Button>
            </>}
          </div>
        })}
        {exercises.length === 0 && <div className="empty"><div className="ico"><Icon name="magnifier" /></div>{t('No match')}</div>}
      </div>
      {exercises.length > shown && <><div style={{ height: 10 }} /><Button onClick={() => setShown(s => s + 40)}>{t('Show more')}</Button></>}
    </>}
  </>
}
