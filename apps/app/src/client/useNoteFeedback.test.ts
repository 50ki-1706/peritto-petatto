import { afterEach, beforeEach, expect, it, vi } from 'vite-plus/test'
import { useNoteFeedback } from './useNoteFeedback'

const hooks = vi.hoisted(() => ({ effects: [] as (() => void | (() => void))[] }))
vi.mock('react', () => ({
  useRef: (current: unknown) => ({ current }),
  useEffect: (effect: () => void | (() => void)) => hooks.effects.push(effect),
}))

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: Error) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

let context: FakeAudioContext
let cleanup: (() => void) | void
let now = 0
const decoded = [{ label: 'peel' }, { label: 'remove' }]

class FakeAudioContext {
  state = 'running'
  destination = {}
  decoding = [deferred<unknown>(), deferred<unknown>()]
  decodeIndex = 0
  sources: { buffer: unknown; start: ReturnType<typeof vi.fn> }[] = []
  resume = vi.fn(() => {
    this.state = 'running'
    return Promise.resolve()
  })
  close = vi.fn(() => {
    this.state = 'closed'
    return Promise.resolve()
  })
  decodeAudioData = vi.fn(() => this.decoding[this.decodeIndex++]!.promise)
  createBufferSource() {
    const source = { buffer: null, connect: vi.fn(), disconnect: vi.fn(), start: vi.fn() }
    this.sources.push(source)
    return source
  }
  createGain() {
    return { gain: { value: 0 }, connect: vi.fn(), disconnect: vi.fn() }
  }
}

async function flush() {
  for (let i = 0; i < 10; i++) await Promise.resolve()
}

async function mount() {
  const feedback = useNoteFeedback()
  cleanup = hooks.effects.pop()!()
  await flush()
  return feedback
}

beforeEach(() => {
  now = 0
  vi.spyOn(performance, 'now').mockImplementation(() => now)
  context = new FakeAudioContext()
  vi.stubGlobal(
    'AudioContext',
    vi.fn(function () {
      return context
    }),
  )
  vi.stubGlobal('window', {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    matchMedia: () => ({ matches: false }),
  })
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) })),
  )
})

afterEach(() => {
  cleanup?.()
  cleanup = undefined
  hooks.effects.length = 0
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('plays an immediate first drag once decoding finishes, using inline audio', async () => {
  const feedback = await mount()
  for (const [url] of vi.mocked(fetch).mock.calls) {
    expect(url).toMatch(/^data:audio\/mpeg;base64,/)
  }
  feedback.peel()
  expect(context.sources).toHaveLength(0)
  context.decoding[0]!.resolve(decoded[0])
  await flush()
  expect(context.sources).toHaveLength(1)
  expect(context.sources[0]!.buffer).toBe(decoded[0])
  expect(context.sources[0]!.start).toHaveBeenCalledOnce()
})

it('waits for audio resume as well as decoding', async () => {
  const feedback = await mount()
  const resumed = deferred<void>()
  context.state = 'suspended'
  context.resume.mockImplementation(() => resumed.promise)
  context.decoding[1]!.resolve(decoded[1])
  feedback.remove()
  expect(context.resume).toHaveBeenCalledOnce()
  await flush()
  expect(context.sources).toHaveLength(0)
  context.state = 'running'
  resumed.resolve()
  await flush()
  expect(context.sources[0]!.buffer).toBe(decoded[1])
})

it('discards slow decoding rather than playing stale feedback', async () => {
  const feedback = await mount()
  feedback.peel()
  now = 251
  context.decoding[0]!.resolve(decoded[0])
  await flush()
  expect(context.sources).toHaveLength(0)
  feedback.peel()
  await flush()
  expect(context.sources).toHaveLength(1)
})

it('does not replay an old sound when audio is unlocked later', async () => {
  const feedback = await mount()
  const resumed = deferred<void>()
  context.state = 'suspended'
  context.resume.mockImplementation(() => resumed.promise)
  context.decoding[1]!.resolve(decoded[1])
  feedback.remove()
  now = 1000
  context.state = 'running'
  resumed.resolve()
  await flush()
  expect(context.sources).toHaveLength(0)
})

it('keeps only the latest feedback while preparing audio', async () => {
  const feedback = await mount()
  feedback.peel()
  feedback.remove()
  context.decoding[0]!.resolve(decoded[0])
  context.decoding[1]!.resolve(decoded[1])
  await flush()
  expect(context.sources).toHaveLength(1)
  expect(context.sources[0]!.buffer).toBe(decoded[1])
})

it('ignores pending playback after unmount', async () => {
  const feedback = await mount()
  feedback.peel()
  cleanup?.()
  cleanup = undefined
  context.decoding[0]!.resolve(decoded[0])
  await flush()
  expect(context.sources).toHaveLength(0)
})

it('still plays the other sound if one asset fails to decode', async () => {
  const feedback = await mount()
  context.decoding[0]!.reject(new Error('Invalid audio'))
  context.decoding[1]!.resolve(decoded[1])
  await flush()
  feedback.remove()
  await flush()
  expect(context.sources[0]!.buffer).toBe(decoded[1])
})

it('handles a rejected resume without interrupting the operation', async () => {
  const feedback = await mount()
  context.state = 'suspended'
  context.resume.mockRejectedValue(new Error('Audio blocked'))
  context.decoding[1]!.resolve(decoded[1])
  expect(() => feedback.remove()).not.toThrow()
  await flush()
  expect(context.sources).toHaveLength(0)
})
