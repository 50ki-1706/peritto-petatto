/** @jsxImportSource react */
import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef, useState, type PointerEvent, type KeyboardEvent } from 'react'
import { styles, paperStyles } from './board.styles'

const palette = [
  { id: 'yellow', label: 'きいろ' },
  { id: 'pink', label: 'ももいろ' },
  { id: 'blue', label: 'みずいろ' },
  { id: 'green', label: 'みどり' },
  { id: 'purple', label: 'むらさき' },
  { id: 'orange', label: 'だいだい' },
] as const

type Color = (typeof palette)[number]['id']
type Note = {
  id: string
  color: Color
  text: string
  x: number
  y: number
  mobileX?: number
  mobileY?: number
  mobilePlacement?: { x: number; y: number }
  angle: number
  z?: number
}
type Drag = {
  mode: 'new' | 'move'
  note: Note
  startX: number
  startY: number
  moved: boolean
  pointerId: number
  mobileBounds?: { minX: number; maxX: number; minY: number }
}

const NOTE_SIZE = 206
const MOBILE_QUERY = '(max-width: 700px)'
const initialNotes: Note[] = [
  {
    id: 'welcome-1',
    color: 'yellow',
    text: '企画書\nたたき台を\nつくる！',
    x: 60,
    y: 78,
    angle: -4,
  },
  { id: 'welcome-2', color: 'pink', text: '明日\n打ち合わせ\n10:00〜', x: 318, y: 65, angle: -5 },
  { id: 'welcome-3', color: 'blue', text: 'デザイン\nチェック\n\n✓  ✓', x: 576, y: 76, angle: -3 },
  {
    id: 'welcome-4',
    color: 'green',
    text: '買い出し\n・たまねぎ\n・にんじん\n・牛乳\n・たまご',
    x: 834,
    y: 65,
    angle: -4,
  },
  {
    id: 'welcome-5',
    color: 'purple',
    text: 'やりたいこと\n\n・旅行の計画\n・ホテル予約\n・持ち物リスト',
    x: 84,
    y: 326,
    angle: -5,
  },
  {
    id: 'welcome-6',
    color: 'orange',
    text: '資料作成\n\n・スライド\n・データ整理',
    x: 342,
    y: 313,
    angle: -4,
  },
  {
    id: 'welcome-7',
    color: 'yellow',
    text: '週末の予定\n\n土曜  サッカー\n日曜  お買い物',
    x: 600,
    y: 327,
    angle: -4,
  },
  {
    id: 'welcome-8',
    color: 'pink',
    text: 'アイデア\n\n付箋アプリ\nいい感じに！',
    x: 858,
    y: 316,
    angle: -5,
  },
]

export function App() {
  const [notes, setNotes] = useState(initialNotes)
  const [preview, setPreview] = useState<Note | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [focusId, setFocusId] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const boardRef = useRef<HTMLElement>(null)
  const dockRef = useRef<HTMLElement>(null)
  const editors = useRef(new Map<string, HTMLTextAreaElement>())
  const drag = useRef<Drag | null>(null)
  const suppressClick = useRef(false)
  const sheetGesture = useRef<{ y: number; moved: boolean } | null>(null)
  const topZ = useRef(initialNotes.length)

  useEffect(() => {
    if (focusId) editors.current.get(focusId)?.focus()
  }, [focusId])

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
      setIsMobile(media.matches)
      if (!media.matches) setIsSheetOpen(false)
    }
    updateViewport()
    media.addEventListener('change', updateViewport)
    return () => media.removeEventListener('change', updateViewport)
  }, [])

  function constrain(note: Note): Note {
    const board = boardRef.current
    if (!board) return note
    return {
      ...note,
      x: Math.max(14, Math.min(board.clientWidth - NOTE_SIZE - 14, note.x)),
      y: Math.max(14, Math.min(board.clientHeight - NOTE_SIZE - 14, note.y)),
    }
  }

  function bringToFront(id: string) {
    const z = ++topZ.current
    // Keep DOM order stable so editing and pointer capture are preserved.
    setNotes((current) => current.map((note) => (note.id === id ? { ...note, z } : note)))
  }

  function addNote(note: Note) {
    const z = ++topZ.current
    setNotes((current) => [...current, constrain({ ...note, z })])
    setFocusId(note.id)
  }

  function newNote(color: Color, x: number, y: number): Note {
    return { id: crypto.randomUUID(), color, text: '', x, y, angle: -3 }
  }

  function mobilePlacement(clientX: number, clientY: number) {
    const board = boardRef.current!
    const rect = board.getBoundingClientRect()
    const size = Math.min(window.innerWidth * 0.88, 360)
    return {
      x: Math.max(12, Math.min(board.clientWidth - size - 12, clientX - rect.left - size / 2)),
      y: Math.max(18, clientY - rect.top - 44),
    }
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

  function startMove(event: PointerEvent<HTMLButtonElement>, note: Note) {
    if (event.button !== 0 || drag.current) return
    const noteRect = event.currentTarget.closest('article')?.getBoundingClientRect()
    drag.current = {
      mode: 'move',
      note,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      pointerId: event.pointerId,
      mobileBounds:
        isMobile && noteRect
          ? {
              minX: 10 - noteRect.left,
              maxX: window.innerWidth - 10 - noteRect.right,
              minY: 10 - noteRect.top - window.scrollY,
            }
          : undefined,
    }
    bringToFront(note.id)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function move(event: PointerEvent<HTMLButtonElement>) {
    const active = drag.current
    if (!active || active.pointerId !== event.pointerId) return
    const dx = event.clientX - active.startX
    const dy = event.clientY - active.startY
    if (!active.moved && Math.hypot(dx, dy) < 5) return
    active.moved = true

    if (isMobile && active.mode === 'move') {
      const mobileDx = active.mobileBounds
        ? Math.max(active.mobileBounds.minX, Math.min(active.mobileBounds.maxX, dx))
        : dx
      setDraggingId(active.note.id)
      setNotes((current) =>
        current.map((note) =>
          note.id === active.note.id
            ? {
                ...note,
                mobileX: (active.note.mobileX ?? 0) + mobileDx,
                mobileY:
                  (active.note.mobileY ?? 0) + Math.max(active.mobileBounds?.minY ?? -Infinity, dy),
              }
            : note,
        ),
      )
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
        current.map((note) =>
          note.id === next.id ? constrain({ ...note, x: next.x, y: next.y }) : note,
        ),
      )
    }
  }

  function finish(event: PointerEvent<HTMLButtonElement>) {
    const active = drag.current
    if (!active || active.pointerId !== event.pointerId) return
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
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  function cancelDrag() {
    const active = drag.current
    if (active?.mode === 'move') {
      setNotes((current) =>
        current.map((note) =>
          note.id === active.note.id
            ? {
                ...note,
                x: active.note.x,
                y: active.note.y,
                mobileX: active.note.mobileX,
                mobileY: active.note.mobileY,
              }
            : note,
        ),
      )
    }
    if (active?.mode === 'new') suppressClick.current = true
    drag.current = null
    setPreview(null)
    setDraggingId(null)
  }

  function moveWithKeyboard(event: KeyboardEvent<HTMLButtonElement>, note: Note) {
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
    setNotes((current) =>
      current.map((item) =>
        item.id === note.id
          ? isMobile
            ? {
                ...item,
                mobileX: (item.mobileX ?? 0) + offset[0],
                mobileY: (item.mobileY ?? 0) + offset[1],
              }
            : constrain({ ...item, x: item.x + offset[0], y: item.y + offset[1] })
          : item,
      ),
    )
  }

  return (
    <main ref={boardRef} {...stylex.props(styles.app, styles.board)} aria-label="付箋ボード">
      {notes.map((note, index) => (
        <article
          key={note.id}
          {...stylex.props(
            styles.note,
            paperStyles[note.color],
            styles.position(note.x, note.y, note.angle, note.z ?? index + 1),
            draggingId === note.id && styles.lifted,
            styles.mobileNote,
            styles.mobilePosition(note.mobileX ?? 0, note.mobileY ?? 0, note.angle),
            note.mobilePlacement &&
              styles.mobilePlaced(note.mobilePlacement.x, note.mobilePlacement.y),
          )}
        >
          <button
            type="button"
            {...stylex.props(styles.handle)}
            aria-label={`${palette.find((color) => color.id === note.color)!.label}の付箋を移動`}
            title="ドラッグ、または矢印キーで移動"
            onPointerDown={(event) => startMove(event, note)}
            onPointerMove={move}
            onPointerUp={finish}
            onPointerCancel={cancelDrag}
            onLostPointerCapture={cancelDrag}
            onKeyDown={(event) => moveWithKeyboard(event, note)}
          >
            <span {...stylex.props(styles.grip)} aria-hidden="true" />
          </button>
          <textarea
            ref={(element) => {
              if (element) editors.current.set(note.id, element)
              else editors.current.delete(note.id)
            }}
            {...stylex.props(styles.editor)}
            aria-label={`${palette.find((color) => color.id === note.color)!.label}の付箋のテキスト`}
            spellCheck={false}
            value={note.text}
            onFocus={() => bringToFront(note.id)}
            onChange={(event) =>
              setNotes((current) =>
                current.map((item) =>
                  item.id === note.id ? { ...item, text: event.target.value } : item,
                ),
              )
            }
          />
          <span {...stylex.props(styles.fold)} aria-hidden="true" />
        </article>
      ))}

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
          <span {...stylex.props(styles.fold)} />
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
              <span {...stylex.props(styles.fold)} aria-hidden="true" />
            </button>
          ))}
        </div>
      </footer>
    </main>
  )
}
