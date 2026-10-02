export const palette = [
  { id: 'yellow', label: 'きいろ' },
  { id: 'pink', label: 'ももいろ' },
  { id: 'blue', label: 'みずいろ' },
  { id: 'green', label: 'みどり' },
  { id: 'purple', label: 'むらさき' },
  { id: 'orange', label: 'だいだい' },
] as const

export type Color = (typeof palette)[number]['id']

export type Note = {
  id: string
  color: Color
  text: string
  x: number
  y: number
  mobilePlacement?: { x: number; y: number }
  angle: number
  z?: number
}
