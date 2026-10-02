import type { Color, Note } from './noteTypes'

type NoteDto = {
  id: string
  color: Color
  text: string
  x: number
  y: number
  mobileX: number | null
  mobileY: number | null
  angle: number
  z: number
}

type NotePayload = Omit<NoteDto, 'id'>

class NoteApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

function fromDto(note: NoteDto): Note {
  return {
    id: note.id,
    color: note.color,
    text: note.text,
    x: note.x,
    y: note.y,
    ...(note.mobileX !== null && note.mobileY !== null
      ? { mobilePlacement: { x: note.mobileX, y: note.mobileY } }
      : {}),
    angle: note.angle,
    z: note.z,
  }
}

function toPayload(note: Note): NotePayload {
  return {
    color: note.color,
    text: note.text,
    x: note.x,
    y: note.y,
    mobileX: note.mobilePlacement?.x ?? null,
    mobileY: note.mobilePlacement?.y ?? null,
    angle: note.angle,
    z: note.z ?? 0,
  }
}

async function readResponse<T>(response: Response): Promise<T> {
  const body: unknown = await response.json()
  if (!response.ok) {
    const message =
      typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
        ? body.error
        : '付箋の保存に失敗しました'
    throw new NoteApiError(response.status, message)
  }
  return body as T
}

export async function fetchNotes() {
  const response = await fetch('/api/notes')
  const body = await readResponse<{ notes: NoteDto[] }>(response)
  return body.notes.map(fromDto)
}

export async function createNote(note: Note) {
  const response = await fetch('/api/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: note.id, ...toPayload(note) }),
  })

  // A previous partial sync may already have created this note. Updating it
  // makes retries idempotent without accepting another user's colliding ID.
  if (response.status === 409) return updateNote(note)
  await readResponse<{ note: NoteDto }>(response)
}

export async function updateNote(note: Note) {
  const response = await fetch(`/api/notes/${encodeURIComponent(note.id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toPayload(note)),
  })
  await readResponse<{ note: NoteDto }>(response)
}

export async function deleteNote(id: string) {
  const response = await fetch(`/api/notes/${encodeURIComponent(id)}`, { method: 'DELETE' })
  // Deleting an already-deleted note is the desired final state on a retry.
  if (response.status === 404) return
  await readResponse<{ id: string }>(response)
}
