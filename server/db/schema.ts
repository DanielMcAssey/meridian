import { sql } from 'drizzle-orm'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const scores = sqliteTable('scores', {
  id:         integer('id').primaryKey({ autoIncrement: true }),
  name:       text('name').notNull(),
  score:      integer('score').notNull(),
  correct:    integer('correct').notNull(),
  total:      integer('total').notNull(),
  mode:       text('mode',       { enum: ['flag', 'pin', 'cart', 'mixed']     }).notNull(),
  difficulty: text('difficulty', { enum: ['easy', 'medium', 'hard', 'expert'] }).notNull(),
  createdAt:  integer('created_at').notNull().default(sql`(unixepoch())`),
})
