import { useRef, useState } from 'react'
import { db } from '../lib/db'

export default function CategoryManager({ categories, onRenamed }) {
  const [drafts, setDrafts] = useState({})
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#0f766e')
  const [error, setError] = useState('')
  const dialog = useRef(null)

  function isValidName(name, currentName = '') {
    const trimmedName = name.trim()
    if (!trimmedName) return 'Enter a category name.'
    if (
      categories.some(
        (category) =>
          category.name !== currentName &&
          category.name.toLocaleLowerCase() === trimmedName.toLocaleLowerCase()
      )
    ) {
      return 'A category with this name already exists.'
    }
    return ''
  }

  async function saveCategory(original, event) {
    event.preventDefault()
    const draft = drafts[original.name] ?? original
    const name = draft.name.trim()
    const validationError = isValidName(name, original.name)
    if (validationError) {
      setError(validationError)
      return
    }

    try {
      await db.transaction(
        'rw',
        db.categories,
        db.expenses,
        db.recurringExpenses,
        async () => {
          if (name !== original.name) {
            await db.expenses.where('category').equals(original.name).modify({ category: name })
            await db.recurringExpenses.where('category').equals(original.name).modify({ category: name })
            await db.categories.delete(original.name)
            await db.categories.add({ name, color: draft.color })
          } else {
            await db.categories.put({ name, color: draft.color })
          }
        }
      )
      if (name !== original.name) onRenamed?.(original.name, name)
      setDrafts((current) => {
        const next = { ...current }
        delete next[original.name]
        return next
      })
      setError('')
    } catch {
      setError('Could not save this category. Please try again.')
    }
  }

  async function addCategory(event) {
    event.preventDefault()
    const name = newName.trim()
    const validationError = isValidName(name)
    if (validationError) {
      setError(validationError)
      return
    }

    try {
      await db.categories.add({ name, color: newColor })
      setNewName('')
      setNewColor('#0f766e')
      setError('')
    } catch {
      setError('Could not add this category. Please try again.')
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        aria-haspopup="dialog"
        aria-controls="category-manager-dialog"
        className="flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md border border-[var(--line)] bg-[var(--panel)] px-2.5 py-2.5 text-sm font-semibold hover:border-[var(--muted)] sm:px-3"
      >
        <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true" className="size-4 shrink-0">
          <path d="M19 20.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0ZM15 5.5v10.551c.166-.019.329-.051.5-.051s.334.032.5.051V5.5a.5.5 0 0 0-1 0Zm0 19.449V26.5a.5.5 0 0 0 1 0v-1.551c-.166.019-.329.051-.5.051s-.334-.032-.5-.051Zm9-6v7.551a.5.5 0 0 0 1 0v-7.551c-.166.019-.329.051-.5.051s-.334-.032-.5-.051Zm0-8.898V5.5a.5.5 0 0 0-1 0v4.551c.166-.019.329-.051.5-.051s.334.032.5.051ZM6 7.051V5.5a.5.5 0 0 0-1 0v1.551c.166-.019.329-.051.5-.051s.334.032.5.051ZM5 15.949V26.5a.5.5 0 0 0 1 0V15.949c-.166.019-.329.051-.5.051s-.334-.032-.5-.051ZM6.5 8a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm18 3a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
        </svg>
        Manage categories
      </button>
      <dialog
        ref={dialog}
        id="category-manager-dialog"
        aria-labelledby="category-manager-title"
        className="m-auto max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-lg overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--panel)] p-0 text-[var(--text)] shadow-xl backdrop:bg-black/50 sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100%-2rem)]"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-[var(--line)] bg-[var(--panel)] px-4 py-3">
          <h2 id="category-manager-title" className="text-base font-semibold">
            Manage categories
          </h2>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            aria-label="Close category manager"
            className="cursor-pointer rounded-md px-2 py-1 text-[var(--muted)] hover:text-[var(--text)]"
          >
            ✕
          </button>
        </div>
        <div className="grid gap-3 p-3 sm:p-4">
        <ul className="grid gap-3">
          {categories.map((category) => {
            const draft = drafts[category.name] ?? category
            return (
              <li key={category.name}>
                <form
                  onSubmit={(event) => saveCategory(category, event)}
                  className="grid grid-cols-[minmax(0,1fr)_2.75rem] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_2.75rem_auto]"
                >
                  <label className="sr-only" htmlFor={`category-name-${category.name}`}>
                    Category name
                  </label>
                  <input
                    id={`category-name-${category.name}`}
                    value={draft.name}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [category.name]: { ...draft, name: event.target.value },
                      }))
                    }
                    maxLength={40}
                    className="min-w-0 rounded-md border border-[var(--line)] bg-[var(--bg)] px-2 py-1.5 text-sm"
                  />
                  <label className="sr-only" htmlFor={`category-color-${category.name}`}>
                    Category color
                  </label>
                  <input
                    id={`category-color-${category.name}`}
                    type="color"
                    value={draft.color}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [category.name]: { ...draft, color: event.target.value },
                      }))
                    }
                    className="size-10 w-full cursor-pointer rounded-md border border-[var(--line)] bg-[var(--bg)] p-1"
                  />
                  <button
                    type="submit"
                    className="col-span-2 w-full cursor-pointer rounded-md border border-[var(--line)] px-2 py-2 text-xs font-medium hover:border-[var(--muted)] sm:col-span-1 sm:w-auto"
                  >
                    Save
                  </button>
                </form>
              </li>
            )
          })}
        </ul>

        <form onSubmit={addCategory} className="grid grid-cols-[minmax(0,1fr)_2.75rem] items-center gap-2 border-t border-[var(--line)] pt-3 sm:grid-cols-[minmax(0,1fr)_2.75rem_auto]">
          <label className="sr-only" htmlFor="new-category-name">New category name</label>
          <input
            id="new-category-name"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="New category"
            maxLength={40}
            className="min-w-0 rounded-md border border-[var(--line)] bg-[var(--bg)] px-2 py-2 text-sm"
          />
          <label className="sr-only" htmlFor="new-category-color">New category color</label>
          <input
            id="new-category-color"
            type="color"
            value={newColor}
            onChange={(event) => setNewColor(event.target.value)}
            className="size-10 w-full cursor-pointer rounded-md border border-[var(--line)] bg-[var(--bg)] p-1"
          />
          <button
            type="submit"
            className="col-span-2 w-full cursor-pointer rounded-md bg-[var(--accent)] px-2.5 py-2 text-xs font-semibold text-[var(--onaccent)] hover:bg-[var(--accent-h)] sm:col-span-1 sm:w-auto"
          >
            Add
          </button>
        </form>
        {error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}
      </div>
      </dialog>
    </>
  )
}
