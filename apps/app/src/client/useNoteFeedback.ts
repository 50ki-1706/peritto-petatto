import { useEffect, useRef } from 'react'
import peelSound from './sounds/peel.mp3?inline'
import removeSound from './sounds/delete.mp3?inline'

// Inline these small assets so the first interaction needs no extra network request.
const SOUNDS = { peel: peelSound, remove: removeSound } as const
type Sound = keyof typeof SOUNDS
const STICK_VIBRATION_MS = 12
const PEEL_VIBRATION_MS = 28
const MAX_PLAY_DELAY_MS = 250

export function useNoteFeedback() {
  const audio = useRef<{
    context: AudioContext
    buffers: Partial<Record<Sound, Promise<AudioBuffer | undefined>>>
    requestId: number
  } | null>(null)

  useEffect(() => {
    if (typeof AudioContext === 'undefined') return
    const context = new AudioContext()
    const state = {
      context,
      buffers: {} as Partial<Record<Sound, Promise<AudioBuffer | undefined>>>,
      requestId: 0,
    }
    const controller = new AbortController()
    audio.current = state

    // Decode each sound independently so one failed asset does not disable the other.
    for (const sound of Object.keys(SOUNDS) as Sound[]) {
      state.buffers[sound] = fetch(SOUNDS[sound], { signal: controller.signal })
        .then((response) => {
          if (!response.ok) throw new Error('Note sound unavailable')
          return response.arrayBuffer()
        })
        .then((data) => context.decodeAudioData(data))
        .catch(() => {
          // Sound is optional; loading failure must never interrupt note operations.
          return undefined
        })
    }

    const unlock = () => {
      if (context.state === 'suspended') void context.resume().catch(() => {})
    }
    // Touch browsers may unlock audio only on touchend, rather than pointerdown.
    window.addEventListener('pointerdown', unlock, true)
    window.addEventListener('touchend', unlock, true)
    window.addEventListener('keydown', unlock, true)
    return () => {
      controller.abort()
      window.removeEventListener('pointerdown', unlock, true)
      window.removeEventListener('touchend', unlock, true)
      window.removeEventListener('keydown', unlock, true)
      audio.current = null
      void context.close().catch(() => {})
    }
  }, [])

  function vibrate(duration: number) {
    // Use input capability rather than viewport width (landscape phones also vibrate).
    if (window.matchMedia('(any-pointer: coarse)').matches) {
      navigator.vibrate?.(duration)
    }
  }

  function play(sound: Sound) {
    const state = audio.current
    if (!state) return
    const requestedAt = performance.now()
    const requestId = ++state.requestId
    // Call resume during the user interaction, before awaiting decoding.
    const resumed = state.context.state === 'suspended' ? state.context.resume() : Promise.resolve()
    void Promise.all([state.buffers[sound], resumed])
      .then(([buffer]) => {
        // Drop stale requests, including those blocked until a later gesture or unmount.
        if (
          !buffer ||
          audio.current !== state ||
          requestId !== state.requestId ||
          performance.now() - requestedAt > MAX_PLAY_DELAY_MS ||
          state.context.state !== 'running'
        ) {
          return
        }
        const source = state.context.createBufferSource()
        const gain = state.context.createGain()
        source.buffer = buffer
        gain.gain.value = 0.65
        source.connect(gain)
        gain.connect(state.context.destination)
        source.onended = () => {
          source.disconnect()
          gain.disconnect()
        }
        source.start()
      })
      .catch(() => {
        // Audio failure must never interrupt note operations.
      })
  }

  function peel() {
    vibrate(PEEL_VIBRATION_MS)
    play('peel')
  }

  function remove() {
    play('remove')
  }

  function stick() {
    vibrate(STICK_VIBRATION_MS)
  }

  return { peel, stick, remove }
}
