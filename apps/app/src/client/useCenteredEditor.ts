import { useLayoutEffect, type RefObject } from 'react'

/** Keep the active mobile note inside the area above the software keyboard. */
export function useCenteredEditor(
  focusId: string | null,
  isMobile: boolean,
  editors: RefObject<Map<string, HTMLTextAreaElement>>,
) {
  useLayoutEffect(() => {
    if (!isMobile || !focusId) return
    const note = editors.current.get(focusId)?.closest('article')
    if (!note) return

    const viewport = window.visualViewport
    const original = {
      width: note.style.width,
      height: note.style.height,
      transform: note.style.transform,
      translate: note.style.translate,
    }
    let frame = 0
    let x = 0
    let y = 0

    const center = () => {
      const width = viewport?.width ?? window.innerWidth
      const height = viewport?.height ?? window.innerHeight
      // Shrink the paper on short screens; the textarea still scrolls normally.
      const size = Math.max(1, Math.min(window.innerWidth * 0.88, 360, width - 32, height - 32))
      note.style.width = `${size}px`
      note.style.height = `${size}px`
      note.style.transform = 'none'
      const rect = note.getBoundingClientRect()
      x += (viewport?.offsetLeft ?? 0) + width / 2 - (rect.left + rect.width / 2)
      y += (viewport?.offsetTop ?? 0) + height / 2 - (rect.top + rect.height / 2)
      note.style.translate = `${x}px ${y}px`
    }
    const scheduleCenter = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(center)
    }

    center()
    viewport?.addEventListener('resize', scheduleCenter)
    viewport?.addEventListener('scroll', scheduleCenter)
    window.addEventListener('resize', scheduleCenter)
    window.addEventListener('scroll', scheduleCenter)
    return () => {
      cancelAnimationFrame(frame)
      viewport?.removeEventListener('resize', scheduleCenter)
      viewport?.removeEventListener('scroll', scheduleCenter)
      window.removeEventListener('resize', scheduleCenter)
      window.removeEventListener('scroll', scheduleCenter)
      Object.assign(note.style, original)
    }
  }, [focusId, isMobile, editors])
}
