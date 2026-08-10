# Markdown Notes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Markdown support to notes — rendering with GFM (tables, checkboxes, strikethrough) and code blocks with syntax highlighting, a live preview in the note editor, and a note view modal.

**Architecture:** Frontend-only change. A shared renderer (`MarkdownView`) built on `react-markdown` + `remark-gfm` + `rehype-highlight` renders `Note.content`. The editor gets a side-by-side live preview (tabs on mobile). A new `NoteView` modal shows rendered content; clicking a card opens it. `Note.content` stays a plain string — backend, DB schema, and store are untouched.

**Tech Stack:** React 19, Vite 7, TypeScript strict, Tailwind CSS 4, Vitest; new deps: `react-markdown@10.1.0`, `remark-gfm@4.0.1`, `rehype-highlight@7.0.2` (`highlight.js@11.11.1` arrives transitively via `lowlight`, its CSS themes are NOT imported — we write our own `.hljs-*` styles in `index.css` for light/dark via CSS variables).

## Global Constraints

- TypeScript strict: `noUnusedLocals` / `noUnusedParameters` — unused imports break the build.
- Only four new frontend dependencies allowed: `react-markdown`, `remark-gfm`, `rehype-highlight` (highlight.js transitively). No UI libraries, no KaTeX.
- Backend, DB schema, migrations, `/api/state`, and the store are NOT modified.
- Raw HTML in note content is escaped by `react-markdown` (no `rehype-raw`) — must stay that way (XSS safety).
- Syntax highlighting is language-explicit only (```ts, ```python…) — no auto-detection.
- Note view is a modal, not a route.
- All UI copy in Russian; dark theme via existing `.dark` Tailwind variant.
- Test environment: jsdom; `window.matchMedia` mock always returns `matches: false` (mobile branch is what tests exercise).

---

### Task 1: Install markdown dependencies

**Files:**
- Modify: `package.json` (via npm)
- Test: `package.json` / build

- [ ] **Step 1: Install packages**

Run:
```bash
npm install react-markdown@10.1.0 remark-gfm@4.0.1 rehype-highlight@7.0.2
```

- [ ] **Step 2: Verify build still passes**

Run: `npm run build`
Expected: exit code 0, no TypeScript errors.

- [ ] **Step 3: Update the spec to reflect the real dependency set**

Edit `docs/superpowers/specs/2026-08-10-markdown-notes-design.md`: remove the `highlight.js` row from the dependency table in section 2 (it is transitive via `lowlight`), and change the last bullet of section 2 to:

```markdown
- Стили тем подсветки — собственные `.hljs-*` правила в `src/index.css` (CSS-переменные, светлая и `dark:` тёмная тема); CSS темы `highlight.js` не импортируются.
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json docs/superpowers/specs/2026-08-10-markdown-notes-design.md
git commit -m "chore: add markdown rendering dependencies"
```

---

### Task 2: Markdown renderer — `markdown.ts`, `MarkdownView`, styles

**Files:**
- Create: `src/lib/markdown.ts`
- Create: `src/components/ui/MarkdownView.tsx`
- Create: `src/components/ui/MarkdownView.test.tsx`
- Modify: `src/index.css`

**Interfaces:**
- Produces: `src/lib/markdown.ts` exports `remarkPlugins`, `rehypePlugins` (arrays passed to `react-markdown` props).
- Produces: `src/components/ui/MarkdownView.tsx` — default export `MarkdownView({ content }: { content: string })`, renders `<div className="md-content"><ReactMarkdown …>{content}</ReactMarkdown></div>`. Later tasks depend on this exact component and prop.

- [ ] **Step 1: Write the failing tests**

Create `src/components/ui/MarkdownView.test.tsx`:

```tsx
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/ui/MarkdownView.test.tsx`
Expected: FAIL — cannot resolve `./MarkdownView` (file does not exist).

- [ ] **Step 3: Create `src/lib/markdown.ts`**

```ts
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'

// Плагины для пропсов react-markdown (remarkPlugins / rehypePlugins)
export const remarkPlugins = [remarkGfm]
export const rehypePlugins = [rehypeHighlight]
```

- [ ] **Step 4: Create `src/components/ui/MarkdownView.tsx`**

```tsx
import ReactMarkdown from 'react-markdown'
import { remarkPlugins, rehypePlugins } from '../../lib/markdown'

export default function MarkdownView({ content }: { content: string }) {
  return (
    <div className="md-content">
      <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
```

- [ ] **Step 5: Add styles to `src/index.css`**

Append to the end of `src/index.css` (after the existing `body` rule):

```css
/* --- Markdown rendering --- */
.md-content {
  line-height: 1.6;
  word-break: break-word;
}
.md-content > :first-child { margin-top: 0; }
.md-content > :last-child { margin-bottom: 0; }
.md-content h1, .md-content h2, .md-content h3, .md-content h4 {
  font-weight: 700;
  margin: 1.25em 0 0.5em;
  line-height: 1.3;
}
.md-content h1 { font-size: 1.4rem; }
.md-content h2 { font-size: 1.2rem; }
.md-content h3 { font-size: 1.05rem; }
.md-content h4 { font-size: 1rem; }
.md-content p { margin: 0.6em 0; }
.md-content ul, .md-content ol { margin: 0.6em 0; padding-left: 1.4em; }
.md-content ul { list-style: disc; }
.md-content ol { list-style: decimal; }
.md-content li { margin: 0.2em 0; }
.md-content li > input[type='checkbox'] { margin-right: 0.4em; }
.md-content a { color: #6366f1; text-decoration: underline; }
.dark .md-content a { color: #818cf8; }
.md-content blockquote {
  border-left: 3px solid #e5e7eb;
  padding-left: 0.9em;
  color: #6b7280;
  margin: 0.6em 0;
}
.dark .md-content blockquote { border-left-color: #4b5563; color: #9ca3af; }
.md-content code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.875em;
}
.md-content :not(pre) > code {
  background: #f3f4f6;
  border-radius: 0.3em;
  padding: 0.15em 0.35em;
  color: #dc2626;
}
.dark .md-content :not(pre) > code { background: #1f2937; color: #f87171; }
.md-content pre {
  background: #f6f8fa;
  border: 1px solid #e5e7eb;
  border-radius: 0.6em;
  padding: 0.8em 1em;
  overflow-x: auto;
  margin: 0.8em 0;
}
.dark .md-content pre { background: #161b22; border-color: #30363d; }
.md-content pre code.hljs {
  display: block;
  padding: 0;
  background: transparent;
}
.md-content table { border-collapse: collapse; margin: 0.8em 0; width: 100%; }
.md-content th, .md-content td {
  border: 1px solid #e5e7eb;
  padding: 0.4em 0.7em;
  text-align: left;
}
.md-content th { background: #f9fafb; font-weight: 600; }
.dark .md-content th, .dark .md-content td { border-color: #374151; }
.dark .md-content th { background: #111827; }
.md-content img { max-width: 100%; border-radius: 0.5em; }
.md-content hr { border: 0; border-top: 1px solid #e5e7eb; margin: 1.2em 0; }
.dark .md-content hr { border-top-color: #374151; }

/* --- Syntax highlighting (hljs classes, light/dark via CSS vars) --- */
:root {
  --hljs-fg: #24292e;
  --hljs-keyword: #d73a49;
  --hljs-string: #032f62;
  --hljs-comment: #6a737d;
  --hljs-number: #005cc5;
  --hljs-title: #6f42c1;
  --hljs-attr: #005cc5;
  --hljs-built-in: #e36209;
  --hljs-symbol: #e36209;
  --hljs-link: #005cc5;
  --hljs-quote: #6a737d;
  --hljs-section: #6f42c1;
  --hljs-addition: #22863a;
  --hljs-deletion: #b31d28;
  --hljs-regexp: #032f62;
}
.dark {
  --hljs-fg: #c9d1d9;
  --hljs-keyword: #ff7b72;
  --hljs-string: #a5d6ff;
  --hljs-comment: #8b949e;
  --hljs-number: #79c0ff;
  --hljs-title: #d2a8ff;
  --hljs-attr: #79c0ff;
  --hljs-built-in: #ffa657;
  --hljs-symbol: #ffa657;
  --hljs-link: #79c0ff;
  --hljs-quote: #8b949e;
  --hljs-section: #d2a8ff;
  --hljs-addition: #aff5b4;
  --hljs-deletion: #ffdcd7;
  --hljs-regexp: #a5d6ff;
}
.md-content pre code { color: var(--hljs-fg); }
.md-content .hljs-keyword, .md-content .hljs-selector-tag { color: var(--hljs-keyword); }
.md-content .hljs-string, .md-content .hljs-regexp, .md-content .hljs-addition { color: var(--hljs-string); }
.md-content .hljs-comment, .md-content .hljs-quote, .md-content .hljs-meta { color: var(--hljs-comment); }
.md-content .hljs-number, .md-content .hljs-literal, .md-content .hljs-attr,
.md-content .hljs-attribute, .md-content .hljs-selector-attr, .md-content .hljs-template-variable { color: var(--hljs-number); }
.md-content .hljs-title, .md-content .hljs-section { color: var(--hljs-title); }
.md-content .hljs-built_in, .md-content .hljs-type, .md-content .hljs-symbol,
.md-content .hljs-bullet, .md-content .hljs-variable { color: var(--hljs-built-in); }
.md-content .hljs-link { color: var(--hljs-link); text-decoration: underline; }
.md-content .hljs-emphasis { font-style: italic; }
.md-content .hljs-strong { font-weight: 700; }
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/components/ui/MarkdownView.test.tsx`
Expected: 3 passing tests.

- [ ] **Step 7: Verify build**

Run: `npm run build`
Expected: exit code 0.
Note: if TypeScript complains that `remarkPlugins`/`rehypePlugins` don't match `PluggableList`, inline the arrays directly in `MarkdownView` JSX (`remarkPlugins={[remarkGfm]}` / `rehypePlugins={[rehypeHighlight]}`), import the plugins there, and delete `src/lib/markdown.ts` + its import; the tests assert behavior, not file layout.

- [ ] **Step 8: Commit**

```bash
git add src/lib/markdown.ts src/components/ui/MarkdownView.tsx src/components/ui/MarkdownView.test.tsx src/index.css
git commit -m "feat: add markdown view renderer with syntax highlighting"
```

---

### Task 3: Modal — `size` prop and dialog semantics

**Files:**
- Modify: `src/components/ui/Modal.tsx`
- Modify: `src/components/ui/Modal.test.tsx`

**Interfaces:**
- Produces: `Modal({ open, title, onClose, size = 'lg', children })` where `size: 'lg' | '3xl' | '4xl'` (default `'lg'`, keeps existing call sites working). Container gets `role="dialog"`, `aria-modal="true"`, `max-h-[90vh] overflow-y-auto`. Later tasks use `size="3xl"` (NoteView) and `size="4xl"` (NoteForm).

- [ ] **Step 1: Write the failing test**

Append to `src/components/ui/Modal.test.tsx`:

```tsx
test('supports size prop and dialog semantics', () => {
  render(<Modal open title="Заголовок" size="4xl" onClose={() => {}}>контент</Modal>)
  const dialog = screen.getByRole('dialog')
  expect(dialog).toHaveClass('max-w-4xl')
  expect(dialog).toHaveAttribute('aria-modal', 'true')
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/ui/Modal.test.tsx`
Expected: FAIL — `getByRole('dialog')` finds nothing (no role attribute yet).

- [ ] **Step 3: Update `src/components/ui/Modal.tsx`**

Replace the whole file with:

```tsx
import type { ReactNode } from 'react'
import IconButton from './IconButton'

type ModalSize = 'lg' | '3xl' | '4xl'

const sizeClasses: Record<ModalSize, string> = {
  lg: 'max-w-lg',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
}

export default function Modal({
  open,
  title,
  onClose,
  size = 'lg',
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  size?: ModalSize
  children: ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div data-testid="modal-overlay" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative w-full ${sizeClasses[size]} max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          <IconButton name="close" label="Закрыть" onClick={onClose} />
        </div>
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/ui/Modal.test.tsx`
Expected: 3 passing tests (2 existing + 1 new).

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Modal.tsx src/components/ui/Modal.test.tsx
git commit -m "feat: support modal sizes and dialog semantics"
```

---

### Task 4: NoteForm — live preview

**Files:**
- Modify: `src/components/notes/NoteForm.tsx`
- Create: `src/components/notes/NoteForm.test.tsx`

**Interfaces:**
- Consumes: `MarkdownView({ content })` (Task 2), `Tabs` (`src/components/ui/Tabs.tsx`, existing).
- Produces: `NoteForm({ initial?, onSubmit, onCancel })` — unchanged props/`NoteFormValues` interface, so `NotesPage` keeps working. Desktop (`min-width: 768px`): grid with textarea + preview side by side. Mobile (tests): tabs «Написать» / «Предпросмотр».

- [ ] **Step 1: Write the failing test**

Create `src/components/notes/NoteForm.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NoteForm from './NoteForm'

const note = {
  id: '1',
  title: 'Конспект',
  subject: '',
  content: '# Параграф\n\n- пункт',
  tags: [] as string[],
  pinned: false,
  createdAt: '',
  updatedAt: '',
}

describe('NoteForm', () => {
  it('shows the markdown preview via the mobile tab switch', async () => {
    const user = userEvent.setup()
    render(<NoteForm initial={note} onSubmit={() => {}} onCancel={() => {}} />)
    // jsdom matchMedia always reports false → mobile branch: tabs are visible
    expect(screen.getByLabelText('Содержимое')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Предпросмотр' }))
    expect(screen.getByRole('heading', { name: 'Параграф', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('пункт')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/notes/NoteForm.test.tsx`
Expected: FAIL — no button «Предпросмотр» (form has no preview yet).

- [ ] **Step 3: Update `src/components/notes/NoteForm.tsx`**

Replace the whole file with:

```tsx
import { useEffect, useState, type FormEvent } from 'react'
import type { Note } from '../../types'
import Input from '../ui/Input'
import Textarea from '../ui/Textarea'
import Button from '../ui/Button'
import Tabs from '../ui/Tabs'
import MarkdownView from '../ui/MarkdownView'

export interface NoteFormValues {
  title: string
  subject: string
  content: string
  tags: string
}

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 768px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const onChange = () => setIsDesktop(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return isDesktop
}

export default function NoteForm({ initial, onSubmit, onCancel }: { initial?: Note; onSubmit: (values: NoteFormValues) => void; onCancel: () => void }) {
  const [values, setValues] = useState<NoteFormValues>(() =>
    initial
      ? { title: initial.title, subject: initial.subject ?? '', content: initial.content, tags: initial.tags.join(', ') }
      : { title: '', subject: '', content: '', tags: '' },
  )
  const [error, setError] = useState('')
  const [tab, setTab] = useState('write')
  const isDesktop = useIsDesktop()

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!values.title.trim()) {
      setError('Введите заголовок')
      return
    }
    onSubmit(values)
  }

  const editor = (
    <Textarea
      label="Содержимое"
      rows={12}
      value={values.content}
      onChange={(e) => setValues({ ...values, content: e.target.value })}
      className="min-h-[300px] font-mono"
    />
  )

  const preview = (
    <div className="max-h-[420px] overflow-y-auto rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
      <MarkdownView content={values.content} />
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Заголовок" value={values.title} onChange={(e) => setValues({ ...values, title: e.target.value })} placeholder="Тема заметки" />
      <div className="grid grid-cols-2 gap-4">
        <Input label="Предмет" value={values.subject} onChange={(e) => setValues({ ...values, subject: e.target.value })} placeholder="Математика" />
        <Input label="Теги" value={values.tags} onChange={(e) => setValues({ ...values, tags: e.target.value })} placeholder="алгебра, формулы" />
      </div>
      {isDesktop ? (
        <div className="grid grid-cols-2 gap-4">
          {editor}
          {preview}
        </div>
      ) : (
        <div>
          <Tabs
            tabs={[
              { value: 'write', label: 'Написать' },
              { value: 'preview', label: 'Предпросмотр' },
            ]}
            value={tab}
            onChange={setTab}
          />
          <div className="mt-3">{tab === 'write' ? editor : preview}</div>
        </div>
      )}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Отмена</Button>
        <Button type="submit">Сохранить</Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/notes/NoteForm.test.tsx`
Expected: 1 passing test.

- [ ] **Step 5: Verify existing NotesPage tests still pass**

Run: `npx vitest run src/pages/NotesPage.test.tsx`
Expected: 4 passing tests (form still exposes `getByLabelText('Содержимое')`; mobile branch is active in jsdom).

- [ ] **Step 6: Commit**

```bash
git add src/components/notes/NoteForm.tsx src/components/notes/NoteForm.test.tsx
git commit -m "feat: add live markdown preview to note form"
```

---

### Task 5: NoteView modal + open from card

**Files:**
- Modify: `src/components/ui/IconButton.tsx` — widen `onClick` type to `(e: MouseEvent<HTMLButtonElement>) => void` (existing `() => void` callers stay valid; required so card buttons can `stopPropagation`)
- Create: `src/components/notes/NoteView.tsx`
- Modify: `src/components/notes/NoteCard.tsx`
- Modify: `src/pages/NotesPage.tsx`
- Modify: `src/pages/NotesPage.test.tsx`

**Interfaces:**
- Consumes: `Modal` with `size="3xl"` (Task 3), `MarkdownView` (Task 2).
- Produces: `NoteView({ note, onEdit, onClose })` — modal with rendered content, «Закрыть» (secondary) and «Редактировать» buttons.
- Produces: `NoteCard` gains required prop `onOpen: () => void`; card body click calls it, the three `IconButton`s stop propagation.

- [ ] **Step 1: Write the failing tests**

Append to `src/pages/NotesPage.test.tsx` (imports `describe, expect, it, beforeEach, vi`, `render, screen, within`, `userEvent`, `MemoryRouter`, `NotesPage`, `useStore` are already present):

```tsx
describe('NotesPage markdown view', () => {
  const mdNote = () => ({
    id: '3',
    title: 'Конспект по ТС',
    subject: 'Информатика',
    content: '# Вступление',
    tags: [] as string[],
    pinned: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  it('opens the note view on card click and renders markdown', async () => {
    const user = userEvent.setup()
    useStore.setState({ ...base, notes: [mdNote()] })
    renderPage()
    await user.click(screen.getByText('Конспект по ТС'))
    expect(screen.getByRole('heading', { name: 'Вступление', level: 1 })).toBeInTheDocument()
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('button', { name: 'Редактировать' })).toBeInTheDocument()
  })

  it('opens the edit form from the note view', async () => {
    const user = userEvent.setup()
    useStore.setState({ ...base, notes: [mdNote()] })
    renderPage()
    await user.click(screen.getByText('Конспект по ТС'))
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Редактировать' }))
    expect(screen.getByLabelText('Заголовок')).toHaveValue('Конспект по ТС')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/pages/NotesPage.test.tsx`
Expected: the two new tests FAIL (no dialog appears — no `NoteView` yet, no card click handler).

- [ ] **Step 3: Create `src/components/notes/NoteView.tsx`**

```tsx
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import MarkdownView from '../ui/MarkdownView'
import type { Note } from '../../types'

export default function NoteView({ note, onEdit, onClose }: { note: Note; onEdit: () => void; onClose: () => void }) {
  return (
    <Modal open title={note.title} onClose={onClose} size="3xl">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
          {note.subject && <span>{note.subject}</span>}
          {note.tags.map((t) => (
            <span key={t} className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600 dark:bg-gray-800 dark:text-gray-400">#{t}</span>
          ))}
        </div>
        {note.content ? (
          <MarkdownView content={note.content} />
        ) : (
          <p className="text-sm text-gray-400">—</p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Закрыть</Button>
          <Button type="button" onClick={onEdit}>Редактировать</Button>
        </div>
      </div>
    </Modal>
  )
}
```

- [ ] **Step 4: Update `src/components/notes/NoteCard.tsx`**

Replace the component with (signature gains `onOpen`, card becomes clickable, buttons stop propagation):

```tsx
import type { Note } from '../../types'
import IconButton from '../ui/IconButton'

function formatShortDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

export default function NoteCard({
  note,
  onEdit,
  onDelete,
  onTogglePin,
  onOpen,
}: {
  note: Note
  onEdit: () => void
  onDelete: () => void
  onTogglePin: () => void
  onOpen: () => void
}) {
  return (
    <li
      onClick={onOpen}
      className={`flex cursor-pointer flex-col rounded-xl bg-white p-4 shadow-sm ring-1 transition-colors hover:ring-indigo-300 dark:bg-gray-900 dark:hover:ring-indigo-700 ${note.pinned ? 'ring-indigo-400 dark:ring-indigo-500' : 'ring-gray-200 dark:ring-gray-800'}`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{note.title}</h3>
        <div className="flex shrink-0 gap-1">
          <IconButton name="pin" label="Закрепить" onClick={(e) => { e.stopPropagation(); onTogglePin() }} />
          <IconButton name="edit" label="Редактировать" onClick={(e) => { e.stopPropagation(); onEdit() }} />
          <IconButton name="trash" label="Удалить" onClick={(e) => { e.stopPropagation(); onDelete() }} />
        </div>
      </div>
      <p className="mb-3 line-clamp-4 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">{note.content || '—'}</p>
      <div className="mt-auto flex flex-wrap items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
        {note.subject && <span>{note.subject}</span>}
        {note.tags.map((t) => (
          <span key={t} className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600 dark:bg-gray-800 dark:text-gray-400">#{t}</span>
        ))}
        <span className="ml-auto">{formatShortDate(note.updatedAt)}</span>
      </div>
    </li>
  )
}
```

Note: `IconButton`'s `onClick` prop type is widened in this task from `() => void` to `(e: MouseEvent<HTMLButtonElement>) => void` — the plan's original assumption (an arrow with a parameter being assignable to a no-arg signature) is wrong under strict `noImplicitAny`, so the root fix is the wider prop type. `IconButton.tsx` must be included in the commit.

- [ ] **Step 5: Update `src/pages/NotesPage.tsx`**

Apply these changes:

- Add `NoteView` to the imports:
```tsx
import NoteCard from '../components/notes/NoteCard'
import NoteView from '../components/notes/NoteView'
```
- Add view state next to `editing`:
```tsx
const [viewing, setViewing] = useState<Note | undefined>()
```
- Pass `onOpen` to the card:
```tsx
<NoteCard
  key={n.id}
  note={n}
  onOpen={() => setViewing(n)}
  onEdit={() => { setEditing(n); setModalOpen(true) }}
  onDelete={() => handleDelete(n.id)}
  onTogglePin={() => togglePinNote(n.id)}
/>
```
- Render the view modal after the form modal (inside the root `<div>`):
```tsx
{viewing && (
  <NoteView
    note={viewing}
    onClose={() => setViewing(undefined)}
    onEdit={() => {
      setViewing(undefined)
      setEditing(viewing)
      setModalOpen(true)
    }}
  />
)}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/pages/NotesPage.test.tsx`
Expected: 6 passing tests (4 existing + 2 new).

- [ ] **Step 7: Verify build**

Run: `npm run build`
Expected: exit code 0.

- [ ] **Step 8: Commit**

```bash
git add src/components/notes/NoteView.tsx src/components/notes/NoteCard.tsx src/pages/NotesPage.tsx src/pages/NotesPage.test.tsx
git commit -m "feat: add note view modal opened from card click"
```

---

### Task 6: Final validation

**Files:**
- Test: full test suite + build

- [ ] **Step 1: Run the full frontend test suite**

Run: `npm test`
Expected: all tests pass (existing suite + new `MarkdownView`, `NoteForm`, `NoteCard`-related, `Modal`, `NotesPage` tests).

- [ ] **Step 2: Run the production build**

Run: `npm run build`
Expected: exit code 0, `dist/` produced.

- [ ] **Step 3: Manual smoke check (optional but recommended)**

Run: `npm run dev`, open http://localhost:5173:
1. Create a note with `# Заголовок`, a list, a ```` ```ts ```` code block, and a table — the preview shows formatting and highlighted code.
2. On a narrow window (< 768px) the editor shows «Написать / Предпросмотр» tabs.
3. Click a note card — the view modal renders markdown; «Редактировать» opens the form with the same note; saved changes appear.
4. Dark theme: code blocks switch to the dark palette.

- [ ] **Step 4: Commit any fixes from the smoke check**

```bash
git add -A
git commit -m "fix: polish markdown notes after smoke check"
```
(Skip this step if nothing needed fixing.)
