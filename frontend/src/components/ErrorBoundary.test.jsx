import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { parseHTML } from 'linkedom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ErrorBoundary from './ErrorBoundary.jsx'

vi.mock('../store/useStore.js', () => ({
  useStore: {
    getState: () => ({ S: { active: null } })
  }
}))

vi.mock('../lib/analytics.js', () => ({
  reportCrash: vi.fn(() => Promise.resolve())
}))

let dom, root, container

function installDom() {
  const parsed = parseHTML('<!doctype html><html><body><div id="root"></div></body></html>')
  dom = parsed.window
  globalThis.window = dom
  globalThis.document = dom.document
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  container = document.getElementById('root')
  root = createRoot(container)
}

function ThrowingComponent({ shouldThrow }) {
  if (shouldThrow) {
    throw new Error('Explosive test render failure')
  }
  return <div>Normal Content</div>
}

beforeEach(() => {
  vi.clearAllMocks()
  installDom()
})

afterEach(async () => {
  if (root) {
    await act(async () => { root.unmount() })
    root = null
  }
})

describe('ErrorBoundary', () => {
  it('renders children when no error occurs', async () => {
    await act(async () => {
      root.render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      )
    })
    expect(container.textContent).toContain('Normal Content')
  })

  it('renders error boundary fallback with error message and reload button when child throws', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await act(async () => {
      root.render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      )
    })

    expect(container.textContent).toContain('Something went wrong')
    expect(container.textContent).toContain('This screen could not be drawn')
    expect(container.textContent).toContain('Explosive test render failure')
    expect(container.textContent).toContain('Reload SmiTriX')
    consoleSpy.mockRestore()
  })
})
