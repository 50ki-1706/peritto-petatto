import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vite-plus/test'
import { NoteTextEditor } from './NoteTextEditor'

describe('NoteTextEditor', () => {
  it('sets the native 500-character limit on the rendered textarea', () => {
    const html = renderToStaticMarkup(
      createElement(NoteTextEditor, { value: '', onChange: () => {} }),
    )
    expect(html).toContain('maxLength="500"')
  })

  it('keeps a 500-character note unchanged', () => {
    const text = 'あ'.repeat(500)
    const html = renderToStaticMarkup(
      createElement(NoteTextEditor, { value: text, onChange: () => {} }),
    )
    expect(html).toContain(`>${text}</textarea>`)
  })

  it('does not silently truncate existing text, including emoji', () => {
    const text = 'あ'.repeat(499) + '😀'
    const html = renderToStaticMarkup(
      createElement(NoteTextEditor, { value: text, onChange: () => {} }),
    )
    expect(html).toContain(`>${text}</textarea>`)
  })

  it('preserves read-only, focus and accessibility attributes', () => {
    const props = {
      value: '付箋',
      readOnly: true,
      tabIndex: -1,
      'aria-label': '付箋のテキスト',
      'data-note-editor': '',
    }
    const html = renderToStaticMarkup(createElement(NoteTextEditor, props))
    expect(html).toContain('readOnly=""')
    expect(html).toContain('tabindex="-1"')
    expect(html).toContain('aria-label="付箋のテキスト"')
    expect(html).toContain('data-note-editor=""')
    expect(html).toContain('>付箋</textarea>')
  })
})
