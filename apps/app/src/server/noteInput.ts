const colors = ['yellow', 'pink', 'blue', 'green', 'purple', 'orange'] as const

type NoteColor = (typeof colors)[number]

export type CreateNoteInput = {
  id: string
  color: NoteColor
  text: string
  x: number
  y: number
  mobileX: number | null
  mobileY: number | null
  angle: number
  z: number
}

export type UpdateNoteInput = Partial<Omit<CreateNoteInput, 'id'>>

type ParseResult<T> = { success: true; data: T } | { success: false; error: string }

const createKeys = new Set(['id', 'color', 'text', 'x', 'y', 'mobileX', 'mobileY', 'angle', 'z'])
const updateKeys = new Set([...createKeys].filter((key) => key !== 'id'))

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: Set<string>) {
  return Object.keys(value).every((key) => allowed.has(key))
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isNullableFiniteNumber(value: unknown): value is number | null {
  return value === null || isFiniteNumber(value)
}

function isColor(value: unknown): value is NoteColor {
  return typeof value === 'string' && colors.includes(value as NoteColor)
}

export function parseCreateNote(value: unknown): ParseResult<CreateNoteInput> {
  if (!isRecord(value) || !hasOnlyKeys(value, createKeys)) {
    return { success: false, error: '付箋の形式が正しくありません' }
  }

  const mobileX = value.mobileX ?? null
  const mobileY = value.mobileY ?? null
  const z = value.z ?? 0

  if (typeof value.id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value.id)) {
    return { success: false, error: '付箋IDが正しくありません' }
  }
  if (!isColor(value.color)) return { success: false, error: '付箋の色が正しくありません' }
  if (typeof value.text !== 'string' || value.text.length > 500) {
    return { success: false, error: '付箋の本文は500文字以内にしてください' }
  }
  if (!isFiniteNumber(value.x) || !isFiniteNumber(value.y) || !isFiniteNumber(value.angle)) {
    return { success: false, error: '付箋の位置または角度が正しくありません' }
  }
  if (typeof z !== 'number' || !Number.isSafeInteger(z)) {
    return { success: false, error: '付箋の重なり順が正しくありません' }
  }
  if (
    !isNullableFiniteNumber(mobileX) ||
    !isNullableFiniteNumber(mobileY) ||
    (mobileX === null) !== (mobileY === null)
  ) {
    return { success: false, error: 'スマートフォン用の位置が正しくありません' }
  }

  return {
    success: true,
    data: {
      id: value.id,
      color: value.color,
      text: value.text,
      x: value.x,
      y: value.y,
      mobileX,
      mobileY,
      angle: value.angle,
      z,
    },
  }
}

export function parseUpdateNote(value: unknown): ParseResult<UpdateNoteInput> {
  if (!isRecord(value) || !hasOnlyKeys(value, updateKeys) || Object.keys(value).length === 0) {
    return { success: false, error: '更新内容の形式が正しくありません' }
  }

  if ('color' in value && !isColor(value.color)) {
    return { success: false, error: '付箋の色が正しくありません' }
  }
  if ('text' in value && (typeof value.text !== 'string' || value.text.length > 500)) {
    return { success: false, error: '付箋の本文は500文字以内にしてください' }
  }
  for (const key of ['x', 'y', 'angle'] as const) {
    if (key in value && !isFiniteNumber(value[key])) {
      return { success: false, error: '付箋の位置または角度が正しくありません' }
    }
  }
  if ('z' in value && (typeof value.z !== 'number' || !Number.isSafeInteger(value.z))) {
    return { success: false, error: '付箋の重なり順が正しくありません' }
  }

  const hasMobileX = 'mobileX' in value
  const hasMobileY = 'mobileY' in value
  if (
    hasMobileX !== hasMobileY ||
    (hasMobileX &&
      (!isNullableFiniteNumber(value.mobileX) ||
        !isNullableFiniteNumber(value.mobileY) ||
        (value.mobileX === null) !== (value.mobileY === null)))
  ) {
    return { success: false, error: 'スマートフォン用の位置はXとYを一緒に指定してください' }
  }

  return { success: true, data: value as UpdateNoteInput }
}
