import { z } from 'zod'

export const expenseSchema = z.object({
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Enter an amount greater than 0, like 12.50')
    .refine((v) => Number(v) > 0, 'Amount must be greater than 0'),
  date: z.string().min(1, 'Pick a date'),
  category: z.string().min(1, 'Pick a category'),
  note: z.string().max(100, 'Max 100 characters').optional(),
})
