import { Component } from 'react'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import Icon from './Icon.jsx'
import { Button } from './ui.jsx'
import { reportCrash } from '../lib/analytics.js'

/**
 * Last line of defence: one bad render used to blank the whole app, with no way back —
 * a workout referencing an exercise the build doesn't know would white-screen and, since
 * the running workout is persisted, do it again on every reload.
 *
 * Sits inside #app so the tab bar stays usable; the shell keys this subtree on the route,
 * so switching tabs re-mounts it and clears the error by itself.
 */
export default class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { failed: false, error: null } }
  static getDerivedStateFromError(error) { return { failed: true, error } }
  componentDidCatch(err) {
    console.error('SmiTriX render error:', err)
    try { reportCrash(err, { context: 'ErrorBoundary' }) } catch {}
  }

  render() {
    if (!this.state.failed) return this.props.children
    const active = useStore.getState()?.S?.active
    return (
      <div className="narrow">
        <div className="empty" style={{ marginTop: '16vh', marginBottom: 16 }}>
          <div className="ico"><Icon name="info" /></div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>{t('Something went wrong')}</div>
          <div style={{ lineHeight: 1.4 }}>{t('This screen could not be drawn. Your data is safe on this device.')}</div>
          {this.state.error?.message && (
            <div className="dim small" style={{ marginTop: 12, padding: '8px 12px', background: 'var(--card-subtle)', borderRadius: 8, fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all', textAlign: 'left' }}>
              {this.state.error.message}
            </div>
          )}
        </div>
        <Button variant="primary" icon="reset" onClick={() => location.reload()}>{t('Reload SmiTriX')}</Button>
        <div style={{ height: 8 }} />
        <Button variant="ghost" icon="house" onClick={() => { location.hash = '#/home'; location.reload() }}>{t('Return to Home')}</Button>
        {active && <>
          <div style={{ height: 8 }} />
          <Button variant="danger" icon="trash" onClick={() => {
            useStore.getState().update(s => { s.active = null })
            location.reload()
          }}>{t('Discard the running workout')}</Button>
        </>}
      </div>
    )
  }
}
