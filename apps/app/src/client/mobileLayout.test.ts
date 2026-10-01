import { expect, it } from 'vite-plus/test'
import { layoutMobileNotes, mobileBounds, mobileNoteSize, placeMobileNote } from './mobileLayout'

function expectInsideViewport(notes: ReturnType<typeof layoutMobileNotes>, width: number) {
  const size = mobileNoteSize(width)
  const rectangles = notes.map((note) => mobileBounds(note, size))
  for (const rect of rectangles) {
    expect(rect.left).toBeGreaterThanOrEqual(14 - 0.001)
    expect(rect.right).toBeLessThanOrEqual(width - 14 + 0.001)
    expect(rect.top).toBeGreaterThanOrEqual(14 - 0.001)
  }
}

it.each([320, 390, 430, 700])('keeps rotated notes inside a %ipx viewport', (width) => {
  const notes = Array.from({ length: 24 }, (_, index) => ({
    id: String(index),
    angle: -(index % 6),
    mobilePlacement: { x: ((index % 3) * width) / 3, y: (index % 4) * 30 },
  }))
  const layout = layoutMobileNotes(notes, width)
  expect(mobileNoteSize(width)).toBeCloseTo((width * 3) / 5)
  expectInsideViewport(layout, width)
  expect(
    layoutMobileNotes(
      layout.map((note) => ({ ...note, mobilePlacement: note })),
      width,
    ),
  ).toEqual(layout)
})

it('preserves a drop even when it fully overlaps another note', () => {
  const note = { id: 'a', angle: -4 }
  const first = placeMobileNote(note, { x: 70, y: 30 }, 390)
  const other = { id: 'b', angle: -3 }
  expect(placeMobileNote(other, { x: 80, y: 400 }, 390)).toMatchObject({ x: 80, y: 400 })
  const dropped = placeMobileNote(other, first, 390)
  expect(dropped).toMatchObject({ x: first.x, y: first.y })
})

it('only clamps saved placements when the viewport changes', () => {
  const original = layoutMobileNotes(
    Array.from({ length: 12 }, (_, i) => ({
      id: String(i),
      angle: -5,
      mobilePlacement: { x: 600, y: 10 },
    })),
    700,
  )
  const saved = original.map((note) => ({ ...note, mobilePlacement: note }))
  for (const width of [320, 430, 700]) {
    expectInsideViewport(layoutMobileNotes(saved, width), width)
    expectInsideViewport(
      layoutMobileNotes(
        saved.filter((note) => note.id !== '2'),
        width,
      ),
      width,
    )
  }
})
