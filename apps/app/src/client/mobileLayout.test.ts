import { expect, it } from 'vite-plus/test'
import { layoutMobileNotes, mobileBounds, mobileNoteSize, placeMobileNote } from './mobileLayout'

function expectReadable(notes: ReturnType<typeof layoutMobileNotes>, width: number) {
  const size = mobileNoteSize(width)
  const rectangles = notes.map((note) => mobileBounds(note, size))
  for (const [index, rect] of rectangles.entries()) {
    expect(rect.left).toBeGreaterThanOrEqual(14 - 0.001)
    expect(rect.right).toBeLessThanOrEqual(width - 14 + 0.001)
    expect(rect.top).toBeGreaterThanOrEqual(14 - 0.001)
    const covered = rectangles.reduce((area, other, otherIndex) => {
      if (index === otherIndex) return area
      return (
        area +
        Math.max(0, Math.min(rect.right, other.right) - Math.max(rect.left, other.left)) *
          Math.max(0, Math.min(rect.bottom, other.bottom) - Math.max(rect.top, other.top))
      )
    }, 0)
    expect(covered / (size * size)).toBeLessThanOrEqual(0.300001)
  }
}

it.each([320, 390, 430, 700])('keeps crowded rotated notes readable at %ipx', (width) => {
  const notes = Array.from({ length: 24 }, (_, index) => ({
    id: String(index),
    angle: -(index % 6),
    mobilePlacement: { x: ((index % 3) * width) / 3, y: (index % 4) * 30 },
  }))
  const layout = layoutMobileNotes(notes, width)
  expect(mobileNoteSize(width)).toBeCloseTo((width * 3) / 5)
  expectReadable(layout, width)
  expect(
    layoutMobileNotes(
      layout.map((note) => ({ ...note, mobilePlacement: note })),
      width,
    ),
  ).toEqual(layout)
})

it('keeps a safe drop unchanged and limits overlap when dropping onto another note', () => {
  const note = { id: 'a', angle: -4 }
  const first = placeMobileNote(note, { x: 70, y: 30 }, [], 390)
  const other = { id: 'b', angle: -3 }
  expect(placeMobileNote(other, { x: 80, y: 400 }, [first], 390)).toMatchObject({ x: 80, y: 400 })
  const dropped = placeMobileNote(other, first, [first], 390)
  expect(dropped.y).toBeGreaterThan(first.y)
  expectReadable([first, dropped], 390)
})

it('reflows saved placements when the viewport changes and after deletion', () => {
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
    expectReadable(layoutMobileNotes(saved, width), width)
    expectReadable(
      layoutMobileNotes(
        saved.filter((note) => note.id !== '2'),
        width,
      ),
      width,
    )
  }
})
