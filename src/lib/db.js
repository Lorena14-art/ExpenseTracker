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

db.on('versionchange', () => db.close())

const DEFAULT_CATEGORIES = [
  { name: 'Food', color: '#f97316' },
  { name: 'Transport', color: '#3b82f6' },
  { name: 'Bills', color: '#ef4444' },
  { name: 'Shopping', color: '#a855f7' },
  { name: 'Health', color: '#10b981' },
  { name: 'Other', color: '#6b7280' },
]

export const DEFAULT_CATEGORY = 'Food'
