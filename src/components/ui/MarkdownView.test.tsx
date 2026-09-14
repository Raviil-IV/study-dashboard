import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import MarkdownView from './MarkdownView'

describe('MarkdownView', () => {
  it('renders headings, lists and tables', () => {
    const content = ['# Заголовок', '', '- пункт 1', '- пункт 2', '', '| A | B |', '|---|---|', '| 1 | 2 |'].join('\n')
    const { container } = render(<MarkdownView content={content} />)
    expect(screen.getByRole('heading', { name: 'Заголовок', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('пункт 1')).toBeInTheDocument()
    expect(container.querySelector('table')).not.toBeNull()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('highlights fenced code blocks by language', () => {
    const { container } = render(<MarkdownView content={'```ts\nconst x: number = 1\n```'} />)
    const code = container.querySelector('pre code')
    expect(code).not.toBeNull()
    expect(code?.className).toContain('language-ts')
    expect(code?.className).toContain('hljs')
    expect(code?.querySelector('.hljs-keyword')).not.toBeNull()
  })

  it('escapes raw HTML (no XSS)', () => {
    const { container } = render(<MarkdownView content={'<script>alert(1)</script>'} />)
    expect(container.querySelector('script')).toBeNull()
  })
})
