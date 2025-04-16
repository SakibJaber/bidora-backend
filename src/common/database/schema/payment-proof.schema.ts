import {
    pgTable, serial, integer, varchar, timestamp,
  } from 'drizzle-orm/pg-core';
  import { users } from './user.schema';
  
  export const paymentProofs = pgTable('payment_proofs', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id).notNull(),
  
    imagePublicId: varchar('image_public_id', { length: 255 }).notNull(),
    imageUrl: varchar('image_url', { length: 255 }).notNull(),
  
    status: varchar('status', {
      enum: ['Pending', 'Approved', 'Rejected', 'Settled'],
    }).default('Pending'),
  
    amount: integer('amount'),
    comment: varchar('comment', { length: 1000 }),
  
    uploadedAt: timestamp('uploaded_at', { withTimezone: true }).defaultNow(),
  });
  