import { create } from 'zustand'
import { createNote, deleteNote, fetchNotes, updateNote } from '../noteApi'
import type { Note } from '../noteTypes'

export { palette, type Color, type Note } from '../noteTypes'

type NotesUpdater = (current: Note[]) => Note[]
type LoadStatus = 'idle' | 'loading' | 'ready' | 'error'
type SyncStatus = 'idle' | 'saving' | 'saved' | 'error'

type NoteStore = {
  notes: Note[]
  userId: string | null
  loadStatus: LoadStatus
  syncStatus: SyncStatus
  error: string
  initialize: (userId: string) => Promise<void>
  setNotes: (updater: NotesUpdater) => void
  retryLoad: () => Promise<void>
  retrySync: () => void
}

const SYNC_DELAY_MS = 400
let savedNotes: Note[] = []
let syncTimer: ReturnType<typeof setTimeout> | undefined
let syncInFlight: Promise<void> | undefined

function copyNotes(notes: Note[]) {
  return notes.map((note) => ({
    ...note,
    ...(note.mobilePlacement ? { mobilePlacement: { ...note.mobilePlacement } } : {}),
  }))
}

function sameNote(left: Note, right: Note) {
  return (
    left.id === right.id &&
    left.color === right.color &&
    left.text === right.text &&
    left.x === right.x &&
    left.y === right.y &&
    left.mobilePlacement?.x === right.mobilePlacement?.x &&
    left.mobilePlacement?.y === right.mobilePlacement?.y &&
    left.angle === right.angle &&
    (left.z ?? 0) === (right.z ?? 0)
  )
}

function sameNotes(left: Note[], right: Note[]) {
  if (left.length !== right.length) return false
  const rightById = new Map(right.map((note) => [note.id, note]))
  return left.every((note) => {
    const other = rightById.get(note.id)
    return other ? sameNote(note, other) : false
  })
}

async function persistDifference(previous: Note[], current: Note[]) {
  const previousById = new Map(previous.map((note) => [note.id, note]))
  const currentById = new Map(current.map((note) => [note.id, note]))
  const operations: Promise<void>[] = []

  for (const note of current) {
    const saved = previousById.get(note.id)
    if (!saved) operations.push(createNote(note))
    else if (!sameNote(saved, note)) operations.push(updateNote(note))
  }
  for (const note of previous) {
    if (!currentById.has(note.id)) operations.push(deleteNote(note.id))
  }

  await Promise.all(operations)
}

function scheduleSync(delay = SYNC_DELAY_MS) {
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(() => {
    syncTimer = undefined
    void synchronizeNotes()
  }, delay)
}

async function synchronizeNotes() {
  if (syncInFlight) return
  const state = useNoteStore.getState()
  if (state.loadStatus !== 'ready' || sameNotes(savedNotes, state.notes)) return

  const target = copyNotes(state.notes)
  const syncingUserId = state.userId
  let succeeded = false
  useNoteStore.setState({ syncStatus: 'saving', error: '' })
  syncInFlight = persistDifference(savedNotes, target)

  try {
    await syncInFlight
    if (useNoteStore.getState().userId !== syncingUserId) return
    savedNotes = target
    succeeded = true
    useNoteStore.setState({ syncStatus: 'saved', error: '' })
  } catch {
    if (useNoteStore.getState().userId !== syncingUserId) return
    useNoteStore.setState({
      syncStatus: 'error',
      error: '付箋を保存できませんでした。通信状態を確認して再試行してください。',
    })
  } finally {
    syncInFlight = undefined
    const current = useNoteStore.getState()
    if (succeeded && current.userId === syncingUserId && !sameNotes(savedNotes, current.notes)) {
      scheduleSync()
    }
  }
}

export const useNoteStore = create<NoteStore>()((set, get) => ({
  notes: [],
  userId: null,
  loadStatus: 'idle',
  syncStatus: 'idle',
  error: '',

  initialize: async (userId) => {
    const state = get()
    if (
      state.userId === userId &&
      (state.loadStatus === 'loading' || state.loadStatus === 'ready')
    ) {
      return
    }

    if (syncTimer) clearTimeout(syncTimer)
    syncTimer = undefined
    savedNotes = []
    set({ notes: [], userId, loadStatus: 'loading', syncStatus: 'idle', error: '' })

    try {
      const notes = await fetchNotes()
      if (get().userId !== userId) return
      savedNotes = copyNotes(notes)
      set({ notes, loadStatus: 'ready', syncStatus: 'saved', error: '' })
    } catch {
      if (get().userId !== userId) return
      set({ loadStatus: 'error', error: '付箋を読み込めませんでした。' })
    }
  },

  setNotes: (updater) => {
    set((state) => ({ notes: updater(state.notes) }))
    if (get().loadStatus === 'ready') scheduleSync()
  },

  retryLoad: async () => {
    const userId = get().userId
    if (!userId) return
    set({ loadStatus: 'idle' })
    await get().initialize(userId)
  },

  retrySync: () => {
    set({ syncStatus: 'idle', error: '' })
    scheduleSync(0)
  },
}))
