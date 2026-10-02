/** @jsxImportSource react */
import type { ComponentProps } from 'react'

type NoteTextEditorProps = Omit<ComponentProps<'textarea'>, 'maxLength'>

// Match the API's 500 UTF-16 code-unit limit. Let the browser handle input,
// paste and composition rather than slicing text while the user is typing.
export function NoteTextEditor(props: NoteTextEditorProps) {
  return <textarea {...props} maxLength={500} />
}
