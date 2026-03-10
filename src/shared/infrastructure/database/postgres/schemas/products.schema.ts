import { timestamp } from 'drizzle-orm/pg-core';
import {
  uuid,
  varchar,
  pgTable,
  integer,
  text,
  boolean,
} from 'drizzle-orm/pg-core';

export const products = pgTable('products', {
  id: uuid('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description').notNull(),
  sku: varchar('sku', { length: 100 }).notNull().unique(),
  priceAmount: integer('price_amount').notNull(),
  priceCurrency: varchar('price_currency', { length: 3 })
    .notNull()
    .default('USD'),
  stock: integer('stock').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  lowStockThreshold: integer('low_stock_treshold').notNull().default(5),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
