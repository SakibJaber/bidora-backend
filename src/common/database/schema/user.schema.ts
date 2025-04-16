import {
    pgTable, serial, varchar, timestamp, json, integer,
  } from 'drizzle-orm/pg-core';
  
  export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    userName: varchar('user_name', { length: 40 }).notNull(),
    password: varchar('password', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }),
    address: varchar('address', { length: 255 }),
    phone: varchar('phone', { length: 11 }),
  
    profileImagePublicId: varchar('profile_image_public_id', { length: 255 }).notNull(),
    profileImageUrl: varchar('profile_image_url', { length: 255 }).notNull(),
  
    paymentMethods: json('payment_methods'),
  
    role: varchar('role', {
      enum: ['Auctioneer', 'Bidder', 'Super Admin'],
    }).notNull(),
  
    unpaidCommission: integer('unpaid_commission').default(0),
    auctionsWon: integer('auctions_won').default(0),
    moneySpent: integer('money_spent').default(0),
  
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  });
  