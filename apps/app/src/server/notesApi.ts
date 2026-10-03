import { notes as notesTable, user as userTable } from 'db'
import { and, asc, drizzle, eq } from 'db/client'
import { Hono, type Context } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { createAuth } from './auth'
import { createDefaultNotes } from './defaultNotes'
import { parseCreateNote, parseUpdateNote } from './noteInput'

type NotesEnv = { Bindings: CloudflareBindings }

const notesApi = new Hono<NotesEnv>()
const jsonBodyLimit = bodyLimit({
  maxSize: 16 * 1024,
  onError: (c) => c.json({ error: 'リクエストが大きすぎます' }, 413),
})

async function authenticatedUserId(c: Context<NotesEnv>) {
  const session = await createAuth(c.env).api.getSession({ headers: c.req.raw.headers })
  return session?.user.id ?? null
}

async function readJson(c: Context<NotesEnv>) {
  try {
    return { success: true as const, data: await c.req.json<unknown>() }
  } catch {
    return { success: false as const }
  }
}

async function initializeNotes(database: ReturnType<typeof drizzle>, userId: string) {
  const [user] = await database
    .select({ notesInitialized: userTable.notesInitialized })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1)

  if (!user || user.notesInitialized) return

  const defaults = await createDefaultNotes(userId)
  await database.insert(notesTable).values(defaults).onConflictDoNothing({ target: notesTable.id })
  await database
    .update(userTable)
    .set({ notesInitialized: true, updatedAt: new Date() })
    .where(eq(userTable.id, userId))
}

notesApi.get('/', async (c) => {
  const userId = await authenticatedUserId(c)
  if (!userId) return c.json({ error: 'ログインが必要です' }, 401)

  const database = drizzle(c.env.peritto_petatto)
  await initializeNotes(database, userId)
  const notes = await database
    .select()
    .from(notesTable)
    .where(eq(notesTable.userId, userId))
    .orderBy(asc(notesTable.createdAt), asc(notesTable.id))

  return c.json({ notes })
})

notesApi.post('/', jsonBodyLimit, async (c) => {
  const userId = await authenticatedUserId(c)
  if (!userId) return c.json({ error: 'ログインが必要です' }, 401)

  const json = await readJson(c)
  if (!json.success) return c.json({ error: 'JSONの形式が正しくありません' }, 400)
  const input = parseCreateNote(json.data)
  if (!input.success) return c.json({ error: input.error }, 400)

  const database = drizzle(c.env.peritto_petatto)
  const created = await database
    .insert(notesTable)
    .values({ ...input.data, userId })
    .onConflictDoNothing({ target: notesTable.id })
    .returning()

  if (!created[0]) return c.json({ error: '同じIDの付箋がすでに存在します' }, 409)
  return c.json({ note: created[0] }, 201)
})

notesApi.patch('/:id', jsonBodyLimit, async (c) => {
  const userId = await authenticatedUserId(c)
  if (!userId) return c.json({ error: 'ログインが必要です' }, 401)

  const json = await readJson(c)
  if (!json.success) return c.json({ error: 'JSONの形式が正しくありません' }, 400)
  const input = parseUpdateNote(json.data)
  if (!input.success) return c.json({ error: input.error }, 400)

  const database = drizzle(c.env.peritto_petatto)
  const updated = await database
    .update(notesTable)
    .set({ ...input.data, updatedAt: new Date() })
    .where(and(eq(notesTable.id, c.req.param('id')), eq(notesTable.userId, userId)))
    .returning()

  if (!updated[0]) return c.json({ error: '付箋が見つかりません' }, 404)
  return c.json({ note: updated[0] })
})

notesApi.delete('/:id', async (c) => {
  const userId = await authenticatedUserId(c)
  if (!userId) return c.json({ error: 'ログインが必要です' }, 401)

  const database = drizzle(c.env.peritto_petatto)
  const deleted = await database
    .delete(notesTable)
    .where(and(eq(notesTable.id, c.req.param('id')), eq(notesTable.userId, userId)))
    .returning({ id: notesTable.id })

  if (!deleted[0]) return c.json({ error: '付箋が見つかりません' }, 404)
  return c.json({ id: deleted[0].id })
})

export { notesApi }
