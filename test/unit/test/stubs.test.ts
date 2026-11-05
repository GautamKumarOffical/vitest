import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setupEnv } from '../../../packages/vitest/src/runtime/setup-common'

declare global {
  var __defined__: unknown

  var __setter__: unknown
}

describe('stubbing globals', () => {
  beforeEach(() => {
    delete globalThis.__defined__
    if (globalThis.__setter__) {
      delete globalThis.__setter__
    }
    vi.unstubAllGlobals()
  })

  it('overwrites setter', () => {
    const descriptor = {
      get: () => 'getter',
      set: () => {},
      configurable: true,
    }
    Object.defineProperty(globalThis, '__setter__', descriptor)
    expect(__setter__).toBe('getter')
    vi.stubGlobal('__setter__', 'stubbed')
    expect(__setter__).toBe('stubbed')
    expect(globalThis.__setter__).toBe('stubbed')
    expect(Object.getOwnPropertyDescriptor(globalThis, '__setter__')).not.toBe(descriptor)
    vi.unstubAllGlobals()
    expect(__setter__).toBe('getter')
  })

  it('stubs and restores already defined value', () => {
    globalThis.__defined__ = 'true'
    vi.stubGlobal('__defined__', 'false')
    expect(__defined__).toBe('false')
    expect(globalThis.__defined__).toBe('false')
    vi.unstubAllGlobals()
    expect(__defined__).toBe('true')
    expect(globalThis.__defined__).toBe('true')
  })

  it('stubs and removes undefined value', () => {
    vi.stubGlobal('__defined__', 'false')
    expect(__defined__).toBe('false')
    expect(globalThis.__defined__).toBe('false')
    vi.unstubAllGlobals()
    expect('__defined__' in globalThis).toBe(false)
    expect(() => __defined__).toThrow(ReferenceError)
    expect(globalThis.__defined__).toBeUndefined()
  })

  it('restores the first available value', () => {
    globalThis.__defined__ = 'true'
    vi.stubGlobal('__defined__', 'false')
    vi.stubGlobal('__defined__', false)
    vi.stubGlobal('__defined__', null)
    expect(__defined__).toBe(null)
    expect(globalThis.__defined__).toBe(null)
    vi.unstubAllGlobals()
    expect(__defined__).toBe('true')
    expect(globalThis.__defined__).toBe('true')
  })
})

describe('stubbing envs', () => {
  beforeEach(() => {
    process.env.VITE_TEST_UPDATE_ENV = 'development'
    vi.unstubAllEnvs()
  })

  it('stubs and restores env', () => {
    vi.stubEnv('VITE_TEST_UPDATE_ENV', 'production')
    expect(import.meta.env.VITE_TEST_UPDATE_ENV).toBe('production')
    expect(process.env.VITE_TEST_UPDATE_ENV).toBe('production')
    vi.unstubAllEnvs()
    expect(import.meta.env.VITE_TEST_UPDATE_ENV).toBe('development')
    expect(process.env.VITE_TEST_UPDATE_ENV).toBe('development')
  })

  it('stubs and restores previously not defined env', () => {
    delete process.env.VITE_TEST_UPDATE_ENV
    vi.stubEnv('VITE_TEST_UPDATE_ENV', 'production')
    expect(import.meta.env.VITE_TEST_UPDATE_ENV).toBe('production')
    expect(process.env.VITE_TEST_UPDATE_ENV).toBe('production')
    vi.unstubAllEnvs()
    expect('VITE_TEST_UPDATE_ENV' in process.env).toBe(false)
    expect('VITE_TEST_UPDATE_ENV' in import.meta.env).toBe(false)
    expect(import.meta.env.VITE_TEST_UPDATE_ENV).toBeUndefined()
    expect(process.env.VITE_TEST_UPDATE_ENV).toBeUndefined()
  })

  it('restores the first available value', () => {
    globalThis.__defined__ = 'true'
    vi.stubEnv('VITE_TEST_UPDATE_ENV', 'production')
    vi.stubEnv('VITE_TEST_UPDATE_ENV', 'staging')
    vi.stubEnv('VITE_TEST_UPDATE_ENV', 'test')
    expect(import.meta.env.VITE_TEST_UPDATE_ENV).toBe('test')
    expect(process.env.VITE_TEST_UPDATE_ENV).toBe('test')
    vi.unstubAllEnvs()
    expect(import.meta.env.VITE_TEST_UPDATE_ENV).toBe('development')
    expect(process.env.VITE_TEST_UPDATE_ENV).toBe('development')
  })

  it.each(['PROD', 'DEV', 'SSR'] as const)('requires boolean for env.%s', (name) => {
    vi.stubEnv(name as 'PROD', false)
    expect(import.meta.env[name]).toBe(false)
    expect(process.env[name]).toBe('')

    vi.stubEnv(name as 'PROD', true)
    expect(import.meta.env[name]).toBe(true)
    expect(process.env[name]).toBe('1')

    // @ts-expect-error PROD, DEV, SSR expect a boolean
    vi.stubEnv(name as 'PROD', 'string')
    // @ts-expect-error PROD, DEV, SSR expect a boolean
    vi.stubEnv(name, 'string')
  })

  it.each(['PROD', 'DEV', 'SSR'] as const)(
    'stubbing boolean env.%s to undefined removes it',
    (name) => {
      vi.stubEnv(name, undefined)
      // removed entirely, not set to an empty string like a `false` boolean stub
      expect(name in import.meta.env).toBe(false)
      expect(process.env[name]).toBeUndefined()
      vi.unstubAllEnvs()
    },
  )

  it('setting boolean casts the value to string', () => {
    // @ts-expect-error value should be a string
    vi.stubEnv('MY_TEST_ENV', true)
    expect(import.meta.env.MY_TEST_ENV).toBe('true')
  })

  it('stubs to undefined and restores env', () => {
    vi.stubEnv('VITE_TEST_UPDATE_ENV', undefined)
    expect(import.meta.env.VITE_TEST_UPDATE_ENV).toBeUndefined()
    expect(process.env.VITE_TEST_UPDATE_ENV).toBeUndefined()
    vi.unstubAllEnvs()
    expect(import.meta.env.VITE_TEST_UPDATE_ENV).toBe('development')
    expect(process.env.VITE_TEST_UPDATE_ENV).toBe('development')
  })

  it('setting undefined unsets the env instead of stringifying to "undefined"', () => {
    process.env.TEST_UNDEFINED_SET = 'initial'
    import.meta.env.TEST_UNDEFINED_SET = undefined
    expect('TEST_UNDEFINED_SET' in process.env).toBe(false)
    expect(process.env.TEST_UNDEFINED_SET).toBeUndefined()
    expect(import.meta.env.TEST_UNDEFINED_SET).toBeUndefined()
  })

  it('deleting property unsets the env', () => {
    process.env.TEST_DELETE_PROP = 'initial'
    delete import.meta.env.TEST_DELETE_PROP
    expect('TEST_DELETE_PROP' in process.env).toBe(false)
    expect(process.env.TEST_DELETE_PROP).toBeUndefined()
    expect(import.meta.env.TEST_DELETE_PROP).toBeUndefined()
  })

  it('setupEnv unsets undefined values without stringifying to "undefined"', () => {
    process.env.TEST_EXISTING_ENV = 'initial'
    setupEnv(
      {
        TEST_UNDEFINED_KEY: undefined,
        TEST_DEFINED_KEY: 'defined',
        TEST_EXISTING_ENV: undefined,
      },
      import.meta.env,
    )

    expect('TEST_UNDEFINED_KEY' in process.env).toBe(false)
    expect(process.env.TEST_UNDEFINED_KEY).toBeUndefined()
    expect(import.meta.env.TEST_UNDEFINED_KEY).toBeUndefined()

    expect(process.env.TEST_DEFINED_KEY).toBe('defined')
    expect(import.meta.env.TEST_DEFINED_KEY).toBe('defined')

    expect('TEST_EXISTING_ENV' in process.env).toBe(false)
    expect(process.env.TEST_EXISTING_ENV).toBeUndefined()
    expect(import.meta.env.TEST_EXISTING_ENV).toBeUndefined()
  })
})
