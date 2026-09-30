import { useEffect, useRef } from 'react'

const SOUNDS = { peel: '/sounds/peel.mp3', remove: '/sounds/delete.mp3' } as const
type Sound = keyof typeof SOUNDS
const STICK_VIBRATION_MS = 12
const PEEL_VIBRATION_MS = 28

export function useNoteFeedback() {
  const audio = useRef<{
    context: AudioContext
    buffers: Partial<Record<Sound, AudioBuffer>>
  } | null>(null)

  useEffect(() => {
    if (typeof AudioContext === 'undefined') return
    const context = new AudioContext()
    const state = { context, buffers: {} as Partial<Record<Sound, AudioBuffer>> }
    const controller = new AbortController()
    audio.current = state

    // Decode each sound independently so one failed asset does not disable the other.
    for (const sound of Object.keys(SOUNDS) as Sound[]) {
      void fetch(SOUNDS[sound], { signal: controller.signal })
        .then((response) => {
          if (!response.ok) throw new Error('Note sound unavailable')
          return response.arrayBuffer()
        })
        .then((data) => context.decodeAudioData(data))
        .then((buffer) => {
          state.buffers[sound] = buffer
        })
        .catch(() => {
          // Sound is optional; loading failure must never interrupt note operations.
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
    const buffer = state?.buffers[sound]
    // Do not queue sounds while autoplay is blocked: they would play on a later tap.
    if (!state || !buffer || state.context.state !== 'running') return
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
