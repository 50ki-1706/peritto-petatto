import { useLayoutEffect, type RefObject } from 'react'
import { mobileNoteSize } from './mobileLayout'

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
    const root = document.documentElement
    const body = document.body
    const original = {
      position: note.style.position,
      left: note.style.left,
      top: note.style.top,
      margin: note.style.margin,
      width: note.style.width,
      height: note.style.height,
      transform: note.style.transform,
      translate: note.style.translate,
      rootOverflow: root.style.overflow,
      bodyOverflow: body.style.overflow,
    }
    let frame = 0
    const settleTimers: number[] = []

    const center = () => {
      const width = viewport?.width ?? window.innerWidth
      const height = viewport?.height ?? window.innerHeight
      const left = viewport?.offsetLeft ?? 0
      const top = viewport?.offsetTop ?? 0
      // Shrink the paper on short screens; the textarea still scrolls normally.
      const size = Math.max(1, Math.min(mobileNoteSize(window.innerWidth), width - 32, height - 32))
      // Fixed positioning keeps the editor independent from board scrolling. Use
      // absolute values instead of accumulating translations: iOS changes the
      // visual viewport while animating its software keyboard.
      note.style.position = 'fixed'
      note.style.left = `${left + (width - size) / 2}px`
      note.style.top = `${top + (height - size) / 2}px`
      note.style.margin = '0'
      note.style.width = `${size}px`
      note.style.height = `${size}px`
      note.style.transform = 'none'
      note.style.translate = 'none'
    }
    const scheduleCenter = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(center)
    }

    // Do not move the note during the pointerup that completes a double tap.
    // Moving it immediately makes iOS dispatch the following synthetic click to
    // the board underneath, which blurs the editor as soon as it opens.
    scheduleCenter()
    root.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    // Safari can focus the textarea before the keyboard animation has updated
    // visualViewport. These follow-up passes cover that transition even when a
    // resize event is skipped (notably after a drag-created note is focused).
    for (const delay of [100, 300, 600]) {
      settleTimers.push(window.setTimeout(scheduleCenter, delay))
    }
    viewport?.addEventListener('resize', scheduleCenter)
    viewport?.addEventListener('scroll', scheduleCenter)
    window.addEventListener('resize', scheduleCenter)
    window.addEventListener('scroll', scheduleCenter)
    return () => {
      cancelAnimationFrame(frame)
      for (const timer of settleTimers) window.clearTimeout(timer)
      viewport?.removeEventListener('resize', scheduleCenter)
      viewport?.removeEventListener('scroll', scheduleCenter)
      window.removeEventListener('resize', scheduleCenter)
      window.removeEventListener('scroll', scheduleCenter)
      Object.assign(note.style, {
        position: original.position,
        left: original.left,
        top: original.top,
        margin: original.margin,
        width: original.width,
        height: original.height,
        transform: original.transform,
        translate: original.translate,
      })
      root.style.overflow = original.rootOverflow
      body.style.overflow = original.bodyOverflow
    }
  }, [focusId, isMobile, editors])
}
