import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { expenseSchema } from '../lib/schema'
import { db, DEFAULT_CATEGORY } from '../lib/db'
import { toCents } from '../lib/money'
import { today } from '../lib/dates'

const input =
  'w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-2.5 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]'
const label = 'mb-1 block text-sm text-[var(--muted)]'

export default function ExpenseForm({ categories, onAdded, editingExpense, onEditingComplete }) {
  const editDialog = useRef(null)
  const {
    register,
    handleSubmit,
    reset,
    setFocus,
    setValue,
    getValues,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(expenseSchema),
    defaultValues: { amount: '', date: today(), category: DEFAULT_CATEGORY, note: '' },
  })

  useEffect(() => {
    const selectedCategory = getValues('category')
    if (categories.length) {
      const nextCategory = categories.some((category) => category.name === selectedCategory)
        ? selectedCategory
        : categories[0].name
      setValue('category', nextCategory)
    }
  }, [categories, getValues, setValue])

  useEffect(() => {
    if (editingExpense) {
      reset({
        amount: (editingExpense.amountCents / 100).toFixed(2),
        date: editingExpense.date,
        category: editingExpense.category,
        note: editingExpense.note ?? '',
      })
    }
  }, [editingExpense, reset])

  useEffect(() => {
    if (editingExpense && !editDialog.current?.open) {
      editDialog.current?.showModal()
      setFocus('amount')
    }
  }, [editingExpense, setFocus])

  async function onSubmit(data) {
    const expense = {
      amountCents: toCents(data.amount),
      date: data.date,
      category: data.category,
      note: data.note || '',
    }

    if (editingExpense) {
      await db.expenses.update(editingExpense.id, expense)
      onEditingComplete?.()
    } else {
      await db.expenses.add(expense)
    }

    onAdded?.(data.date.slice(0, 7)) // jump to the month that was just edited
    reset({ amount: '', date: data.date, category: data.category, note: '' })
    setFocus('amount')
  }

  function cancelEditing() {
    editDialog.current?.close()
    onEditingComplete?.()
    reset({ amount: '', date: today(), category: categories[0]?.name ?? DEFAULT_CATEGORY, note: '' })
  }

  function renderFields() {
    return (
      <>
        <div>
          <label htmlFor="amount" className={label}>Amount (PHP)</label>
          <input id="amount" {...register('amount')} inputMode="decimal" placeholder="0.00" autoComplete="off" className={input} />
          {errors.amount && <p className="mt-1 text-sm text-[var(--danger)]">{errors.amount.message}</p>}
        </div>

        <div>
          <label htmlFor="date" className={label}>Date</label>
          <input id="date" type="date" {...register('date')} className={input} />
          {errors.date && <p className="mt-1 text-sm text-[var(--danger)]">{errors.date.message}</p>}
        </div>

        <div>
          <label htmlFor="category" className={label}>Category</label>
          <select id="category" {...register('category')} className={input}>
            {categories.map((category) => (
              <option key={category.name} value={category.name}>{category.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="note" className={label}>Note (optional)</label>
          <input id="note" {...register('note')} maxLength={100} autoComplete="off" className={input} />
          {errors.note && <p className="mt-1 text-sm text-[var(--danger)]">{errors.note.message}</p>}
        </div>

        <div className="grid gap-2">
          <button className="cursor-pointer rounded-md bg-[var(--accent)] px-3.5 py-2.5 font-semibold text-[var(--onaccent)] hover:bg-[var(--accent-h)]">
            {editingExpense ? 'Save changes' : 'Add expense'}
          </button>
          {editingExpense && (
            <button
              type="button"
              onClick={cancelEditing}
              className="cursor-pointer rounded-md border border-[var(--line)] px-3.5 py-2.5 font-semibold hover:border-[var(--muted)]"
            >
              Cancel
            </button>
          )}
        </div>
      </>
    )
  }

  return (
    <>
      {editingExpense && (
        <dialog
          ref={editDialog}
          aria-labelledby="edit-expense-title"
          onClose={() => {
            if (editingExpense) {
              onEditingComplete?.()
              reset({ amount: '', date: today(), category: categories[0]?.name ?? DEFAULT_CATEGORY, note: '' })
            }
          }}
          className="m-auto max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-md overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--panel)] p-0 text-[var(--text)] shadow-xl backdrop:bg-black/50 sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100%-2rem)]"
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--line)] bg-[var(--panel)] px-4 py-3">
            <h2 id="edit-expense-title" className="text-base font-semibold">Edit expense</h2>
            <button
              type="button"
              onClick={cancelEditing}
              aria-label="Close edit expense"
              className="cursor-pointer rounded-md px-2 py-1 text-[var(--muted)] hover:text-[var(--text)]"
            >
              ✕
            </button>
          </div>
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="grid min-w-0 gap-3 p-4"
          >
            {renderFields()}
          </form>
        </dialog>
      )}
      {!editingExpense && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="grid min-w-0 gap-3 self-start rounded-[10px] border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-[18px]"
        >
          <h2 className="text-base font-semibold">Add expense</h2>
          {renderFields()}
        </form>
      )}
    </>
  )
}
