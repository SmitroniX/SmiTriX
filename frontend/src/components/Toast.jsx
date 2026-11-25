import { useUI } from '../store/useUI.js'
import Icon from './Icon.jsx'

// GymMane LiquidNotch dynamic-island style notification pill.
// Retains `#toast` and `.show` classes so existing styles/tests stay compatible.
export default function Toast() {
  const msg = useUI(s => s.toastMsg)
  const meta = useUI(s => s.toastMeta)

  const handleClick = () => {
    if (meta?.onTap) meta.onTap()
    useUI.setState({ toastMsg: '', toastMeta: null })
  }

  return (
    <div
      id="toast"
      className={'gm-notch-toast' + (msg ? ' show' : '')}
      role="status"
      aria-live="polite"
      onClick={msg ? handleClick : undefined}
    >
      <div className="gm-notch-neck" aria-hidden="true" />
      <div className="gm-notch-pill">
        {meta?.icon && (
          <span
            className="gm-notch-ico"
            style={{
              background: `color-mix(in srgb, ${meta.accent || 'var(--gm-sage)'} 20%, transparent)`,
              color: meta.accent || 'var(--gm-sage)',
            }}
          >
            <Icon name={meta.icon} />
          </span>
        )}
        <div className="gm-notch-copy">
          <div className="gm-notch-title">{msg}</div>
          {meta?.subtitle && <div className="gm-notch-sub">{meta.subtitle}</div>}
        </div>
        {meta?.action && (
          <span className="gm-notch-act" style={{ color: meta.accent || 'var(--gm-accent)' }}>
            {meta.action}
          </span>
        )}
      </div>
    </div>
  )
}
