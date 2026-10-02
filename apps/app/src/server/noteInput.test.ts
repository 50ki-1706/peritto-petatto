import { describe, expect, it } from 'vite-plus/test'
import { parseCreateNote, parseUpdateNote } from './noteInput'

const validNote = {
  id: 'note_123',
  color: 'yellow',
  text: '買い物',
  x: 120,
  y: 80,
  mobileX: null,
  mobileY: null,
  angle: -3,
  z: 2,
}

describe('parseCreateNote', () => {
  it('accepts a valid note', () => {
    expect(parseCreateNote(validNote)).toEqual({ success: true, data: validNote })
  })

  it('does not accept a userId from the client', () => {
    expect(parseCreateNote({ ...validNote, userId: 'someone-else' }).success).toBe(false)
  })

  it('rejects text longer than 500 characters', () => {
    expect(parseCreateNote({ ...validNote, text: 'a'.repeat(501) }).success).toBe(false)
  })

  it('requires mobile coordinates as a pair', () => {
    expect(parseCreateNote({ ...validNote, mobileX: 10, mobileY: null }).success).toBe(false)
  })

  it('rejects non-finite numbers', () => {
    expect(parseCreateNote({ ...validNote, x: Number.NaN }).success).toBe(false)
  })
})

describe('parseUpdateNote', () => {
  it('accepts a partial update', () => {
    expect(parseUpdateNote({ text: '更新後' })).toEqual({
      success: true,
      data: { text: '更新後' },
    })
  })

  it('rejects an empty update', () => {
    expect(parseUpdateNote({}).success).toBe(false)
  })

  it('does not allow changing id or userId', () => {
    expect(parseUpdateNote({ id: 'another-id' }).success).toBe(false)
    expect(parseUpdateNote({ userId: 'someone-else' }).success).toBe(false)
  })

  it('requires mobile coordinates to be updated together', () => {
    expect(parseUpdateNote({ mobileX: 10 }).success).toBe(false)
    expect(parseUpdateNote({ mobileX: 10, mobileY: 20 }).success).toBe(true)
  })
})
