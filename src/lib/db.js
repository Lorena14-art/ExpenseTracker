import Dexie from 'dexie'

export const db = new Dexie('expenseTracker')
db.version(1).stores({
  expenses: '++id, date, category', // indexed fields
})
db.version(2).stores({
  expenses: '++id, date, category',
  budgets: 'month',
})
db.version(3)
  .stores({
    expenses: '++id, date, category',
    budgets: 'month',
    categories: 'name',
  })
  .upgrade(async (transaction) => {
    await transaction.table('categories').bulkPut(DEFAULT_CATEGORIES)
  })
db.version(4).stores({
  expenses: '++id, date, category, [recurringId+recurringMonth]',
  budgets: 'month',
  categories: 'name',
  recurringExpenses: '++id, category',
  recurringOccurrences: '[recurringId+month], recurringId, month',
})
db.version(5)
  .stores({
    expenses: '++id, date, category, [recurringId+recurringMonth]',
    budgets: 'month',
    categories: 'name',
    recurringExpenses: '++id, category',
    recurringOccurrences: '[recurringId+month], recurringId, month',
  })
  .upgrade(async (transaction) => {
    const categories = transaction.table('categories')
    if (await categories.count() === 0) {
      await categories.bulkPut(DEFAULT_CATEGORIES)
    }
  })
db.version(6)
  .stores({
    expenses: '++id, date, category, [recurringId+recurringMonth]',
    budgets: 'month',
    categories: 'name',
    recurringExpenses: '++id, category',
    recurringOccurrences: '[recurringId+month], recurringId, month',
  })
  .upgrade(async (transaction) => {
    const categories = transaction.table('categories')
    for (const defaultCategory of DEFAULT_CATEGORIES) {
      const existing = await categories.get(defaultCategory.name)
      if (!existing) {
        await categories.add(defaultCategory)
      } else if (!/^#[0-9a-f]{6}$/i.test(existing.color ?? '')) {
        await categories.put({ ...existing, color: defaultCategory.color })
      }
    }
  })

db.on('versionchange', () => db.close())

const DEFAULT_CATEGORIES = [
  { name: 'Food', color: '#f97316' },
  { name: 'Transport', color: '#3b82f6' },
  { name: 'Bills', color: '#ef4444' },
  { name: 'Shopping', color: '#a855f7' },
  { name: 'Health', color: '#10b981' },
  { name: 'Entertainment', color: '#ec4899' },
  { name: 'Education', color: '#6366f1' },
  { name: 'Travel', color: '#14b8a6' },
  { name: 'Personal Care', color: '#eab308' },
  { name: 'Other', color: '#6b7280' },
]

export const DEFAULT_CATEGORY = 'Food'
