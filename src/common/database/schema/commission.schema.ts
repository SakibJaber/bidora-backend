import { pgTable, serial, integer, timestamp } from 'drizzle-orm/pg-core';
import { users } from './user.schema';

export const commissions = pgTable('commissions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  amount: integer('amount').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
