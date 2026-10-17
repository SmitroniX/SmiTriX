// Setup screen for the AI Coach: configure either server mode or BYOK (Bring Your Own Key).
//
// Two options:
// 1. "Use my self-hosted SmiTriX": delegates to the paired server instance.
// 2. "Bring my own API key (BYOK)": runs the pipeline locally against Anthropic, OpenAI,
//    Google Gemini, or an OpenAI-compatible endpoint (Ollama, LM Studio, OpenRouter, etc.),
//    with credentials stored securely on the device.
//
// Works across web, desktop, and mobile. The catalogue, prompts and validator are loaded
// lazily on demand.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import { CATEGORY_TEXT } from '../lib/coach.js'
import { getApiKey, setApiKey, clearApiKey } from '../lib/coach-secrets.js'
import { HTTP_PROVIDERS, HTTP_PROVIDER_IDS, baseUrlFor, validateBaseUrl } from '../../../api/coach/core/providers.js'
import { DATA_CATEGORIES } from '../../../api/coach/core/categories.js'
import { ConnectSheet } from './MobileOnboarding.jsx'
import Icon from '../components/Icon.jsx'
import { Section, Row, Button, TextField } from '../components/ui.jsx'

const STEPS = ['Loading the exercise catalogue…', 'Checking the endpoint…', 'Ready']

export default function CoachSetup() {
  const nav = useNavigate()
  const user = useStore(s => s.user)
  const config = useStore(s => s.config)
  const coachLocal = useStore(s => s.coachLocal)
  const setCoachLocal = useStore(s => s.setCoachLocal)
  const refreshConfig = useStore(s => s.refreshConfig)
  const toast = useUI(s => s.toast)
  const openSheet = useUI(s => s.openSheet)

  const [choice, setChoice] = useState(
    coachLocal?.mode === 'byok' ? 'byok' : coachLocal?.mode === 'server' ? 'server' : null
  )
  const [provider, setProvider] = useState(coachLocal?.provider || 'anthropic')
  const [baseUrl, setBaseUrl] = useState(coachLocal?.baseUrl || '')
  const [model, setModel] = useState(coachLocal?.model || '')
  const [customModel, setCustomModel] = useState(false)
  const [key, setKey] = useState('')
  const [hasKey, setHasKey] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [models, setModels] = useState(null)
  const [step, setStep] = useState(-1)                     // -1 idle, 0..2 running, 3 done
  const [testResult, setTestResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [providerKeys, setProviderKeys] = useState({})

  const refreshKeys = async (p = provider) => {
    const map = {}
    for (const id of HTTP_PROVIDER_IDS) {
      map[id] = !!(await getApiKey(id))
    }
    setProviderKeys(map)
    setHasKey(!!map[p])
  }

  useEffect(() => {
    refreshKeys(provider)
  }, [])

  // Ask the server afresh: the admin may have switched the Coach on since boot.
  useEffect(() => { if (user) refreshConfig() }, [user])

  useEffect(() => {
    setModels(null)
    setTestResult(null)
    setCustomModel(false)
    setKey('')
    const isCurrent = coachLocal?.provider === provider
    setModel(isCurrent ? (coachLocal?.model || '') : '')
    getApiKey(provider).then(k => setHasKey(!!k))
  }, [provider])

  const meta = HTTP_PROVIDERS[provider] || {}
  const host = hostOf(baseUrlFor(provider, { providerOptions: { [provider]: { baseUrl } } }))
  const serverHasCoach = !!(user && config?.coach?.enabled)

  const useServer = async () => {
    if (!user) return openSheet(close => <ConnectSheet close={close} />)
    await setCoachLocal({ mode: 'server' })
    toast(t('The Coach is on'))
    nav('/coach')
  }

  // Reachability and model listing test
  const prepare = async () => {
    const v = validateBaseUrl(meta.baseUrl ? baseUrl : '')
    if (!v.ok) return toast(v.error)
    if (meta.baseUrl && !v.value) return toast(t('Enter an endpoint URL'))
    if (!meta.keyOptional && !key.trim() && !hasKey) return toast(t('Enter your API key'))
    setBusy(true)
    setStep(0)
    setTestResult(null)
    const startMs = Date.now()
    try {
      const local = await import('../lib/coach-local.js')
      setStep(1)
      const k = key.trim() || await getApiKey(provider)
      const r = await local.localModels({ provider, baseUrl: v.value }, k)
      if (!r.ok) {
        setStep(-1)
        const errMsg = r.error || t('Could not reach the provider')
        setTestResult({ ok: false, error: errMsg })
        toast(t('Could not reach the provider: {0}', errMsg))
        return
      }
      setModels(r.models)
      setStep(2)
      const elapsed = Date.now() - startMs
      setTestResult({ ok: true, count: r.models.length, ms: elapsed })
      toast(t('Connected! {0} models available ({1}ms)', r.models.length, elapsed))
      if (!model) {
        if (meta.defaultModel && r.models.includes(meta.defaultModel)) {
          setModel(meta.defaultModel)
        } else if (r.models.length > 0) {
          setModel(r.models[0])
        }
      }
    } catch (e) {
      setStep(-1)
      const msg = e.message || t('Could not connect')
      setTestResult({ ok: false, error: msg })
      toast(msg)
    } finally {
      setBusy(false)
    }
  }

  const save = async () => {
    if (!meta.keyOptional && !key.trim() && !hasKey) return toast(t('Enter your API key'))
    const chosen = model || meta.defaultModel
    if (!chosen) return toast(t('Pick a model'))
    const v = validateBaseUrl(meta.baseUrl ? baseUrl : '')
    if (!v.ok) return toast(v.error)
    if (meta.baseUrl && !v.value) return toast(t('Enter an endpoint URL'))
    setBusy(true)
    try {
      await setCoachLocal({
        mode: 'byok',
        provider,
        model: chosen,
        baseUrl: meta.baseUrl ? (v.value || null) : null
      })
      if (key.trim()) {
        await setApiKey(key.trim(), provider)
        setHasKey(true)
        setKey('')
        await refreshKeys(provider)
      }
      toast(t('The Coach is active'))
      nav('/coach')
    } catch (e) {
      toast(e?.message || t('Could not connect'))
    } finally {
      setBusy(false)
    }
  }

  const clearKey = async () => {
    await clearApiKey(provider)
    setHasKey(false)
    setKey('')
    await refreshKeys(provider)
    toast(t('API key cleared'))
  }

  const turnOff = async () => {
    await clearApiKey(provider)
    await clearApiKey()
    setHasKey(false)
    await setCoachLocal({ mode: 'off' })
    const local = await import('../lib/coach-local.js').catch(() => null)
    if (local) await local.localForget()
    setChoice(null)
    await refreshKeys(provider)
    toast(t('The Coach is off'))
  }

  const current = coachLocal?.mode === 'server'
    ? t('Runs on your SmiTriX server')
    : coachLocal?.mode === 'byok'
      ? t('Runs with your own API key ({0})', HTTP_PROVIDERS[coachLocal?.provider]?.label || coachLocal?.provider)
      : t('Off — choose how the Coach should run.')

  return <div className="narrow">
    <div className="hdr">
      <button className="iconbtn" onClick={() => nav('/settings')} aria-label={t('Back')}><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, marginLeft: 10 }}><h1>{t('AI Coach & API Keys')}</h1></div>
    </div>

    <Section title={t('How should the Coach run?')} footer={current}>
      <Row
        icon="rocket"
        iconTint="var(--indigo)"
        title={t('Use my self-hosted SmiTriX')}
        subtitle={
          user
            ? (serverHasCoach
                ? t('Your server runs the Coach with whatever provider its admin set up.')
                : config == null
                  ? t('Loading…')
                  : t('Your server has no Coach enabled — ask its admin, or bring your own key below.'))
            : t('Connect to my server')
        }
        accessory="chevron"
        onClick={() => {
          if (!user || serverHasCoach) useServer()
          else setChoice('server')
        }}
      />
      <Row
        icon="key"
        iconTint="var(--acc)"
        title={t('Bring my own API key (BYOK)')}
        subtitle={t('Calls the AI provider directly with your key. Works in your browser or phone with your own account.')}
        accessory="chevron"
        onClick={() => setChoice('byok')}
      />
    </Section>

    {choice === 'server' && !serverHasCoach && (
      <div className="card">
        <div className="muted small">{t('Your server has no Coach enabled — ask its admin, or bring your own key below.')}</div>
        <div style={{ marginTop: 10 }}>
          <Button variant="primary" icon="key" onClick={() => setChoice('byok')}>{t('Configure BYOK API Key')}</Button>
        </div>
      </div>
    )}

    {choice === 'byok' && <>
      <Section title={t('AI Provider')}>
        <div className="row" style={{ flexWrap: 'wrap', gap: 7, padding: '8px 12px' }}>
          {HTTP_PROVIDER_IDS.map(id => (
            <button
              key={id}
              className={'chip' + (id === provider ? ' on' : '')}
              disabled={busy}
              onClick={() => setProvider(id)}
            >
              {HTTP_PROVIDERS[id].label}
              {providerKeys[id] && <span className="adm-chip-key" style={{ marginLeft: 5 }}>✓</span>}
            </button>
          ))}
        </div>
      </Section>

      {meta.baseUrl && (
        <Section title={t('Endpoint URL')} footer={t('Connect to Ollama, LM Studio, vLLM, OpenRouter or a custom proxy.')}>
          <div style={{ padding: '8px 12px' }}>
            <TextField
              value={baseUrl}
              placeholder="http://localhost:11434  or  https://openrouter.ai/api"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              onChange={e => setBaseUrl(e.target.value)}
            />
          </div>
        </Section>
      )}

      <Section
        title={t('API Key')}
        footer={t('The key is stored securely on this device and only sent directly to {0} when calling the model.', host || meta.label)}
      >
        <div style={{ padding: '8px 12px' }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <TextField
              value={key}
              type={showKey ? 'text' : 'password'}
              placeholder={hasKey ? '••••••••  ' + t('(saved — enter to replace)') : (meta.keyPlaceholder || 'sk-…')}
              autoCapitalize="none"
              autoCorrect="off"
              onChange={e => setKey(e.target.value)}
              style={{ flex: 1 }}
            />
            <Button
              variant="tinted"
              icon={showKey ? 'eyeSlash' : 'eye'}
              onClick={() => setShowKey(!showKey)}
              aria-label={showKey ? t('Hide key') : t('Show key')}
            />
          </div>
          <div className="row between" style={{ marginTop: 8, alignItems: 'center' }}>
            <span className="small dim">
              {hasKey
                ? <span style={{ color: 'var(--green)', fontWeight: 600 }}>✓ {t('API key saved and active')}</span>
                : meta.keyOptional
                  ? t('Optional for local models (e.g. Ollama)')
                  : t('Required for this provider')}
            </span>
            {hasKey && (
              <Button size="sm" danger onClick={clearKey}>{t('Clear key')}</Button>
            )}
          </div>
        </div>
      </Section>

      {/* Real-time connection feedback */}
      {testResult && (
        <div className={'adm-result ' + (testResult.ok ? 'ok' : 'bad')} style={{ margin: '8px 16px' }}>
          {testResult.ok ? (
            <>
              <b>{t('Connected successfully!')}</b>
              <div className="small" style={{ marginTop: 3 }}>
                {t('{0} models found in {1}ms', testResult.count, testResult.ms)}
              </div>
            </>
          ) : (
            <>
              <b>{t('Connection failed')}</b>
              <div className="small" style={{ marginTop: 3 }}>{testResult.error}</div>
            </>
          )}
        </div>
      )}

      {step >= 0 && (
        <div className="card">
          {STEPS.map((s, i) => (
            <div key={s} className="row" style={{ gap: 8, padding: '3px 0', opacity: i > step ? .4 : 1 }}>
              <span style={{ color: i < step || step === 2 ? 'var(--green)' : i === step ? 'var(--acc)' : 'var(--dim)' }}>
                <Icon name={i < step || step === 2 ? 'check' : 'timer'} />
              </span>
              <span className="small">{t(s)}</span>
            </div>
          ))}
        </div>
      )}

      <Section title={t('Model')}>
        <div style={{ padding: '8px 12px' }}>
          {models && !customModel ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <select
                className="input"
                value={model}
                disabled={busy}
                onChange={e => {
                  if (e.target.value === '__custom__') {
                    setCustomModel(true)
                  } else {
                    setModel(e.target.value)
                  }
                }}
                style={{ width: '100%' }}
              >
                <option value="">{meta.defaultModel ? `Default (${meta.defaultModel})` : t('Pick a model')}</option>
                {models.map(m => <option key={m} value={m}>{m}</option>)}
                <option value="__custom__">✏️ {t('Enter custom model name…')}</option>
              </select>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <TextField
                value={model}
                disabled={busy}
                placeholder={meta.defaultModel ? `Default: ${meta.defaultModel}` : 'e.g. qwen2.5:3b, gpt-4o, claude-3-5-sonnet'}
                onChange={e => setModel(e.target.value)}
                style={{ flex: 1 }}
              />
              {models && (
                <Button size="sm" variant="tinted" onClick={() => setCustomModel(false)}>
                  {t('List')}
                </Button>
              )}
            </div>
          )}
        </div>
      </Section>

      <Section title={t('Privacy: What leaves this device')}>
        {DATA_CATEGORIES.map(k => {
          const [title, sub] = CATEGORY_TEXT[k] || [k, '']
          return <Row key={k} icon="check" iconTint="var(--acc)" title={t(title)} subtitle={t(sub)} />
        })}
      </Section>
      <p className="sect-f" style={{ marginTop: -18, marginBottom: 22, lineHeight: 1.5 }}>
        {t('Each request goes straight to {0} with your key — nobody else sees it, and you pay for it.', host || meta.label)}
      </p>

      <div className="row" style={{ gap: 8, flexWrap: 'wrap', padding: '0 12px 16px' }}>
        <Button variant="tinted" icon="sparkles" disabled={busy} onClick={prepare}>
          {busy ? t('Checking…') : models ? t('Refresh models') : t('Test & List models')}
        </Button>
        <Button variant="primary" icon="check" disabled={busy} onClick={save}>
          {t('Save and use the Coach')}
        </Button>
      </div>
    </>}

    {coachLocal?.mode && coachLocal.mode !== 'off' && (
      <Section title={t('Controls')}>
        <Row icon="signOut" iconTint="var(--red)" title={t('Turn the Coach off')} danger onClick={turnOff} />
      </Section>
    )}
  </div>
}

const hostOf = url => { try { return new URL(url).host } catch { return '' } }
