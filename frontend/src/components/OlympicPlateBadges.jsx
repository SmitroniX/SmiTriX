import { plateDiscsFor } from '../lib/bar.js'

export default function OlympicPlateBadges({ plates: passedPlates, totalWeight, barWeight, unit = 'kg', size = 'sm', className = '', showUnit = false }) {
  const plates = passedPlates || (
    totalWeight != null && barWeight != null
      ? plateDiscsFor(totalWeight, barWeight, unit)
      : []
  )

  if (!plates || plates.length === 0) return null

  return (
    <span className={`inline-plate-discs ${size === 'md' ? 'plate-md' : ''} ${className}`} aria-label="Plates per side">
      {plates.flatMap((p, pi) =>
        Array.from({ length: p.count }).map((_, ci) => (
          <span
            key={`${pi}-${ci}`}
            className="plate-disc-badge"
            style={{
              backgroundColor: p.color,
              color: p.color === '#eceff1' ? '#111' : '#fff'
            }}
            title={`${p.weight} ${unit}`}
          >
            {showUnit ? `${p.label || p.weight}${unit}` : (p.label || p.weight)}
          </span>
        ))
      )}
    </span>
  )
}
