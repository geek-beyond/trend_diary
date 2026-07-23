import type { RdbClient } from '@trend-diary/datastore/rdb'
import CommandImpl from './infrastructure/command-impl'
import QueryImpl from './infrastructure/query-impl'
import { UseCase } from './use-case'

export function createArticleUseCase(db: RdbClient): UseCase {
  const articleQuery = new QueryImpl(db)
  const articleCommand = new CommandImpl(db)
  return new UseCase(articleQuery, articleCommand)
}

export { ArticleNotFoundError, ArticleRepositoryError } from './error'
export type { Article } from './schema/article-schema'
export type { QueryParams } from './schema/query-schema'
