import { integer, sqliteTable, text, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const mailSettings = sqliteTable('mail_settings', {
  id: text('id').primaryKey(),
  clientSecret: text('client_secret').notNull(),
  refreshToken: text('refresh_token'),
  sender: text('sender'),
  updatedAt: integer('updated_at').notNull(),
  lastAttemptAt: integer('last_attempt_at'),
  lastTestAt: integer('last_test_at'),
  lastMessageId: text('last_message_id'),
});
export const mailOAuth = sqliteTable('mail_oauth', {
  stateHash: text('state_hash').primaryKey(),
  owner: text('owner').notNull(),
  verifier: text('verifier').notNull(),
  expiresAt: integer('expires_at').notNull(),
});

export const users = sqliteTable('users', {
  id:text('id').primaryKey(), email:text('email').notNull().unique(), name:text('name').notNull(),
  birthDate:text('birth_date').notNull(), school:text('school').notNull(), grade:text('grade').notNull(), address:text('address').notNull(),
  passwordHash:text('password_hash').notNull(), verified:integer('verified').notNull().default(0), createdAt:integer('created_at').notNull(),
  savedState:text('saved_state').notNull().default('{}'), completed:text('completed').notNull().default('{}'),
});
export const userPublicProfiles = sqliteTable('user_public_profiles', {
  userId:text('user_id').primaryKey().references(()=>users.id,{onDelete:'cascade'}),
  nick:text('nick').notNull(),
},t=>[uniqueIndex('user_public_profiles_nick_unique').on(t.nick)]);
export const sessions = sqliteTable('sessions', { hash:text('hash').primaryKey(), userId:text('user_id').notNull().references(()=>users.id,{onDelete:'cascade'}), expiresAt:integer('expires_at').notNull() },t=>[index('idx_sessions_user').on(t.userId)]);
export const accountTokens = sqliteTable('account_tokens', { hash:text('hash').primaryKey(),userId:text('user_id').notNull().references(()=>users.id,{onDelete:'cascade'}),kind:text('kind').notNull(),expiresAt:integer('expires_at').notNull() });
export const groups = sqliteTable('study_groups', { id:text('id').primaryKey(),ownerId:text('owner_id').notNull().references(()=>users.id),name:text('name').notNull(),description:text('description').notNull().default(''),passwordHash:text('password_hash').notNull(),inviteHash:text('invite_hash').notNull().unique(),inviteSecret:text('invite_secret').notNull(),createdAt:integer('created_at').notNull() });
export const members = sqliteTable('group_members', { id:text('id').primaryKey(),groupId:text('group_id').notNull().references(()=>groups.id,{onDelete:'cascade'}),userId:text('user_id').notNull().references(()=>users.id,{onDelete:'cascade'}),status:text('status').notNull(),requestedAt:integer('requested_at').notNull() },t=>[index('idx_group_members_user').on(t.userId),index('idx_group_members_group_status').on(t.groupId,t.status)]);
export const attempts = sqliteTable('study_attempts', { id:text('id').primaryKey(),userId:text('user_id').notNull().references(()=>users.id,{onDelete:'cascade'}),kind:text('kind').notNull(),subject:text('subject'),topic:text('topic'),questionIds:text('question_ids').notNull(),createdAt:integer('created_at').notNull(),submitted:integer('submitted').notNull().default(0),result:text('result') });
export const ledger = sqliteTable('xp_ledger', { id:text('id').primaryKey(),userId:text('user_id').notNull().references(()=>users.id,{onDelete:'cascade'}),activityKey:text('activity_key').notNull(),xp:integer('xp').notNull(),earnedAt:integer('earned_at').notNull() }, t=>[index('idx_xp_ledger_user').on(t.userId)]);
export const rateLimits = sqliteTable('rate_limits', { key:text('key').primaryKey(),count:integer('count').notNull(),expiresAt:integer('expires_at').notNull() });
