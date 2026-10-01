export const MOBILE_NOTE_RATIO = 0.6
const MAX_OVERLAP = 0.3
const EDGE = 14

export type Position = { x: number; y: number }
type MobileNote = { id: string; angle: number; mobilePlacement?: Position }
type PlacedNote = Position & { id: string; angle: number }

export function mobileNoteSize(width: number) {
  return width * MOBILE_NOTE_RATIO
}

/** Include the rotated corners so even tilted paper stays inside the overlap budget. */
export function mobileBounds(note: Position & { angle: number }, size: number) {
  const angle = (note.angle * Math.PI) / 180
  const corners = [
    [0, 0],
    [size, 0],
    [0, size],
    [size, size],
  ].map(([x, y]) => ({
    x: note.x + size / 2 + (x! - size / 2) * Math.cos(angle) - (y! - size / 4) * Math.sin(angle),
    y: note.y + size / 4 + (x! - size / 2) * Math.sin(angle) + (y! - size / 4) * Math.cos(angle),
  }))
  return {
    left: Math.min(...corners.map((p) => p.x)),
    right: Math.max(...corners.map((p) => p.x)),
    top: Math.min(...corners.map((p) => p.y)),
    bottom: Math.max(...corners.map((p) => p.y)),
  }
}

function overlap(a: ReturnType<typeof mobileBounds>, b: ReturnType<typeof mobileBounds>) {
  return (
    Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
    Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
  )
}

export function placeMobileNote(
  note: MobileNote,
  desired: Position,
  occupied: PlacedNote[],
  width: number,
): PlacedNote {
  const size = mobileNoteSize(width)
  const budget = size * size * MAX_OVERLAP
  const extents = mobileBounds({ x: 0, y: 0, angle: note.angle }, size)
  const placed = {
    id: note.id,
    angle: note.angle,
    x: Math.max(EDGE - extents.left, Math.min(width - EDGE - extents.right, desired.x)),
    y: Math.max(EDGE - extents.top, desired.y),
  }
  const bounds = occupied.map((other) => mobileBounds(other, size))
  // Sum all intersections, conservatively counting areas covered more than once.
  // This protects every note, including when several papers surround the same one.
  const used = bounds.map((a, i) =>
    bounds.reduce((total, b, j) => total + (i === j ? 0 : overlap(a, b)), 0),
  )
  for (;;) {
    const candidate = mobileBounds(placed, size)
    const overlaps = bounds.map((other) => overlap(candidate, other))
    if (
      overlaps.reduce((total, area) => total + area, 0) <= budget + 0.001 &&
      overlaps.every((area, i) => area + used[i]! <= budget + 0.001)
    )
      return placed
    // The board grows vertically, so there is always a valid position below the others.
    placed.y += Math.max(1, size * 0.05)
  }
}

export function layoutMobileNotes(notes: MobileNote[], width: number): PlacedNote[] {
  const size = mobileNoteSize(width)
  const placed: PlacedNote[] = []
  for (const [index, note] of notes.entries()) {
    placed.push(
      placeMobileNote(
        note,
        note.mobilePlacement ?? {
          x: (width - size) / 2,
          y: 24 + index * (size + 22),
        },
        placed,
        width,
      ),
    )
  }
  return placed
}
