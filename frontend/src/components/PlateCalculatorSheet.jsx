import { useState } from 'react'
import { barWeightFor, calculatePlates, plateSplit, BAR_EQ, DEFAULT_BAR_KG, DEFAULT_BAR_LB } from '../lib/bar.js'
import { exOr } from '../lib/exercises.js'
import { useStore } from '../store/useStore.js'
import { t, exerciseNameFor } from '../lib/i18n.js'
import Icon from './Icon.jsx'
import { Button } from './ui.jsx'

export default function PlateCalculatorSheet({ ex: rawEx, initialWeight, onWeightChange, close }) {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const ex = (typeof rawEx === 'string' ? exOr(rawEx) : rawEx) || { id: 'unknown', name: 'Barbell' }
  const unit = S.unit || 'kg'
  const currentBar = barWeightFor(S, ex) || (unit === 'lb' ? 45 : 20)

  const [totalWeight, setTotalWeight] = useState(initialWeight || currentBar * 2)
  const [selectedBar, setSelectedBar] = useState(currentBar)

  const step = unit === 'lb' ? 5 : 2.5
  const perSide = plateSplit(totalWeight, selectedBar) || 0
  const plates = calculatePlates(perSide, unit)

  const barPresets = unit === 'lb'
    ? [
        { label: '45 lb (Olympic)', w: 45 },
        { label: '35 lb (Women)', w: 35 },
        { label: '25 lb (EZ Bar)', w: 25 },
        { label: '55 lb (Trap Bar)', w: 55 },
      ]
    : [
        { label: '20 kg (Olympic)', w: 20 },
        { label: '15 kg (Women)', w: 15 },
        { label: '10 kg (EZ Bar)', w: 10 },
        { label: '25 kg (Trap Bar)', w: 25 },
      ]

  const changeBar = bw => {
    setSelectedBar(bw)
    update(st => {
      st.barWeights = st.barWeights || {}
      st.barWeights[ex.id] = bw
    })
  }

  const bumpWeight = delta => {
    const next = Math.max(selectedBar, Math.round((totalWeight + delta) * 100) / 100)
    setTotalWeight(next)
    onWeightChange?.(next)
  }

  return (
    <div className="plate-calc-sheet">
      <div className="row between" style={{ marginBottom: 12 }}>
        <div>
          <span className="plate-calc-subtitle"><Icon name="dumbbell" /> {t('Barbell Plate Loader')}</span>
          <h3 className="capitalize" style={{ margin: '2px 0 0' }}>{exerciseNameFor(ex)}</h3>
        </div>
        <button className="iconbtn" onClick={close} aria-label={t('Close')}>
          <Icon name="xmark" />
        </button>
      </div>

      {/* Target weight controller */}
      <div className="plate-target-card">
        <span className="dim small">{t('Total Target Weight')}</span>
        <div className="plate-target-ctrl">
          <button className="plate-bump-btn" onClick={() => bumpWeight(-step)} aria-label="Decrease">
            <Icon name="minus" />
          </button>
          <div className="plate-target-val">
            <span className="val-num">{totalWeight}</span>
            <span className="val-unit">{unit}</span>
          </div>
          <button className="plate-bump-btn" onClick={() => bumpWeight(step)} aria-label="Increase">
            <Icon name="plus" />
          </button>
        </div>
        <div className="plate-split-pill">
          {perSide > 0 ? (
            <span>{t('Load each side')}: <b>{perSide} {unit}</b> (+ {selectedBar} {unit} bar)</span>
          ) : (
            <span className="dim">{t('Bar only — no plates needed')}</span>
          )}
        </div>
      </div>

      {/* Visual Barbell Sleeve */}
      <div className="plate-visualizer-wrap">
        <div className="barbell-sleeve-stage">
          {/* Barbell shaft & collar */}
          <div className="barbell-shaft" />
          <div className="barbell-collar" />
          <div className="barbell-sleeve" />

          {/* Render plates loaded against collar */}
          <div className="barbell-plates-cluster">
            {plates.length === 0 ? (
              <div className="sleeve-empty-hint">{t('Empty bar')}</div>
            ) : (
              plates.flatMap((p, pi) =>
                Array.from({ length: p.count }).map((_, ci) => (
                  <div
                    key={`${pi}-${ci}`}
                    className="visual-plate"
                    style={{
                      backgroundColor: p.color,
                      height: `${Math.min(100, Math.max(38, p.weight * (unit === 'lb' ? 1.8 : 3.4)))}%`,
                      width: p.weight >= 20 ? 18 : p.weight >= 10 ? 14 : 10,
                      color: p.color === '#eceff1' ? '#111' : '#fff'
                    }}
                    title={`${p.weight} ${unit}`}
                  >
                    <span className="plate-label-txt">{p.label}</span>
                  </div>
                ))
              )
            )}
            {plates.length > 0 && <div className="barbell-spring-clamp" title={t('Bar clamp')} />}
          </div>
        </div>
      </div>

      {/* Plate count summary */}
      {plates.length > 0 && (
        <div className="plates-inventory-card">
          <div className="inventory-title">{t('Plates per side')}</div>
          <div className="plates-inventory-grid">
            {plates.map((p, i) => (
              <div key={i} className="plate-item-chip">
                <span className="plate-color-dot" style={{ backgroundColor: p.color }} />
                <span className="plate-item-count">{p.count} ×</span>
                <b className="plate-item-weight">{p.weight} {unit}</b>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bar Weight Selector */}
      <div style={{ marginTop: 14 }}>
        <div className="dim small" style={{ marginBottom: 6 }}>{t('Barbell weight')}</div>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {barPresets.map(bp => (
            <button
              key={bp.w}
              type="button"
              className={'chip' + (selectedBar === bp.w ? ' on' : '')}
              onClick={() => changeBar(bp.w)}
            >
              {bp.label}
            </button>
          ))}
        </div>
      </div>

      <Button variant="primary" style={{ marginTop: 16 }} onClick={close}>
        {t('Done')}
      </Button>
    </div>
  )
}
