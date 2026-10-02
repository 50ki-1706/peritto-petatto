/** @jsxImportSource react */
import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef, useState, type PointerEvent, type KeyboardEvent } from 'react'
import { AuthGate } from './AuthGate'
import { styles, paperStyles, foldStyles } from './board.styles'
import { initialNotes, palette, useNoteStore, type Color, type Note } from './stores/noteStore'
import { useNoteFeedback } from './useNoteFeedback'
import { useCenteredEditor } from './useCenteredEditor'
import {
  layoutMobileNotes,
  mobileBounds,
  mobileNoteSize,
  placeMobileNote,
  type Position,
} from './mobileLayout'

type DeleteSide = 'left' | 'right'
type Drag = {
  mode: 'new' | 'move'
  note: Note
  startX: number
  startY: number
  moved: boolean
  pointerId: number
  mobileOrigin?: Position
}

const NOTE_SIZE = 206
const MOBILE_QUERY = '(max-width: 700px)'
const MOBILE_DRAG_THRESHOLD = 12
const DESKTOP_DRAG_THRESHOLD = 5
const MOBILE_DOUBLE_TAP_MS = 500
const DESKTOP_DOUBLE_TAP_MS = 350

function NoteBoard() {
  const feedback = useNoteFeedback()
  const notes = useNoteStore((state) => state.notes)
  const setNotes = useNoteStore((state) => state.setNotes)
  const [preview, setPreview] = useState<Note | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [deleteSide, setDeleteSide] = useState<DeleteSide | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [focusId, setFocusId] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [viewportWidth, setViewportWidth] = useState(390)
  const [mobileDragPosition, setMobileDragPosition] = useState<Position | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const boardRef = useRef<HTMLElement>(null)
  const dockRef = useRef<HTMLElement>(null)
  const editors = useRef(new Map<string, HTMLTextAreaElement>())
  const drag = useRef<Drag | null>(null)
  const lastTap = useRef<{ id: string; time: number; x: number; y: number } | null>(null)
  const suppressClick = useRef(false)
  const sheetGesture = useRef<{ y: number; moved: boolean } | null>(null)
  const topZ = useRef(initialNotes.length)

  const mobileLayout = layoutMobileNotes(notes, viewportWidth)
  const mobilePositions = new Map(mobileLayout.map((note) => [note.id, note]))
  const mobileHeight =
    Math.max(
      0,
      ...mobileLayout.map((note) => mobileBounds(note, mobileNoteSize(viewportWidth)).bottom),
    ) + 164

  useCenteredEditor(focusId, isMobile, editors)

  useEffect(() => {
    if (focusId) editors.current.get(focusId)?.focus({ preventScroll: isMobile })
  }, [focusId, isMobile])

  useEffect(() => {
    const cancelOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        cancelDrag()
        setIsSheetOpen(false)
      }
    }
    window.addEventListener('keydown', cancelOnEscape)
    return () => window.removeEventListener('keydown', cancelOnEscape)
  }, [])

  useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY)
    const updateViewport = () => {
      cancelDrag()
      setIsMobile(media.matches)
      setViewportWidth(window.innerWidth)
      if (!media.matches) {
        setIsSheetOpen(false)
        setNotes((current) => current.map(constrain))
      }
    }
    updateViewport()
    window.addEventListener('resize', updateViewport)
    return () => window.removeEventListener('resize', updateViewport)
  }, [])

  function constrain(note: Note): Note {
    const board = boardRef.current
    if (!board) return note
    return {
      ...note,
      x: Math.max(14, Math.min(board.clientWidth - NOTE_SIZE - 14, note.x)),
      y: Math.max(
        14,
        Math.min(
          board.clientHeight - NOTE_SIZE - 14,
          (window.matchMedia(MOBILE_QUERY).matches
            ? board.clientHeight
            : (dockRef.current?.offsetTop ?? board.clientHeight) - 14) - NOTE_SIZE,
          note.y,
        ),
      ),
    }
  }

  function bringToFront(id: string) {
    const z = ++topZ.current
    // Keep DOM order stable so editing and pointer capture are preserved.
    setNotes((current) => current.map((note) => (note.id === id ? { ...note, z } : note)))
  }

  function addNote(note: Note) {
    const z = ++topZ.current
    // The mobile page can be much taller than the desktop board. Store a desktop
    // position based on the visible drop location, independent of page scrolling.
    const desktopPosition =
      isMobile && note.mobilePlacement
        ? {
            x: note.mobilePlacement.x,
            y: Math.max(14, note.mobilePlacement.y - window.scrollY),
          }
        : {}
    setNotes((current) => {
      const next = constrain({ ...note, ...desktopPosition, z })
      return [...current, next]
    })
    setFocusId(note.id)
    feedback.stick()
  }

  function newNote(color: Color, x: number, y: number): Note {
    // randomUUID is unavailable on HTTP LAN URLs used for phone testing.
    const id = Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join('')
    return { id, color, text: '', x, y, angle: -3 }
  }

  function mobilePlacement(clientX: number, clientY: number) {
    const board = boardRef.current!
    const rect = board.getBoundingClientRect()
    const size = mobileNoteSize(window.innerWidth)
    return {
      x: Math.max(12, Math.min(board.clientWidth - size - 12, clientX - rect.left - size / 2)),
      y: Math.max(18, clientY - rect.top - 44),
    }
  }

  function positionMobileNote(current: Note[], id: string, desired: Position): Note[] {
    const note = current.find((item) => item.id === id)!
    const placed = placeMobileNote(note, desired, window.innerWidth)
    return current.map((item) => (item.id === id ? { ...item, mobilePlacement: placed } : item))
  }

  function startNew(event: PointerEvent<HTMLButtonElement>, color: Color) {
    if (event.button !== 0 || drag.current) return
    const rect = boardRef.current!.getBoundingClientRect()
    suppressClick.current = false
    drag.current = {
      mode: 'new',
      note: newNote(
        color,
        event.clientX - rect.left - NOTE_SIZE / 2,
        event.clientY - rect.top - 30,
      ),
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      pointerId: event.pointerId,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function startMove(event: PointerEvent<HTMLElement>, note: Note) {
    if (event.button !== 0 || !event.isPrimary || drag.current) return
    if (focusId === note.id && event.target === editors.current.get(note.id)) return
    event.preventDefault()
    setFocusId(null)
    event.currentTarget.focus({ preventScroll: true })
    setAnnouncement('')
    drag.current = {
      mode: 'move',
      note,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      pointerId: event.pointerId,
      mobileOrigin: isMobile ? mobilePositions.get(note.id) : undefined,
    }
    bringToFront(note.id)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function deletionTarget(active: Drag, clientX: number, clientY: number): DeleteSide | null {
    if (active.mode !== 'move' || !active.moved) return null
    const board = boardRef.current!.getBoundingClientRect()
    if (clientY < Math.max(0, board.top) || clientY > Math.min(window.innerHeight, board.bottom)) {
      return null
    }
    const edgeWidth = Math.min(112, Math.max(56, window.innerWidth * 0.14))
    const dx = clientX - active.startX
    // Require an intentional sideways pull, even if the gesture starts near an edge.
    if (dx <= -24 && clientX <= board.left + edgeWidth) return 'left'
    if (dx >= 24 && clientX >= board.right - edgeWidth) return 'right'
    return null
  }

  function deleteNote(id: string) {
    feedback.remove()
    setNotes((current) => current.filter((note) => note.id !== id))
    setFocusId((current) => (current === id ? null : current))
    setAnnouncement('付箋を削除しました')
  }

  function move(event: PointerEvent<HTMLElement>) {
    const active = drag.current
    if (!active || active.pointerId !== event.pointerId) return
    const dx = event.clientX - active.startX
    const dy = event.clientY - active.startY
    const dragThreshold = isMobile ? MOBILE_DRAG_THRESHOLD : DESKTOP_DRAG_THRESHOLD
    if (!active.moved && Math.hypot(dx, dy) < dragThreshold) return
    if (!active.moved) feedback.peel()
    active.moved = true
    lastTap.current = null
    setDeleteSide(deletionTarget(active, event.clientX, event.clientY))

    if (isMobile && active.mode === 'move') {
      setDraggingId(active.note.id)
      setMobileDragPosition({
        x: active.mobileOrigin!.x + dx,
        y: Math.max(14, active.mobileOrigin!.y + dy),
      })
      return
    }

    const next = { ...active.note, x: active.note.x + dx, y: active.note.y + dy }
    if (active.mode === 'new') {
      setPreview(
        isMobile
          ? { ...next, mobilePlacement: mobilePlacement(event.clientX, event.clientY) }
          : next,
      )
    } else {
      setDraggingId(next.id)
      setNotes((current) =>
        current.map((note) => (note.id === next.id ? { ...note, x: next.x, y: next.y } : note)),
      )
    }
  }

  function finish(event: PointerEvent<HTMLElement>) {
    const active = drag.current
    if (!active || active.pointerId !== event.pointerId) return
    if (active.mode === 'move' && active.moved) {
      if (deletionTarget(active, event.clientX, event.clientY)) {
        deleteNote(active.note.id)
      } else {
        feedback.stick()
        // Keep ordinary drops on the board; only dragging can cross its edges.
        const dx = event.clientX - active.startX
        const dy = event.clientY - active.startY
        setNotes((current) =>
          isMobile
            ? positionMobileNote(current, active.note.id, {
                x: active.mobileOrigin!.x + dx,
                y: active.mobileOrigin!.y + dy,
              })
            : current.map((note) =>
                note.id === active.note.id
                  ? constrain({ ...note, x: active.note.x + dx, y: active.note.y + dy })
                  : note,
              ),
        )
      }
    }
    if (isMobile && active.mode === 'new' && !active.moved) {
      suppressClick.current = true
      addNote({
        ...active.note,
        mobilePlacement: mobilePlacement(window.innerWidth / 2, 80),
      })
      setIsSheetOpen(false)
    }
    if (active.mode === 'new' && active.moved) {
      suppressClick.current = true
      const rect = boardRef.current!.getBoundingClientRect()
      const dock = dockRef.current!.getBoundingClientRect()
      const overDock =
        event.clientX >= dock.left &&
        event.clientX <= dock.right &&
        event.clientY >= dock.top &&
        event.clientY <= dock.bottom
      if (
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom &&
        !overDock
      ) {
        addNote({
          ...active.note,
          x: active.note.x + event.clientX - active.startX,
          y: active.note.y + event.clientY - active.startY,
          ...(isMobile && {
            mobilePlacement: mobilePlacement(event.clientX, event.clientY),
          }),
        })
        if (isMobile) setIsSheetOpen(false)
      }
    }
    drag.current = null
    setPreview(null)
    setDraggingId(null)
    setMobileDragPosition(null)
    setDeleteSide(null)
    event.currentTarget.releasePointerCapture(event.pointerId)
    if (active.mode === 'move' && !active.moved) {
      const previous = lastTap.current
      if (
        previous?.id === active.note.id &&
        event.timeStamp - previous.time <=
          (isMobile ? MOBILE_DOUBLE_TAP_MS : DESKTOP_DOUBLE_TAP_MS) &&
        Math.hypot(event.clientX - previous.x, event.clientY - previous.y) <= 24
      ) {
        lastTap.current = null
        setFocusId(active.note.id)
      } else {
        lastTap.current = {
          id: active.note.id,
          time: event.timeStamp,
          x: event.clientX,
          y: event.clientY,
        }
      }
    }
  }

  function cancelDrag() {
    const active = drag.current
    if (active) lastTap.current = null
    if (active?.mode === 'move') {
      setNotes((current) =>
        current.map((note) =>
          note.id === active.note.id
            ? {
                ...note,
                x: active.note.x,
                y: active.note.y,
              }
            : note,
        ),
      )
    }
    if (active?.mode === 'new') suppressClick.current = true
    drag.current = null
    setPreview(null)
    setDraggingId(null)
    setMobileDragPosition(null)
    setDeleteSide(null)
  }

  function moveWithKeyboard(event: KeyboardEvent<HTMLElement>, note: Note) {
    if (event.target !== event.currentTarget) return
    if ((event.key === 'Enter' || event.key === ' ') && !drag.current) {
      event.preventDefault()
      setFocusId(note.id)
      return
    }
    if (event.key === 'Delete' && !drag.current) {
      event.preventDefault()
      const index = notes.findIndex((item) => item.id === note.id)
      const nextNote = notes[index + 1] ?? notes[index - 1]
      deleteNote(note.id)
      if (nextNote) editors.current.get(nextNote.id)?.closest('article')?.focus()
      else
        dockRef.current
          ?.querySelector<HTMLButtonElement>(isMobile ? 'button' : '#note-palette button')
          ?.focus()
      return
    }
    const step = event.shiftKey ? 30 : 10
    const offsets: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }
    const offset = offsets[event.key]
    if (!offset) return
    event.preventDefault()
    setNotes((current) => {
      if (isMobile) {
        const origin = mobilePositions.get(note.id)!
        return positionMobileNote(current, note.id, {
          x: origin.x + offset[0],
          y: origin.y + offset[1],
        })
      }
      return current.map((item) =>
        item.id === note.id
          ? constrain({ ...item, x: item.x + offset[0], y: item.y + offset[1] })
          : item,
      )
    })
  }

  return (
    <main
      ref={boardRef}
      {...stylex.props(
        styles.app,
        styles.board,
        isMobile && styles.mobileBoardHeight(mobileHeight),
      )}
      aria-label="付箋ボード"
    >
      {notes.map((note, index) => (
        <article
          key={note.id}
          {...stylex.props(
            styles.note,
            focusId !== note.id && styles.draggable,
            paperStyles[note.color],
            styles.position(note.x, note.y, note.angle, note.z ?? index + 1),
            draggingId === note.id && styles.lifted,
            draggingId === note.id && styles.layer(topZ.current + 2),
            styles.mobileNote,
            styles.mobilePlaced(
              (draggingId === note.id && mobileDragPosition
                ? mobileDragPosition
                : mobilePositions.get(note.id)!
              ).x,
              (draggingId === note.id && mobileDragPosition
                ? mobileDragPosition
                : mobilePositions.get(note.id)!
              ).y,
            ),
            isMobile && focusId === note.id && styles.layer(topZ.current + 2),
          )}
          tabIndex={focusId === note.id ? -1 : 0}
          aria-label={`${palette.find((color) => color.id === note.color)!.label}の付箋`}
          aria-keyshortcuts="Enter Space ArrowLeft ArrowRight ArrowUp ArrowDown Delete"
          title="どこでもドラッグで移動。ダブルタップで編集。矢印キーで移動、Enterで編集、Deleteで削除"
          onKeyDown={(event) => moveWithKeyboard(event, note)}
          onPointerDown={(event) => startMove(event, note)}
          onPointerMove={move}
          onPointerUp={finish}
          onPointerCancel={cancelDrag}
          onLostPointerCapture={cancelDrag}
        >
          <textarea
            data-note-editor
            ref={(element) => {
              if (element) editors.current.set(note.id, element)
              else editors.current.delete(note.id)
            }}
            {...stylex.props(styles.editor, focusId !== note.id && styles.inactiveEditor)}
            readOnly={focusId !== note.id}
            tabIndex={focusId === note.id ? 0 : -1}
            aria-label={`${palette.find((color) => color.id === note.color)!.label}の付箋のテキスト`}
            spellCheck={false}
            value={note.text}
            onFocus={() => bringToFront(note.id)}
            onBlur={() => setFocusId((current) => (current === note.id ? null : current))}
            onKeyDown={(event) => {
              if (event.key === 'Escape' && !event.nativeEvent.isComposing) {
                event.currentTarget.closest('article')?.focus()
              }
            }}
            onChange={(event) =>
              setNotes((current) =>
                current.map((item) =>
                  item.id === note.id ? { ...item, text: event.target.value } : item,
                ),
              )
            }
          />
          <span {...stylex.props(styles.fold, foldStyles[note.color])} aria-hidden="true" />
        </article>
      ))}

      <div role="status" {...stylex.props(styles.srOnly)}>
        {deleteSide ? '離すと付箋を削除します。戻すとキャンセルできます' : announcement}
      </div>
      {deleteSide && (
        <div
          aria-hidden="true"
          data-delete-side={deleteSide}
          {...stylex.props(
            styles.deleteZone,
            deleteSide === 'left' ? styles.deleteLeft : styles.deleteRight,
            styles.layer(topZ.current + 3),
          )}
        >
          <div {...stylex.props(styles.deleteLabel)}>
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6M14 10v6" />
            </svg>
            <span>離すと削除</span>
          </div>
        </div>
      )}

      {preview && (
        <div
          aria-hidden="true"
          {...stylex.props(
            styles.note,
            paperStyles[preview.color],
            styles.position(preview.x, preview.y, -7, topZ.current + 2),
            styles.lifted,
            styles.preview,
            preview.mobilePlacement && styles.mobileNote,
            preview.mobilePlacement &&
              styles.mobilePlaced(preview.mobilePlacement.x, preview.mobilePlacement.y),
          )}
        >
          <span {...stylex.props(styles.fold, foldStyles[preview.color])} />
        </div>
      )}

      <footer
        ref={dockRef}
        {...stylex.props(
          styles.dock,
          styles.layer(topZ.current + 1),
          isSheetOpen && styles.openDock,
        )}
      >
        <p {...stylex.props(styles.count)}>{notes.length} 枚の付箋</p>
        <button
          type="button"
          {...stylex.props(styles.sheetHandle)}
          aria-expanded={isSheetOpen}
          aria-controls="note-palette"
          onPointerDown={(event) => {
            if (event.button !== 0) return
            sheetGesture.current = { y: event.clientY, moved: false }
            event.currentTarget.setPointerCapture(event.pointerId)
          }}
          onPointerMove={(event) => {
            const gesture = sheetGesture.current
            if (!gesture || Math.abs(event.clientY - gesture.y) < 20) return
            gesture.moved = true
            setIsSheetOpen(event.clientY < gesture.y)
          }}
          onPointerUp={() => {
            if (sheetGesture.current && !sheetGesture.current.moved) {
              setIsSheetOpen((open) => !open)
            }
            sheetGesture.current = null
          }}
          onPointerCancel={() => {
            sheetGesture.current = null
          }}
          onClick={(event) => {
            // Pointer activation is handled on release; retain keyboard activation.
            if (event.detail === 0) setIsSheetOpen((open) => !open)
          }}
        >
          <span {...stylex.props(styles.sheetGrip)} aria-hidden="true" />
          <span>付箋を取り出す</span>
          <span {...stylex.props(styles.sheetCount)}>{notes.length} 枚</span>
          <span
            {...stylex.props(styles.chevron, isSheetOpen && styles.openChevron)}
            aria-hidden="true"
          />
        </button>
        <div
          id="note-palette"
          {...stylex.props(styles.tray, isSheetOpen && styles.openTray)}
          aria-label="付箋の色を選んで追加"
          aria-hidden={isMobile && !isSheetOpen}
        >
          {palette.map((color) => (
            <button
              key={color.id}
              type="button"
              tabIndex={isMobile && !isSheetOpen ? -1 : undefined}
              aria-label={`${color.label}の付箋を追加`}
              {...stylex.props(styles.swatch, paperStyles[color.id])}
              onPointerDown={(event) => startNew(event, color.id)}
              onMouseDown={(event) => {
                // A touch-generated mouse event must not steal the new editor's focus.
                if (isMobile) event.preventDefault()
              }}
              onPointerMove={move}
              onPointerUp={finish}
              onPointerCancel={cancelDrag}
              onLostPointerCapture={cancelDrag}
              onClick={() => {
                if (suppressClick.current) {
                  suppressClick.current = false
                  return
                }
                const offset = (notes.length % 5) * 24
                addNote({
                  ...newNote(
                    color.id,
                    (boardRef.current!.clientWidth - NOTE_SIZE) / 2 + offset,
                    170 + offset,
                  ),
                  ...(isMobile && {
                    mobilePlacement: mobilePlacement(window.innerWidth / 2, 80),
                  }),
                })
                if (isMobile) setIsSheetOpen(false)
              }}
            >
              <span {...stylex.props(styles.swatchLine)} aria-hidden="true" />
              <span {...stylex.props(styles.fold, foldStyles[color.id])} aria-hidden="true" />
            </button>
          ))}
        </div>
      </footer>
    </main>
  )
}

export function App() {
  return (
    <AuthGate>
      <NoteBoard />
    </AuthGate>
  )
}
