import { expect, it } from 'vite-plus/test'
import { isPackagedDesktop } from './desktopRuntime'

it('keeps the web app in production browsers', () => {
  expect(isPackagedDesktop(true, {})).toBe(false)
})

it.each([{ isTauri: true }, { __TAURI_INTERNALS__: {} }])(
  'shows the setup screen for a bundled Tauri runtime: %j',
  (runtime) => {
    expect(isPackagedDesktop(true, runtime)).toBe(true)
  },
)

it.each([{ isTauri: true }, { __TAURI_INTERNALS__: {} }])(
  'keeps the web app during Tauri development: %j',
  (runtime) => {
    expect(isPackagedDesktop(false, runtime)).toBe(false)
  },
)

it('does not treat an inactive marker as a Tauri runtime', () => {
  expect(isPackagedDesktop(true, { isTauri: false })).toBe(false)
  expect(isPackagedDesktop(true, { __TAURI_INTERNALS__: undefined })).toBe(false)
})
