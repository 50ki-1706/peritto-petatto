import { create } from 'zustand'

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
  mobileX?: number
  mobileY?: number
  mobilePlacement?: { x: number; y: number }
  angle: number
  z?: number
}

export const initialNotes: Note[] = [
  {
    id: 'welcome-1',
    color: 'yellow',
    text: 'ぺりっと、\nぺたっと。\n思いついたことを\n付箋に書こう！',
    x: 60,
    y: 78,
    angle: -4,
  },
  {
    id: 'welcome-2',
    color: 'pink',
    text: '付箋を追加\n\n下の色を選ぶか\n上へ引き出そう',
    x: 318,
    y: 65,
    angle: -5,
  },
  {
    id: 'welcome-3',
    color: 'blue',
    text: '文字を書く\n\n付箋をダブルタップ\nして入力しよう',
    x: 576,
    y: 76,
    angle: -3,
  },
  {
    id: 'welcome-4',
    color: 'green',
    text: '好きな場所へ\n\n付箋のどこでも\nつかんで動かそう',
    x: 834,
    y: 65,
    angle: -4,
  },
  {
    id: 'welcome-5',
    color: 'purple',
    text: 'いらなくなったら\n\n左右の端へ移動\n赤くなったら\n離して削除！',
    x: 84,
    y: 326,
    angle: -5,
  },
  {
    id: 'welcome-6',
    color: 'orange',
    text: '削除をやめる\n\n離す前に中央へ\n戻せば大丈夫',
    x: 342,
    y: 313,
    angle: -4,
  },
  {
    id: 'welcome-7',
    color: 'yellow',
    text: 'スマホで使う\n\n下のバーを\n上へスワイプして\n色を選ぼう',
    x: 600,
    y: 327,
    angle: -4,
  },
  {
    id: 'welcome-8',
    color: 'pink',
    text: '色で分けよう\n\n予定やアイデアを\n好きな色の付箋に',
    x: 858,
    y: 316,
    angle: -5,
  },
]

type NotesUpdater = (current: Note[]) => Note[]

type NoteStore = {
  notes: Note[]
  setNotes: (updater: NotesUpdater) => void
}

export const useNoteStore = create<NoteStore>()((set) => ({
  notes: initialNotes,
  setNotes: (updater) => set((state) => ({ notes: updater(state.notes) })),
}))
