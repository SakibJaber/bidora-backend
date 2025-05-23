import {
  pgTable,
  serial,
  varchar,
  integer,
  timestamp,
  boolean,
  pgEnum,
  text,

} from 'drizzle-orm/pg-core';

export const conditionEnum = pgEnum('condition', ['New', 'Used']);

export const auctions = pgTable('auctions', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: varchar('description', { length: 1000 }),
  startingBid: integer('starting_bid').notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  condition: conditionEnum('condition').notNull(),
  currentBid: integer('current_bid').default(0),
  startTime: varchar('start_time', { length: 50 }).notNull(),
  endTime: varchar('end_time', { length: 50 }).notNull(),
  imagePublicId: varchar('image_public_id', { length: 255 }).notNull(),
  imageUrl: varchar('image_url', { length: 255 }).notNull(),
  createdBy: integer('created_by').notNull(),
  highestBidderId: integer('highest_bidder_id').notNull(),
  commissionCalculated: boolean('commission_calculated').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});


export type Auction = typeof auctions.$inferSelect;