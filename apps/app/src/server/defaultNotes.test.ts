import { expect, it } from 'vite-plus/test'
import { createDefaultNotes } from './defaultNotes'

it('creates stable but user-specific default note ids', async () => {
  const first = await createDefaultNotes('user-a')
  const retry = await createDefaultNotes('user-a')
  const otherUser = await createDefaultNotes('user-b')

  expect(first).toHaveLength(7)
  expect(retry.map((note) => note.id)).toEqual(first.map((note) => note.id))
  expect(otherUser.map((note) => note.id)).not.toEqual(first.map((note) => note.id))
  expect(new Set(first.map((note) => note.id))).toHaveLength(first.length)
  expect(first.some((note) => note.text.includes('スマホで使う'))).toBe(false)
})
