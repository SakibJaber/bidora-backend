import {
  pgTable,
  serial,
  integer,
  varchar,
  timestamp,
} from 'drizzle-orm/pg-core';
import { users } from './user.schema';
import { auctions } from './auction.schema';
import { InferInsertModel } from 'drizzle-orm';

export const bids = pgTable('bids', {
  id: serial('id').primaryKey(),
  auctionId: integer('auction_id')
    .references(() => auctions.id)
    .notNull(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  amount: integer('amount').notNull(),

  userName: varchar('user_name', { length: 255 }),
  profileImage: varchar('profile_image', { length: 255 }),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});



export type InsertBid = InferInsertModel<typeof bids>;