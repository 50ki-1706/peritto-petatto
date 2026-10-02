import { defaultNoteTemplates } from '../shared/defaultNotes'

async function defaultNoteId(userId: string, index: number) {
  const source = new TextEncoder().encode(`${userId}:welcome:${index}`)
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', source))
  return Array.from(digest.slice(0, 16), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function createDefaultNotes(userId: string) {
  return Promise.all(
    defaultNoteTemplates.map(async (template, index) => ({
      id: await defaultNoteId(userId, index),
      userId,
      ...template,
      mobileX: null,
      mobileY: null,
      z: index + 1,
    })),
  )
}
