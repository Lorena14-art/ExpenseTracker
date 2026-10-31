import { useState } from 'react'
import { db } from '../lib/db'

export default function CategoryManager({ categories, onRenamed }) {
  const [drafts, setDrafts] = useState({})
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#0f766e')
  const [error, setError] = useState('')

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
    <details className="rounded-[10px] border border-[var(--line)] bg-[var(--panel)]">
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
        Manage categories
      </summary>
      <div className="grid gap-3 border-t border-[var(--line)] p-4">
        <ul className="grid gap-3">
          {categories.map((category) => {
            const draft = drafts[category.name] ?? category
            return (
              <li key={category.name}>
                <form
                  onSubmit={(event) => saveCategory(category, event)}
                  className="grid grid-cols-[minmax(0,1fr)_2.75rem_auto] items-center gap-2"
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
                    className="cursor-pointer rounded-md border border-[var(--line)] px-2 py-2 text-xs font-medium hover:border-[var(--muted)]"
                  >
                    Save
                  </button>
                </form>
              </li>
            )
          })}
        </ul>

        <form onSubmit={addCategory} className="grid grid-cols-[minmax(0,1fr)_2.75rem_auto] items-center gap-2 border-t border-[var(--line)] pt-3">
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
            className="cursor-pointer rounded-md bg-[var(--accent)] px-2.5 py-2 text-xs font-semibold text-[var(--onaccent)] hover:bg-[var(--accent-h)]"
          >
            Add
          </button>
        </form>
        {error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}
      </div>
    </details>
  )
}
