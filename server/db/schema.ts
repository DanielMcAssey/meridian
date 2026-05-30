import { sql } from 'drizzle-orm'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id:              text('id').primaryKey(),
  name:            text('name').notNull(),
  firstSeen:       integer('first_seen').notNull().default(sql`(unixepoch())`),
  lastSeen:        integer('last_seen').notNull().default(sql`(unixepoch())`),
  recoveryCode:    text('recovery_code'),
  linkFailCount:   integer('link_fail_count').notNull().default(0),
  linkLockedUntil: integer('link_locked_until'),
})

export const scores = sqliteTable('scores', {
  id:         integer('id').primaryKey({ autoIncrement: true }),
  name:       text('name').notNull(),
  score:      integer('score').notNull(),
  correct:    integer('correct').notNull(),
  total:      integer('total').notNull(),
  mode:       text('mode',       { enum: ['flag', 'pin', 'cart', 'shape', 'capital', 'region', 'language', 'province', 'mixed'] }).notNull(),
  difficulty: text('difficulty', { enum: ['easy', 'medium', 'hard', 'expert'] }).notNull(),
  createdAt:  integer('created_at').notNull().default(sql`(unixepoch())`),
  userId:     text('user_id').notNull().references(() => users.id),
  gameToken:  text('game_token').unique(),
})
