import {
  pgTable,
  serial,
  varchar,
  numeric,
  timestamp,
  jsonb,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const roleEnum = pgEnum('role', ['Auctioneer', 'Bidder', 'Super Admin']);

export const users = pgTable('users', {
  id: serial('id').primaryKey(),

  userName: varchar('user_name', { length: 40 }).notNull(),
  password: varchar('password', { length: 255 }).notNull(),

  email: varchar('email', { length: 255 }).notNull(),

  address: varchar('address', { length: 255 }),

  phone: varchar('phone', { length: 11 }).notNull(),
  profileImagePublicId: varchar('profile_image_public_id', {
    length: 255,
  }).notNull(),
  profileImageUrl: varchar('profile_image_url', { length: 255 }).notNull(),

  paymentMethods: jsonb('payment_methods').default({}),

  role: roleEnum('role').default('Bidder'),

  unpaidCommission: numeric('unpaid_commission').default('0'),
  auctionsWon: numeric('auctions_won').default('0'),
  moneySpent: numeric('money_spent').default('0'),
  refreshToken: varchar('refresh_token', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
