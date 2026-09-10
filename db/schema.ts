import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const statuses = sqliteTable('router_status', {
  id: text('id').primaryKey(),
  commission: integer('commission', { mode: 'boolean' }).notNull(),
  handover: integer('handover', { mode: 'boolean' }).notNull(),
  updatedAt: text('updated_at').notNull(),
  updatedBy: text('updated_by'),
  commissionedAt: text('commissioned_at'),
  handedOverAt: text('handed_over_at'),
  // Where the router sat in the sheet when last saved; used to re-link the
  // record if its IP (and therefore its id) changes in the sheet.
  sourcePhase: integer('source_phase'),
  row: integer('row'),
  name: text('name'),
});
export const history = sqliteTable('status_history', {
  id: text('id').primaryKey(),
  routerId: text('router_id').notNull(),
  commission: integer('commission', { mode: 'boolean' }).notNull(),
  handover: integer('handover', { mode: 'boolean' }).notNull(),
  action: text('action').notNull(),
  at: text('at').notNull(),
  by: text('by'),
});
