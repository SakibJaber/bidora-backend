import { pgTable, serial, integer, timestamp, numeric } from 'drizzle-orm/pg-core';
import { users } from './user.schema';

export const commissions = pgTable('commissions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
