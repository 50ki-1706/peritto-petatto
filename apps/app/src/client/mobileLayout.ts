export const MOBILE_NOTE_RATIO = 0.6
const EDGE = 14

export type Position = { x: number; y: number }
type MobileNote = { id: string; angle: number; mobilePlacement?: Position }
type PlacedNote = Position & { id: string; angle: number }

export function mobileNoteSize(width: number) {
  return width * MOBILE_NOTE_RATIO
}

/** Include the rotated corners when keeping tilted paper inside the viewport. */
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

export function placeMobileNote(note: MobileNote, desired: Position, width: number): PlacedNote {
  const size = mobileNoteSize(width)
  const extents = mobileBounds({ x: 0, y: 0, angle: note.angle }, size)
  return {
    id: note.id,
    angle: note.angle,
    x: Math.max(EDGE - extents.left, Math.min(width - EDGE - extents.right, desired.x)),
    y: Math.max(EDGE - extents.top, desired.y),
  }
}

export function layoutMobileNotes(notes: MobileNote[], width: number): PlacedNote[] {
  const size = mobileNoteSize(width)
  return notes.map((note, index) =>
    placeMobileNote(
      note,
      note.mobilePlacement ?? {
        x: (width - size) / 2,
        y: 24 + index * (size + 22),
      },
      width,
    ),
  )
}
