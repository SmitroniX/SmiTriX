import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import Icon from '../components/Icon.jsx'
import { CollapsedHeader, Rise, RollingText } from '../components/GymManeMotion.jsx'
import { isoOf, todayISO, uid } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import {
  MEAL_SLOTS,
  FOOD_CATS,
  loadFoodLibrary,
  scaleMacros,
  sumDayMacros,
  buildAiMealPrompt,
  parseAiMealText,
  fastingProgress,
} from '../lib/gymmane-nutrition.js'

const DEFAULT_GOALS = { kcal: 2400, protein: 160, carbs: 260, fat: 75, waterMl: 2500 }

const SUPP_PRESETS = [
  { name: 'Creatine Monohydrate', dose: '5g', stock: 60 },
  { name: 'Omega-3 Fish Oil', dose: '2 caps', stock: 90 },
  { name: 'Vitamin D3 + K2', dose: '2000 IU', stock: 90 },
  { name: 'Magnesium Glycinate', dose: '400mg', stock: 60 },
  { name: 'Electrolytes', dose: '1 scoop', stock: 30 },
]

function fmtHMS(sec) {
  const s = Math.max(0, Math.floor(sec || 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

function FoodImg({ src, size = 40 }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 12,
          background: 'var(--surface-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--acc)',
          flex: 'none',
        }}
      >
        <Icon name="forkKnife" style={{ fontSize: size * 0.45 }} />
      </div>
    )
  }
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        objectFit: 'cover',
        background: 'var(--surface-2)',
        flex: 'none',
      }}
    />
  )
}

function GoalsSheet({ goals, close }) {
  const update = useStore(s => s.update)
  const toast = useUI(s => s.toast)
  const [kcal, setKcal] = useState(goals.kcal)
  const [protein, setProtein] = useState(goals.protein)
  const [carbs, setCarbs] = useState(goals.carbs)
  const [fat, setFat] = useState(goals.fat)
  const [waterMl, setWaterMl] = useState(goals.waterMl)

  const save = () => {
    update(s => {
      s.nutrition = s.nutrition || {}
      s.nutrition.goals = {
        kcal: Math.max(800, Number(kcal) || 2400),
        protein: Math.max(20, Number(protein) || 160),
        carbs: Math.max(0, Number(carbs) || 260),
        fat: Math.max(10, Number(fat) || 75),
        waterMl: Math.max(500, Number(waterMl) || 2500),
      }
    })
    toast(t('Nutrition goals saved'))
    close()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h3 style={{ margin: 0 }}>{t('Daily Nutrition Goals')}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <label className="small muted">
          {t('Calories (kcal)')}
          <input type="number" className="input" style={{ marginTop: 4 }} value={kcal} onChange={e => setKcal(e.target.value)} />
        </label>
        <label className="small muted">
          {t('Water (ml)')}
          <input type="number" className="input" style={{ marginTop: 4 }} value={waterMl} onChange={e => setWaterMl(e.target.value)} />
        </label>
        <label className="small muted">
          {t('Protein (g)')}
          <input type="number" className="input" style={{ marginTop: 4 }} value={protein} onChange={e => setProtein(e.target.value)} />
        </label>
        <label className="small muted">
          {t('Carbs (g)')}
          <input type="number" className="input" style={{ marginTop: 4 }} value={carbs} onChange={e => setCarbs(e.target.value)} />
        </label>
        <label className="small muted">
          {t('Fat (g)')}
          <input type="number" className="input" style={{ marginTop: 4 }} value={fat} onChange={e => setFat(e.target.value)} />
        </label>
      </div>
      <button type="button" className="btn primary" onClick={save}>{t('Save goals')}</button>
    </div>
  )
}

function AiMealSheet({ dayIso, slot, onLogItems, close }) {
  const toast = useUI(s => s.toast)
  const [desc, setDesc] = useState('')
  const [pasted, setPasted] = useState('')
  const parsed = useMemo(() => parseAiMealText(pasted), [pasted])

  const copyPrompt = async () => {
    const prompt = buildAiMealPrompt(desc.trim())
    try {
      await navigator.clipboard?.writeText(prompt)
      toast(t('Prompt copied! Paste into ChatGPT, Claude, or Gemini'))
    } catch {
      toast(t('Copy the prompt text manually'))
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h3 style={{ margin: 0 }}>{t('Offline AI Meal Logger')}</h3>
      <div className="muted small" style={{ lineHeight: 1.45 }}>
        {t('Describe your meal, copy the prompt to any AI chat, then paste the formatted lines back here to log instantly.')}
      </div>
      <input
        className="input"
        placeholder={t('e.g. 2 eggs, 2 slices sourdough toast, avocado & latte')}
        value={desc}
        onChange={e => setDesc(e.target.value)}
      />
      <button type="button" className="btn" onClick={copyPrompt}>
        <Icon name="clipboard" /> {t('1. Copy AI Prompt')}
      </button>
      <textarea
        className="input"
        rows={5}
        placeholder={t('2. Paste AI response lines here...\nFOOD: Chicken Breast | 180g | 297 kcal | P 55.8g | C 0g | F 6.5g')}
        value={pasted}
        onChange={e => setPasted(e.target.value)}
        style={{ fontFamily: 'monospace', fontSize: 12 }}
      />
      {parsed.length > 0 && (
        <div className="card" style={{ margin: 0, padding: 12 }}>
          <div className="gm-micro" style={{ marginBottom: 8 }}>{t('DETECTED ITEMS')} ({parsed.length})</div>
          {parsed.map((it, i) => (
            <div key={i} className="row between" style={{ padding: '4px 0', fontSize: 13 }}>
              <span style={{ fontWeight: 700 }}>{it.name} ({it.grams}g)</span>
              <span style={{ color: 'var(--acc)', fontWeight: 800 }}>{it.kcal} kcal</span>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        className="btn primary"
        disabled={!parsed.length}
        onClick={() => {
          onLogItems(dayIso, slot, parsed)
          toast(t('Logged {0} items', parsed.length))
          close()
        }}
      >
        {parsed.length ? t('Log {0} items to {1}', parsed.length, slot) : t('Paste formatted lines above')}
      </button>
    </div>
  )
}

function FoodPickerSheet({ library, dayIso, slot, close }) {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const toast = useUI(s => s.toast)

  const nut = S.nutrition || {}
  const customFoods = nut.customFoods || []
  const dishes = nut.dishes || []
  const favIds = new Set(nut.favFoods || [])

  const [query, setQuery] = useState('')
  const [cat, setCat] = useState('all')
  const [selected, setSelected] = useState(null)
  const [grams, setGrams] = useState(100)
  const [creatingCustom, setCreatingCustom] = useState(false)
  const [cfName, setCfName] = useState('')
  const [cfKcal, setCfKcal] = useState(200)
  const [cfP, setCfP] = useState(20)
  const [cfC, setCfC] = useState(15)
  const [cfF, setCfF] = useState(6)

  const allFoods = useMemo(() => [...customFoods, ...library], [customFoods, library])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (cat === 'dishes') {
      return dishes.filter(d => !q || d.name.toLowerCase().includes(q))
    }
    return allFoods
      .filter(f => {
        if (cat === 'fav' && !favIds.has(f.id)) return false
        if (cat === 'custom' && !f.custom) return false
        if (cat !== 'all' && cat !== 'fav' && cat !== 'custom' && f.cat !== cat) return false
        if (q && !f.name.toLowerCase().includes(q)) return false
        return true
      })
      .slice(0, 60)
  }, [allFoods, dishes, cat, query, nut.favFoods])

  const toggleFav = id => {
    update(s => {
      s.nutrition = s.nutrition || {}
      const list = s.nutrition.favFoods || []
      s.nutrition.favFoods = list.includes(id) ? list.filter(x => x !== id) : [...list, id]
    })
  }

  const logSelected = () => {
    if (!selected) return
    const m = scaleMacros(selected, grams)
    update(s => {
      s.nutrition = s.nutrition || {}
      s.nutrition.entries = s.nutrition.entries || {}
      const arr = s.nutrition.entries[dayIso] || []
      arr.push({
        id: uid(),
        foodId: selected.id,
        name: selected.name,
        photo: selected.photo || null,
        slot,
        grams: Math.max(1, Number(grams) || 100),
        ...m,
        t: Date.now(),
      })
      s.nutrition.entries[dayIso] = arr
    })
    toast(t('Added {0}', selected.name))
    close()
  }

  const logDish = dish => {
    update(s => {
      s.nutrition = s.nutrition || {}
      s.nutrition.entries = s.nutrition.entries || {}
      const arr = s.nutrition.entries[dayIso] || []
      arr.push({
        id: uid(),
        name: dish.name,
        slot,
        grams: dish.grams || 250,
        kcal: dish.kcal,
        protein: dish.protein,
        carbs: dish.carbs,
        fat: dish.fat,
        fiber: dish.fiber || 0,
        t: Date.now(),
      })
      s.nutrition.entries[dayIso] = arr
    })
    toast(t('Added dish {0}', dish.name))
    close()
  }

  const createCustomFood = () => {
    const clean = cfName.trim()
    if (!clean) { toast(t('Enter a food name')); return }
    const item = {
      id: 'cf_' + uid(),
      name: clean,
      custom: true,
      cat: 'other',
      kcal: Number(cfKcal) || 0,
      protein: Number(cfP) || 0,
      carbs: Number(cfC) || 0,
      fat: Number(cfF) || 0,
      fiber: 0,
      portionGrams: 100,
    }
    update(s => {
      s.nutrition = s.nutrition || {}
      s.nutrition.customFoods = [item, ...(s.nutrition.customFoods || [])]
    })
    setCreatingCustom(false)
    setSelected(item)
    setGrams(100)
    toast(t('Custom food saved'))
  }

  if (creatingCustom) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="row between">
          <h3 style={{ margin: 0 }}>{t('Create Custom Food (per 100g)')}</h3>
          <button type="button" className="iconbtn" onClick={() => setCreatingCustom(false)}><Icon name="xmark" /></button>
        </div>
        <input className="input" placeholder={t('Food name')} value={cfName} onChange={e => setCfName(e.target.value)} autoFocus />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <label className="small muted">{t('kcal / 100g')}<input type="number" className="input" value={cfKcal} onChange={e => setCfKcal(e.target.value)} /></label>
          <label className="small muted">{t('Protein (g)')}<input type="number" className="input" value={cfP} onChange={e => setCfP(e.target.value)} /></label>
          <label className="small muted">{t('Carbs (g)')}<input type="number" className="input" value={cfC} onChange={e => setCfC(e.target.value)} /></label>
          <label className="small muted">{t('Fat (g)')}<input type="number" className="input" value={cfF} onChange={e => setCfF(e.target.value)} /></label>
        </div>
        <button type="button" className="btn primary" onClick={createCustomFood}>{t('Save & Select')}</button>
      </div>
    )
  }

  if (selected) {
    const scaled = scaleMacros(selected, grams)
    const isFav = favIds.has(selected.id)
    const quickGrams = Array.from(new Set([selected.portionGrams || 100, 50, 100, 150, 200, 250])).sort((a, b) => a - b)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="row between">
          <button type="button" className="iconbtn" onClick={() => setSelected(null)}><Icon name="chevronLeft" /></button>
          <div style={{ flex: 1, marginLeft: 8, fontWeight: 800, fontSize: 16 }}>{selected.name}</div>
          <button type="button" className="iconbtn" onClick={() => toggleFav(selected.id)} style={{ color: isFav ? 'var(--gm-brass)' : 'var(--label-3)' }}>
            <Icon name="star" />
          </button>
        </div>

        <div className="row" style={{ gap: 14, alignItems: 'center', background: 'var(--surface-2)', borderRadius: 18, padding: 14 }}>
          <FoodImg src={selected.photo} size={60} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--acc)' }}>{scaled.kcal} kcal</div>
            <div style={{ display: 'flex', gap: 12, fontSize: 13, fontWeight: 800, marginTop: 4 }}>
              <span>P {scaled.protein}g</span>
              <span style={{ color: 'var(--gm-sage)' }}>C {scaled.carbs}g</span>
              <span style={{ color: 'var(--gm-brass)' }}>F {scaled.fat}g</span>
            </div>
          </div>
        </div>

        <div>
          <div className="gm-micro" style={{ fontSize: 10, marginBottom: 6 }}>{t('PORTION AMOUNT')} ({selected.liquid ? 'ml' : 'g'})</div>
          <input
            type="number"
            inputMode="decimal"
            className="input"
            value={grams}
            onChange={e => setGrams(e.target.value)}
            style={{ fontSize: 18, fontWeight: 800, textAlign: 'center' }}
          />
          <div className="chips" style={{ marginTop: 8 }}>
            {quickGrams.map(g => (
              <button key={g} type="button" className={'chip' + (Number(grams) === g ? ' on' : '')} onClick={() => setGrams(g)}>
                {g}{selected.liquid ? 'ml' : 'g'}
              </button>
            ))}
          </div>
        </div>

        <button type="button" className="btn primary" onClick={logSelected}>
          {t('Log to {0}', slot)}
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="row between">
        <h3 style={{ margin: 0 }}>{t('Add to {0}', slot)}</h3>
        <button type="button" className="chip on" onClick={() => setCreatingCustom(true)}>
          <Icon name="plus" style={{ fontSize: 11 }} /> {t('Custom')}
        </button>
      </div>

      <input
        className="input"
        placeholder={t('Search 560+ foods...')}
        value={query}
        onChange={e => setQuery(e.target.value)}
        autoFocus
      />

      <div className="chips" style={{ flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: 4 }}>
        <button type="button" className={'chip' + (cat === 'all' ? ' on' : '')} onClick={() => setCat('all')}>{t('All')}</button>
        <button type="button" className={'chip' + (cat === 'fav' ? ' on' : '')} onClick={() => setCat('fav')}>★ {t('Favs')}</button>
        <button type="button" className={'chip' + (cat === 'dishes' ? ' on' : '')} onClick={() => setCat('dishes')}>{t('Dishes')} ({dishes.length})</button>
        <button type="button" className={'chip' + (cat === 'custom' ? ' on' : '')} onClick={() => setCat('custom')}>{t('Mine')} ({customFoods.length})</button>
        {FOOD_CATS.filter(c => c.id !== 'all').map(c => (
          <button key={c.id} type="button" className={'chip' + (cat === c.id ? ' on' : '')} onClick={() => setCat(c.id)}>
            {t(c.label)}
          </button>
        ))}
      </div>

      <div style={{ maxHeight: 340, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtered.length === 0 ? (
          <div className="dim small" style={{ textAlign: 'center', padding: 24 }}>{t('No matching foods found.')}</div>
        ) : cat === 'dishes' ? (
          filtered.map(d => (
            <button
              key={d.id}
              type="button"
              onClick={() => logDish(d)}
              className="row between"
              style={{
                padding: '10px 12px', borderRadius: 14, background: 'var(--surface-2)',
                border: '1px solid var(--sep-op)', color: 'var(--label)', textAlign: 'left', cursor: 'pointer',
              }}
            >
              <div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>{d.name}</div>
                <div className="dim small">P {d.protein}g · C {d.carbs}g · F {d.fat}g</div>
              </div>
              <div style={{ fontWeight: 900, color: 'var(--acc)', fontSize: 14 }}>{d.kcal} kcal</div>
            </button>
          ))
        ) : (
          filtered.map(food => (
            <button
              key={food.id}
              type="button"
              onClick={() => { setSelected(food); setGrams(food.portionGrams || 100) }}
              className="row between"
              style={{
                padding: '8px 10px', borderRadius: 14, background: 'var(--surface-2)',
                border: '1px solid var(--sep-op)', color: 'var(--label)', textAlign: 'left', cursor: 'pointer', gap: 10,
              }}
            >
              <div className="row" style={{ gap: 10, minWidth: 0, flex: 1 }}>
                <FoodImg src={food.photo} size={38} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {food.name}
                  </div>
                  <div className="dim small" style={{ fontSize: 11 }}>
                    per 100g · P {food.protein}g · C {food.carbs}g · F {food.fat}g
                  </div>
                </div>
              </div>
              <div style={{ fontWeight: 900, color: 'var(--acc)', fontSize: 13.5, flex: 'none' }}>{Math.round(food.kcal)}</div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

export default function Nutrition() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const openSheet = useUI(s => s.openSheet)
  const toast = useUI(s => s.toast)

  const [dayIso, setDayIso] = useState(todayISO())
  const [library, setLibrary] = useState([])
  const [nowMs, setNowMs] = useState(Date.now())

  useEffect(() => {
    loadFoodLibrary().then(setLibrary)
  }, [])

  const nut = S.nutrition || {}
  const goals = { ...DEFAULT_GOALS, ...(nut.goals || {}) }
  const dayEntries = nut.entries?.[dayIso] || []
  const macros = useMemo(() => sumDayMacros(dayEntries), [dayEntries])
  const waterMl = Number(nut.water?.[dayIso]) || 0
  const shakes = Number(nut.shakes?.[dayIso]) || 0
  const supplements = nut.supplements || []
  const suppTakenToday = nut.suppTaken?.[dayIso] || {}
  const mealPrep = nut.mealPrep || []
  const mealPlans = nut.mealPlans || []

  useEffect(() => {
    if (!nut.fasting?.startMs) return
    const iv = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(iv)
  }, [nut.fasting?.startMs])

  const fastInfo = useMemo(() => fastingProgress(nut.fasting, nowMs), [nut.fasting, nowMs])

  // Last 7 days strip
  const weekDays = useMemo(() => {
    const out = []
    const base = new Date(todayISO() + 'T12:00:00')
    for (let i = 6; i >= 0; i--) {
      const d = new Date(base)
      d.setDate(d.getDate() - i)
      const iso = isoOf(d)
      out.push({
        iso,
        dow: d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1),
        num: d.getDate(),
        hasData: (nut.entries?.[iso]?.length || 0) > 0,
      })
    }
    return out
  }, [nut.entries])

  const calPct = Math.min(1, macros.kcal / Math.max(1, goals.kcal))
  const remaining = Math.max(0, goals.kcal - macros.kcal)
  const over = Math.max(0, macros.kcal - goals.kcal)
  const ringR = 54
  const ringC = 2 * Math.PI * ringR

  const adjustWater = delta => {
    update(s => {
      s.nutrition = s.nutrition || {}
      s.nutrition.water = s.nutrition.water || {}
      s.nutrition.water[dayIso] = Math.max(0, (Number(s.nutrition.water[dayIso]) || 0) + delta)
    })
  }

  const addShake = () => {
    update(s => {
      s.nutrition = s.nutrition || {}
      s.nutrition.shakes = s.nutrition.shakes || {}
      s.nutrition.shakes[dayIso] = (Number(s.nutrition.shakes[dayIso]) || 0) + 1
      s.nutrition.entries = s.nutrition.entries || {}
      const arr = s.nutrition.entries[dayIso] || []
      arr.push({
        id: uid(),
        name: t('Protein Shake (1 scoop)'),
        slot: 'snacks',
        grams: 32,
        kcal: 120,
        protein: 25,
        carbs: 3,
        fat: 1.5,
        fiber: 0,
        t: Date.now(),
      })
      s.nutrition.entries[dayIso] = arr
    })
    toast(t('Logged protein shake (+25g P)'))
  }

  const deleteEntry = id => {
    update(s => {
      if (!s.nutrition?.entries?.[dayIso]) return
      s.nutrition.entries[dayIso] = s.nutrition.entries[dayIso].filter(e => e.id !== id)
    })
  }

  const logBatchItems = (iso, slot, items) => {
    update(s => {
      s.nutrition = s.nutrition || {}
      s.nutrition.entries = s.nutrition.entries || {}
      const arr = s.nutrition.entries[iso] || []
      for (const it of items) {
        arr.push({ id: uid(), slot, ...it, t: Date.now() })
      }
      s.nutrition.entries[iso] = arr
    })
  }

  const saveSlotAsDish = slotId => {
    const items = dayEntries.filter(e => e.slot === slotId)
    if (!items.length) return
    const totals = sumDayMacros(items)
    const name = `${slotId[0].toUpperCase() + slotId.slice(1)} (${items.map(i => i.name.split(' ')[0]).slice(0, 2).join(' + ')})`
    update(s => {
      s.nutrition = s.nutrition || {}
      s.nutrition.dishes = [
        { id: uid(), name, grams: items.reduce((sum, i) => sum + (Number(i.grams) || 100), 0), ...totals },
        ...(s.nutrition.dishes || []),
      ]
    })
    toast(t('Saved "{0}" to Dishes', name))
  }

  const toggleSupp = supp => {
    const wasTaken = !!suppTakenToday[supp.id]
    update(s => {
      s.nutrition = s.nutrition || {}
      s.nutrition.suppTaken = s.nutrition.suppTaken || {}
      s.nutrition.suppTaken[dayIso] = { ...(s.nutrition.suppTaken[dayIso] || {}), [supp.id]: !wasTaken }
      const item = (s.nutrition.supplements || []).find(x => x.id === supp.id)
      if (item && typeof item.stock === 'number') {
        item.stock = Math.max(0, item.stock + (wasTaken ? 1 : -1))
      }
    })
  }

  const addSuppPreset = p => {
    update(s => {
      s.nutrition = s.nutrition || {}
      s.nutrition.supplements = [...(s.nutrition.supplements || []), { id: uid(), ...p }]
    })
    toast(t('Added {0}', p.name))
  }

  const openAddSupp = () => {
    openSheet(close => {
      const SuppForm = () => {
        const [name, setName] = useState('')
        const [dose, setDose] = useState('1 serving')
        const [stock, setStock] = useState(60)
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ margin: 0 }}>{t('Add Supplement')}</h3>
            <input className="input" placeholder={t('Name (e.g. Creatine)')} value={name} onChange={e => setName(e.target.value)} autoFocus />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input className="input" placeholder={t('Dose (5g)')} value={dose} onChange={e => setDose(e.target.value)} />
              <input type="number" className="input" placeholder={t('Servings in tub')} value={stock} onChange={e => setStock(e.target.value)} />
            </div>
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                if (!name.trim()) return
                addSuppPreset({ name: name.trim(), dose: dose.trim() || '1 serving', stock: Number(stock) || 30 })
                close()
              }}
            >
              {t('Save supplement')}
            </button>
          </div>
        )
      }
      return <SuppForm />
    })
  }

  const openAddPrep = () => {
    openSheet(close => {
      const PrepForm = () => {
        const [name, setName] = useState('')
        const [portions, setPortions] = useState(5)
        const [kcal, setKcal] = useState(520)
        const [protein, setProtein] = useState(44)
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ margin: 0 }}>{t('New Meal Prep Batch')}</h3>
            <input className="input" placeholder={t('e.g. Chicken Rice Bowls')} value={name} onChange={e => setName(e.target.value)} autoFocus />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <label className="small muted">{t('Portions')}<input type="number" className="input" value={portions} onChange={e => setPortions(e.target.value)} /></label>
              <label className="small muted">{t('kcal/box')}<input type="number" className="input" value={kcal} onChange={e => setKcal(e.target.value)} /></label>
              <label className="small muted">{t('Protein g')}<input type="number" className="input" value={protein} onChange={e => setProtein(e.target.value)} /></label>
            </div>
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                if (!name.trim()) return
                update(s => {
                  s.nutrition = s.nutrition || {}
                  s.nutrition.mealPrep = [
                    { id: uid(), name: name.trim(), total: Math.max(1, Number(portions) || 4), left: Math.max(1, Number(portions) || 4), kcal: Number(kcal) || 500, protein: Number(protein) || 40 },
                    ...(s.nutrition.mealPrep || []),
                  ]
                })
                toast(t('Meal prep batch added'))
                close()
              }}
            >
              {t('Add batch')}
            </button>
          </div>
        )
      }
      return <PrepForm />
    })
  }

  const eatPrepPortion = batch => {
    update(s => {
      const target = (s.nutrition?.mealPrep || []).find(b => b.id === batch.id)
      if (target && target.left > 0) target.left -= 1
      s.nutrition.entries = s.nutrition.entries || {}
      const arr = s.nutrition.entries[dayIso] || []
      arr.push({
        id: uid(),
        name: batch.name + ' (Prep)',
        slot: 'lunch',
        grams: 350,
        kcal: batch.kcal || 500,
        protein: batch.protein || 40,
        carbs: Math.round(((batch.kcal || 500) * 0.45) / 4),
        fat: Math.round(((batch.kcal || 500) * 0.23) / 9),
        fiber: 4,
        t: Date.now(),
      })
      s.nutrition.entries[dayIso] = arr
    })
    toast(t('Logged 1 portion of {0}', batch.name))
  }

  const saveDayAsPlan = () => {
    if (!dayEntries.length) { toast(t('Log at least one meal today first')); return }
    const planName = `Day Plan (${macros.kcal} kcal)`
    update(s => {
      s.nutrition = s.nutrition || {}
      s.nutrition.mealPlans = [
        { id: uid(), name: planName, kcal: macros.kcal, protein: macros.protein, items: dayEntries.map(({ id, t: ts, ...rest }) => rest) },
        ...(s.nutrition.mealPlans || []),
      ]
    })
    toast(t('Saved today as a reusable Meal Plan'))
  }

  const applyMealPlan = plan => {
    update(s => {
      s.nutrition = s.nutrition || {}
      s.nutrition.entries = s.nutrition.entries || {}
      const arr = s.nutrition.entries[dayIso] || []
      for (const it of plan.items || []) arr.push({ ...it, id: uid(), t: Date.now() })
      s.nutrition.entries[dayIso] = arr
    })
    toast(t('Applied {0}', plan.name))
  }

  const startFast = hours => {
    update(s => {
      s.nutrition = s.nutrition || {}
      s.nutrition.fasting = { startMs: Date.now(), goalHours: hours }
    })
    toast(t('Started {0}h fast', hours))
  }

  const endFast = () => {
    update(s => {
      if (s.nutrition) s.nutrition.fasting = null
    })
    toast(t('Fast completed'))
  }

  const copyDaySummary = async () => {
    const lines = [
      `## Nutrition — ${dayIso}`,
      `Calories: ${macros.kcal} / ${goals.kcal} kcal`,
      `Macros: P ${macros.protein}g / C ${macros.carbs}g / F ${macros.fat}g`,
      `Water: ${waterMl} / ${goals.waterMl} ml`,
      '',
      ...dayEntries.map(e => `- [${e.slot}] ${e.name} (${e.grams}g) — ${e.kcal} kcal`),
    ]
    try {
      await navigator.clipboard?.writeText(lines.join('\n'))
      toast(t('Day summary copied'))
    } catch {
      toast(t('Summary ready'))
    }
  }

  const waterPct = Math.min(100, Math.round((waterMl / Math.max(1, goals.waterMl)) * 100))
  const shakePct = Math.min(100, Math.round((shakes / 2) * 100))

  return (
    <div className="narrow" style={{ paddingBottom: 44 }}>
      <CollapsedHeader title={t('Nutrition')} />

      <div className="hdr" style={{ gap: 8 }}>
        <button type="button" className="iconbtn" onClick={() => nav(-1)} aria-label={t('Back')}>
          <Icon name="chevronLeft" />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1>{t('Nutrition')}</h1>
            <span className="gm-beta-tag">{t('560+ FOODS')}</span>
          </div>
          <div className="sub">{dayIso === todayISO() ? t('Today') : dayIso}</div>
        </div>
        <button type="button" className="iconbtn" onClick={() => openSheet(close => <AiMealSheet dayIso={dayIso} slot="lunch" onLogItems={logBatchItems} close={close} />)} title={t('Offline AI Meal Paste')}>
          <Icon name="sparkles" />
        </button>
        <button type="button" className="iconbtn" onClick={copyDaySummary} title={t('Copy day summary')}>
          <Icon name="clipboard" />
        </button>
        <button type="button" className="iconbtn" onClick={() => openSheet(close => <GoalsSheet goals={goals} close={close} />)} title={t('Daily goals')}>
          <Icon name="sliders" />
        </button>
      </div>

      {/* 7-day strip */}
      <div className="gm-week-row" style={{ marginBottom: 14 }}>
        {weekDays.map(d => {
          const active = d.iso === dayIso
          return (
            <button
              key={d.iso}
              type="button"
              onClick={() => setDayIso(d.iso)}
              className={'gm-wday' + (active ? ' today' : '')}
            >
              <span className="gm-wday-lbl">{d.dow}</span>
              <span
                className="gm-wday-circle"
                style={{
                  background: active ? 'var(--acc)' : 'var(--surface-2)',
                  color: active ? 'var(--acc-ink)' : 'var(--label)',
                  fontWeight: 800,
                }}
              >
                {d.num}
              </span>
              {d.hasData && <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--gm-sage)' }} />}
            </button>
          )
        })}
      </div>

      {/* Calorie Ring & Macros Hero */}
      <Rise index={0} className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ position: 'relative', width: 128, height: 128, flex: 'none' }}>
            <svg viewBox="0 0 128 128" style={{ width: 128, height: 128, transform: 'rotate(-90deg)' }}>
              <circle cx="64" cy="64" r={ringR} fill="none" stroke="var(--surface-2)" strokeWidth="10" />
              <circle
                cx="64"
                cy="64"
                r={ringR}
                fill="none"
                stroke={over > 0 ? '#D97B72' : 'var(--acc)'}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={ringC}
                strokeDashoffset={ringC * (1 - calPct)}
                style={{ transition: 'stroke-dashoffset 480ms ease' }}
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              <RollingText value={over > 0 ? over : remaining} style={{ fontSize: 22, fontWeight: 900 }} />
              <div className="gm-micro" style={{ fontSize: 9.5, marginTop: 2 }}>
                {over > 0 ? t('OVER') : t('LEFT')}
              </div>
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9 }}>
            <div className="row between" style={{ marginBottom: 2 }}>
              <span style={{ fontWeight: 800, fontSize: 15 }}>{macros.kcal} / {goals.kcal} kcal</span>
              <span className="dim small">{Math.round(calPct * 100)}%</span>
            </div>
            {[
              { lbl: t('Protein'), val: macros.protein, goal: goals.protein, col: 'var(--acc)' },
              { lbl: t('Carbs'), val: macros.carbs, goal: goals.carbs, col: 'var(--gm-sage)' },
              { lbl: t('Fat'), val: macros.fat, goal: goals.fat, col: 'var(--gm-brass)' },
            ].map(m => (
              <div key={m.lbl}>
                <div className="row between" style={{ fontSize: 12, fontWeight: 700, marginBottom: 3 }}>
                  <span style={{ color: 'var(--label-2)' }}>{m.lbl}</span>
                  <span><b>{m.val}g</b> <span className="dim">/ {m.goal}g</span></span>
                </div>
                <div style={{ height: 6, borderRadius: 99, background: 'var(--surface-2)', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, (m.val / Math.max(1, m.goal)) * 100)}%`, height: '100%', background: m.col, borderRadius: 99, transition: 'width 420ms ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Rise>

      {/* Water & Protein Shake Vessels */}
      <Rise index={1} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <div className="card" style={{ margin: 0, textAlign: 'center', padding: 14 }}>
          <div className="gm-micro" style={{ fontSize: 10, color: '#7FA8C9' }}>{t('WATER')}</div>
          <div className="gm-vessel-box">
            <div className="gm-vessel-fill" style={{ height: `${waterPct}%`, background: 'linear-gradient(180deg, #6EA8D6, #3E77A6)' }}>
              <div className="gm-vessel-wave" style={{ background: '#8CC4EE' }} />
            </div>
          </div>
          <div style={{ fontWeight: 900, fontSize: 16 }}>{waterMl} <span className="dim small">/ {goals.waterMl}ml</span></div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 10 }}>
            <button type="button" className="chip" onClick={() => adjustWater(-250)}>−250</button>
            <button type="button" className="chip on" onClick={() => adjustWater(250)}>+250</button>
            <button type="button" className="chip" onClick={() => adjustWater(500)}>+500</button>
          </div>
        </div>

        <div className="card" style={{ margin: 0, textAlign: 'center', padding: 14 }}>
          <div className="gm-micro" style={{ fontSize: 10, color: 'var(--acc)' }}>{t('PROTEIN SHAKE')}</div>
          <div className="gm-vessel-box">
            <div className="gm-vessel-fill" style={{ height: `${shakePct}%`, background: 'linear-gradient(180deg, #D9A184, #9E684B)' }}>
              <div className="gm-vessel-wave" style={{ background: '#F0C0A6' }} />
            </div>
          </div>
          <div style={{ fontWeight: 900, fontSize: 16 }}>{shakes} <span className="dim small">{shakes === 1 ? t('scoop') : t('scoops')}</span></div>
          <button type="button" className="chip on" style={{ marginTop: 10, width: '100%', justifyContent: 'center' }} onClick={addShake}>
            <Icon name="plus" style={{ fontSize: 11 }} /> {t('Log Scoop')}
          </button>
        </div>
      </Rise>

      {/* Meal Slots */}
      <Rise index={2} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
        {MEAL_SLOTS.map(slot => {
          const items = dayEntries.filter(e => e.slot === slot.id)
          const slotSum = sumDayMacros(items)
          return (
            <div key={slot.id} className="card" style={{ margin: 0 }}>
              <div className="row between" style={{ marginBottom: items.length ? 10 : 0 }}>
                <div className="row" style={{ gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 11, background: 'var(--surface-2)', color: 'var(--acc)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={slot.icon} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>{t(slot.label)}</div>
                    <div className="dim small">{slotSum.kcal} kcal · P {slotSum.protein}g</div>
                  </div>
                </div>
                <div className="row" style={{ gap: 6 }}>
                  {items.length > 0 && (
                    <button type="button" className="chip" style={{ fontSize: 11, padding: '4px 9px' }} onClick={() => saveSlotAsDish(slot.id)}>
                      {t('Save dish')}
                    </button>
                  )}
                  <button
                    type="button"
                    className="iconbtn"
                    style={{ background: 'var(--acc)', color: 'var(--acc-ink)' }}
                    aria-label={t('Add food')}
                    onClick={() => openSheet(close => <FoodPickerSheet library={library} dayIso={dayIso} slot={slot.id} close={close} />)}
                  >
                    <Icon name="plus" style={{ fontSize: 15 }} />
                  </button>
                </div>
              </div>

              {items.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {items.map(it => (
                    <div key={it.id} className="row between" style={{ background: 'var(--surface-2)', borderRadius: 14, padding: '8px 10px', gap: 10 }}>
                      <div className="row" style={{ gap: 10, minWidth: 0, flex: 1 }}>
                        <FoodImg src={it.photo} size={34} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</div>
                          <div className="dim small" style={{ fontSize: 11 }}>
                            {it.grams}g · P {it.protein}g · C {it.carbs}g · F {it.fat}g
                          </div>
                        </div>
                      </div>
                      <div className="row" style={{ gap: 8, flex: 'none' }}>
                        <span style={{ fontWeight: 800, fontSize: 13.5 }}>{it.kcal}</span>
                        <button type="button" className="iconbtn" style={{ width: 26, height: 26, color: 'var(--label-3)' }} onClick={() => deleteEntry(it.id)}>
                          <Icon name="xmark" style={{ fontSize: 11 }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </Rise>

      {/* Intermittent Fasting Timer */}
      <Rise index={3} className="card" style={{ marginBottom: 14 }}>
        <div className="row between" style={{ marginBottom: 10 }}>
          <div>
            <div className="gm-micro" style={{ color: 'var(--gm-sage)' }}>{t('INTERMITTENT FASTING')}</div>
            <div style={{ fontWeight: 800, fontSize: 16, marginTop: 2 }}>
              {fastInfo ? t(fastInfo.stage) : t('Ready to fast')}
            </div>
          </div>
          {fastInfo && (
            <button type="button" className="chip" style={{ color: 'var(--red)' }} onClick={endFast}>
              {t('End fast')}
            </button>
          )}
        </div>

        {fastInfo ? (
          <div>
            <div className="row between" style={{ marginBottom: 8 }}>
              <div>
                <div className="dim small">{t('Elapsed')}</div>
                <div style={{ fontSize: 24, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>{fmtHMS(fastInfo.elapsedSec)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="dim small">{fastInfo.done ? t('Goal reached!') : t('Remaining')}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--gm-sage)', fontVariantNumeric: 'tabular-nums' }}>
                  {fmtHMS(fastInfo.remainingSec)}
                </div>
              </div>
            </div>
            <div style={{ height: 8, borderRadius: 99, background: 'var(--surface-2)', overflow: 'hidden' }}>
              <div style={{ width: `${Math.round(fastInfo.pct * 100)}%`, height: '100%', background: 'var(--gm-sage)', borderRadius: 99 }} />
            </div>
          </div>
        ) : (
          <div className="chips">
            {[14, 16, 18, 20].map(h => (
              <button key={h} type="button" className="chip" onClick={() => startFast(h)}>
                {h}:{24 - h} ({h}h)
              </button>
            ))}
          </div>
        )}
      </Rise>

      {/* Supplements Checklist */}
      <Rise index={4} className="card" style={{ marginBottom: 14 }}>
        <div className="row between" style={{ marginBottom: 10 }}>
          <div className="row" style={{ gap: 8 }}>
            <Icon name="pill" style={{ color: 'var(--acc)', fontSize: 18 }} />
            <span style={{ fontWeight: 800, fontSize: 15 }}>{t('Supplements')}</span>
          </div>
          <button type="button" className="chip on" onClick={openAddSupp}>
            <Icon name="plus" style={{ fontSize: 11 }} /> {t('Add')}
          </button>
        </div>

        {supplements.length === 0 ? (
          <div>
            <div className="dim small" style={{ marginBottom: 8 }}>{t('Tap a common stack item to start tracking daily doses & tub stock:')}</div>
            <div className="chips">
              {SUPP_PRESETS.map(p => (
                <button key={p.name} type="button" className="chip" onClick={() => addSuppPreset(p)}>
                  + {p.name}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {supplements.map(supp => {
              const taken = !!suppTakenToday[supp.id]
              return (
                <button
                  key={supp.id}
                  type="button"
                  onClick={() => toggleSupp(supp)}
                  className="row between"
                  style={{
                    padding: '10px 12px',
                    borderRadius: 14,
                    background: taken ? 'color-mix(in srgb, var(--gm-sage) 18%, var(--surface-2))' : 'var(--surface-2)',
                    border: taken ? '1px solid var(--gm-sage)' : '1px solid transparent',
                    color: 'var(--label)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div className="row" style={{ gap: 10 }}>
                    <span
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: taken ? 'var(--gm-sage)' : 'var(--surface)',
                        color: taken ? '#111' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: taken ? 'none' : '1.5px solid var(--sep)',
                      }}
                    >
                      <Icon name="check" style={{ fontSize: 13 }} />
                    </span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>{supp.name}</div>
                      <div className="dim small">{supp.dose} · {supp.stock ?? 0} {t('left')}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 800, color: taken ? 'var(--gm-sage)' : 'var(--label-3)' }}>
                    {taken ? t('Taken') : t('Take')}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </Rise>

      {/* Meal Prep & Meal Plans */}
      <Rise index={5} className="card">
        <div className="row between" style={{ marginBottom: 10 }}>
          <span style={{ fontWeight: 800, fontSize: 15 }}>{t('Meal Prep & Plans')}</span>
          <div className="row" style={{ gap: 6 }}>
            <button type="button" className="chip" onClick={saveDayAsPlan}>{t('Save day as plan')}</button>
            <button type="button" className="chip on" onClick={openAddPrep}>+ {t('Prep')}</button>
          </div>
        </div>

        {mealPrep.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: mealPlans.length ? 14 : 0 }}>
            {mealPrep.map(b => (
              <div key={b.id} className="row between" style={{ background: 'var(--surface-2)', borderRadius: 14, padding: '10px 12px' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>{b.name}</div>
                  <div className="dim small">{b.left}/{b.total} {t('boxes left')} · {b.kcal} kcal · {b.protein}g P</div>
                </div>
                <button
                  type="button"
                  className="chip on"
                  disabled={b.left <= 0}
                  onClick={() => eatPrepPortion(b)}
                >
                  {t('Eat 1')}
                </button>
              </div>
            ))}
          </div>
        )}

        {mealPlans.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="gm-micro" style={{ fontSize: 10 }}>{t('SAVED DAY PLANS')}</div>
            {mealPlans.map(plan => (
              <div key={plan.id} className="row between" style={{ background: 'var(--surface-2)', borderRadius: 14, padding: '10px 12px' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>{plan.name}</div>
                  <div className="dim small">{(plan.items || []).length} {t('items')} · P {plan.protein}g</div>
                </div>
                <button type="button" className="chip on" onClick={() => applyMealPlan(plan)}>
                  {t('Apply')}
                </button>
              </div>
            ))}
          </div>
        ) : mealPrep.length === 0 ? (
          <div className="dim small">{t('Batch-cook boxes or save a full day of eating to reuse in one tap.')}</div>
        ) : null}
      </Rise>
    </div>
  )
}
