import { sql } from 'drizzle-orm'
import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id:              text('id').primaryKey(),
  name:            text('name').notNull(),
  bio:             text('bio'),
  countryCode:     text('country_code'),
  firstSeen:       integer('first_seen').notNull().default(sql`(unixepoch())`),
  lastSeen:        integer('last_seen').notNull().default(sql`(unixepoch())`),
  recoveryCode:    text('recovery_code'),
  linkFailCount:   integer('link_fail_count').notNull().default(0),
  linkLockedUntil: integer('link_locked_until'),
})

export const userStats = sqliteTable('user_stats', {
  userId:             text('user_id').primaryKey().references(() => users.id),
  totalGames:         integer('total_games').notNull().default(0),
  totalCorrect:       integer('total_correct').notNull().default(0),
  totalRounds:        integer('total_rounds').notNull().default(0),
  bestScore:          integer('best_score').notNull().default(0),
  favoriteMode:       text('favorite_mode'),
  favoriteDifficulty: text('favorite_difficulty'),
  updatedAt:          integer('updated_at').notNull().default(sql`(unixepoch())`),
})

export const scores = sqliteTable('scores', {
  id:         integer('id').primaryKey({ autoIncrement: true }),
  score:      integer('score').notNull(),
  correct:    integer('correct').notNull(),
  total:      integer('total').notNull(),
  mode:       text('mode',       { enum: ['flag', 'pin', 'cart', 'shape', 'capital', 'region', 'language', 'province', 'mixed'] }).notNull(),
  difficulty: text('difficulty', { enum: ['easy', 'medium', 'hard', 'expert'] }).notNull(),
  createdAt:  integer('created_at').notNull().default(sql`(unixepoch())`),
  userId:     text('user_id').notNull().references(() => users.id),
  gameToken:  text('game_token').unique(),
})

export const userAchievements = sqliteTable('user_achievements', {
  userId:        text('user_id').notNull().references(() => users.id),
  achievementId: text('achievement_id').notNull(),
  unlockedAt:    integer('unlocked_at').notNull().default(sql`(unixepoch())`),
}, (t) => [primaryKey({ columns: [t.userId, t.achievementId] })])
