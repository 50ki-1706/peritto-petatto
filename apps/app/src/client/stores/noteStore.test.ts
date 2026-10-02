import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { createNote, deleteNote, fetchNotes, updateNote } from '../noteApi'
import type { Note } from '../noteTypes'
import { useNoteStore } from './noteStore'

vi.mock('../noteApi', () => ({
  createNote: vi.fn(),
  deleteNote: vi.fn(),
  fetchNotes: vi.fn(),
  updateNote: vi.fn(),
}))

const api = {
  createNote: vi.mocked(createNote),
  deleteNote: vi.mocked(deleteNote),
  fetchNotes: vi.mocked(fetchNotes),
  updateNote: vi.mocked(updateNote),
}

function note(id: string, text: string): Note {
  return { id, text, color: 'yellow', x: 0, y: 0, angle: 0, z: 0 }
}

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  api.createNote.mockResolvedValue(undefined)
  api.deleteNote.mockResolvedValue(undefined)
  api.updateNote.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
})

describe('noteStore synchronization', () => {
  it('records successful operations when another operation fails', async () => {
    const original = note('existing', 'before')
    const created = note('created', 'new')
    api.fetchNotes.mockResolvedValue([original])
    await useNoteStore.getState().initialize('partial-failure-user')

    api.updateNote.mockRejectedValueOnce(new Error('patch failed'))
    useNoteStore.getState().setNotes(() => [note('existing', 'after'), created])
    await vi.advanceTimersByTimeAsync(400)

    expect(useNoteStore.getState().syncStatus).toBe('error')

    useNoteStore.getState().setNotes((notes) => notes.filter(({ id }) => id !== created.id))
    useNoteStore.getState().retrySync()
    await vi.advanceTimersByTimeAsync(0)

    expect(api.deleteNote).toHaveBeenCalledWith(created.id)
    expect(useNoteStore.getState().syncStatus).toBe('saved')
  })

  it('waits for every request to settle before allowing a retry', async () => {
    const pendingPatch = deferred()
    api.fetchNotes.mockResolvedValue([note('slow', 'before'), note('failed', 'before')])
    await useNoteStore.getState().initialize('overlap-user')

    api.updateNote.mockImplementation(({ id }) => {
      if (id === 'slow') return pendingPatch.promise
      return Promise.reject(new Error('patch failed'))
    })
    useNoteStore
      .getState()
      .setNotes(() => [note('slow', 'first change'), note('failed', 'first change')])
    await vi.advanceTimersByTimeAsync(400)

    expect(useNoteStore.getState().syncStatus).toBe('saving')
    useNoteStore.getState().retrySync()
    await vi.advanceTimersByTimeAsync(0)
    expect(api.updateNote).toHaveBeenCalledTimes(2)

    pendingPatch.resolve()
    await vi.advanceTimersByTimeAsync(0)
    expect(useNoteStore.getState().syncStatus).toBe('error')
  })
})
