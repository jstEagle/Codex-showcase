import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import type {
  ProjectArtifact,
  ProjectLink,
  ProjectMedia,
  ProjectMetrics,
  ProjectThread,
} from '../projects'

export const projects = sqliteTable(
  'projects',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    author: text('author').notNull(),
    maker: text('maker').notNull(),
    category: text('category').notNull().default('Project'),
    cardAnimation: text('card_animation').notNull().default('liquid'),
    status: text('status', { enum: ['featured', 'popular', 'new'] })
      .notNull()
      .default('new'),
    stack: text('stack', { mode: 'json' }).$type<Array<string>>().notNull(),
    links: text('links', { mode: 'json' })
      .$type<Array<ProjectLink>>()
      .notNull(),
    media: text('media', { mode: 'json' })
      .$type<Array<ProjectMedia>>()
      .notNull(),
    heroImageUrl: text('hero_image_url'),
    metrics: text('metrics', { mode: 'json' })
      .$type<ProjectMetrics>()
      .notNull(),
    artifact: text('artifact', { mode: 'json' }).$type<ProjectArtifact>(),
    projectMarkdown: text('project_markdown'),
    storyThreadCount: integer('story_thread_count').notNull().default(0),
    storyTurnCount: integer('story_turn_count').notNull().default(0),
    storyExcerpt: text('story_excerpt', { mode: 'json' })
      .$type<Array<ProjectThread>>()
      .notNull(),
    published: integer('published', { mode: 'boolean' })
      .notNull()
      .default(false),
    publishedAt: text('published_at'),
    ownerClerkId: text('owner_clerk_id').notNull(),
    ownerName: text('owner_name'),
    ownerEmail: text('owner_email').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('projects_published_idx').on(table.published, table.publishedAt),
    index('projects_owner_idx').on(table.ownerClerkId, table.updatedAt),
    index('projects_category_idx').on(table.category),
  ],
)

export const projectMedia = sqliteTable(
  'project_media',
  {
    objectKey: text('object_key').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
  },
  (table) => [index('project_media_project_idx').on(table.projectId)],
)

export type ProjectRow = typeof projects.$inferSelect
