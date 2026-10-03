// Tauri's injected runtime identifies both custom-protocol Linux/macOS windows
// and Windows windows, whose bundled origin can use HTTP(S).
// This is a UI startup decision, not an authentication or authorization check.
export function isPackagedDesktop(isProduction: boolean, runtime: object): boolean {
  const isTauri =
    ('isTauri' in runtime && runtime.isTauri === true) ||
    ('__TAURI_INTERNALS__' in runtime && Boolean(runtime.__TAURI_INTERNALS__))
  return isProduction && isTauri
}
