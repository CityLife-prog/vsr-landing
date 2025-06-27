/**
 * Repository Base Classes - Infrastructure Layer
 * Generic repository implementations for different database providers
 */

import { DatabaseConnection, DatabaseTransaction, QueryResult } from './DatabaseConnection';
import { UniqueEntityId } from '../../domain/shared/UniqueEntityId';

export interface RepositoryOptions {
  tableName: string;
  primaryKey?: string;
  connection?: DatabaseConnection;
  useTransactions?: boolean;
  cacheResults?: boolean;
  cacheTTL?: number;
}

export interface QueryOptions {
  transaction?: DatabaseTransaction;
  timeout?: number;
  retries?: number;
}

export interface PaginationParams {
  page: number;
  limit: number;
  offset?: number;
}

export interface SortingParams {
  field: string;
  direction: 'ASC' | 'DESC';
}

export interface FilterParams {
  field: string;
  operator: FilterOperator;
  value: unknown;
  logical?: 'AND' | 'OR';
}

export enum FilterOperator {
  EQUALS = '=',
  NOT_EQUALS = '!=',
  GREATER_THAN = '>',
  GREATER_THAN_OR_EQUAL = '>=',
  LESS_THAN = '<',
  LESS_THAN_OR_EQUAL = '<=',
  LIKE = 'LIKE',
  ILIKE = 'ILIKE',
  IN = 'IN',
  NOT_IN = 'NOT IN',
  IS_NULL = 'IS NULL',
  IS_NOT_NULL = 'IS NOT NULL',
  BETWEEN = 'BETWEEN'
}

export interface RepositoryResult<T> {
  items: T[];
  total: number;
  page?: number;
  limit?: number;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

export abstract class BaseRepository<TEntity, TId = string> {
  protected readonly tableName: string;
  protected readonly primaryKey: string;
  protected readonly connection: DatabaseConnection;
  protected readonly useTransactions: boolean;

  constructor(options: RepositoryOptions) {
    this.tableName = options.tableName;
    this.primaryKey = options.primaryKey || 'id';
    this.connection = options.connection!;
    this.useTransactions = options.useTransactions ?? true;
  }

  // Abstract methods that must be implemented
  abstract toDomainEntity(row: Record<string, unknown>): TEntity;
  abstract toPersistenceModel(entity: TEntity): Record<string, unknown>;
  abstract getEntityId(entity: TEntity): TId;

  // Core CRUD operations
  async findById(id: TId, options?: QueryOptions): Promise<TEntity | null> {
    const sql = `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = $1`;
    const result = await this.executeQuery<Record<string, unknown>>(sql, [id], options);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.toDomainEntity(result.rows[0]);
  }

  async findMany(
    filters?: FilterParams[],
    sorting?: SortingParams[],
    pagination?: PaginationParams,
    options?: QueryOptions
  ): Promise<RepositoryResult<TEntity>> {
    const query = this.buildSelectQuery(filters, sorting, pagination);
    const countQuery = this.buildCountQuery(filters);

    const [dataResult, countResult] = await Promise.all([
      this.executeQuery<Record<string, unknown>>(query.sql, query.params, options),
      this.executeQuery<{ count: number }>(countQuery.sql, countQuery.params, options)
    ]);

    const items = dataResult.rows.map(row => this.toDomainEntity(row));
    const total = parseInt(countResult.rows[0].count.toString());

    return {
      items,
      total,
      page: pagination?.page,
      limit: pagination?.limit,
      hasNext: pagination ? (pagination.page * pagination.limit) < total : false,
      hasPrevious: pagination ? pagination.page > 1 : false
    };
  }

  async save(entity: TEntity, options?: QueryOptions): Promise<void> {
    const data = this.toPersistenceModel(entity);
    const id = this.getEntityId(entity);

    // Check if entity exists
    const existing = await this.findById(id, options);
    
    if (existing) {
      await this.update(id, data, options);
    } else {
      await this.insert(data, options);
    }
  }

  async delete(id: TId, options?: QueryOptions): Promise<boolean> {
    const sql = `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = $1`;
    const result = await this.executeCommand(sql, [id], options);
    return result.affectedRows > 0;
  }

  async exists(id: TId, options?: QueryOptions): Promise<boolean> {
    const sql = `SELECT 1 FROM ${this.tableName} WHERE ${this.primaryKey} = $1 LIMIT 1`;
    const result = await this.executeQuery(sql, [id], options);
    return result.rows.length > 0;
  }

  async count(filters?: FilterParams[], options?: QueryOptions): Promise<number> {
    const query = this.buildCountQuery(filters);
    const result = await this.executeQuery<{ count: number }>(query.sql, query.params, options);
    return parseInt(result.rows[0].count.toString());
  }

  // Batch operations
  async saveMany(entities: TEntity[], options?: QueryOptions): Promise<void> {
    if (entities.length === 0) return;

    const transaction = options?.transaction || await this.connection.beginTransaction();
    const shouldCommit = !options?.transaction;

    try {
      for (const entity of entities) {
        await this.save(entity, { ...options, transaction });
      }

      if (shouldCommit) {
        await transaction.commit();
      }
    } catch (error) {
      if (shouldCommit) {
        await transaction.rollback();
      }
      throw error;
    }
  }

  async deleteMany(ids: TId[], options?: QueryOptions): Promise<number> {
    if (ids.length === 0) return 0;

    const placeholders = ids.map((_, index) => `$${index + 1}`).join(',');
    const sql = `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} IN (${placeholders})`;
    const result = await this.executeCommand(sql, ids, options);
    return result.affectedRows;
  }

  // Protected helper methods
  protected async insert(data: Record<string, unknown>, options?: QueryOptions): Promise<void> {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(',');

    const sql = `
      INSERT INTO ${this.tableName} (${fields.join(',')})
      VALUES (${placeholders})
    `;

    await this.executeCommand(sql, values, options);
  }

  protected async update(id: TId, data: Record<string, unknown>, options?: QueryOptions): Promise<void> {
    const fields = Object.keys(data);
    const values = Object.values(data);
    
    const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(',');
    const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE ${this.primaryKey} = $${fields.length + 1}`;
    
    await this.executeCommand(sql, [...values, id], options);
  }

  protected buildSelectQuery(
    filters?: FilterParams[],
    sorting?: SortingParams[],
    pagination?: PaginationParams
  ): { sql: string; params: unknown[] } {
    let sql = `SELECT * FROM ${this.tableName}`;
    const params: unknown[] = [];
    let paramIndex = 1;

    // Add WHERE clause
    if (filters && filters.length > 0) {
      const whereClause = this.buildWhereClause(filters, paramIndex);
      sql += ` WHERE ${whereClause.clause}`;
      params.push(...whereClause.params);
      paramIndex += whereClause.params.length;
    }

    // Add ORDER BY clause
    if (sorting && sorting.length > 0) {
      const orderBy = sorting.map(sort => `${sort.field} ${sort.direction}`).join(',');
      sql += ` ORDER BY ${orderBy}`;
    }

    // Add pagination
    if (pagination) {
      const offset = pagination.offset ?? (pagination.page - 1) * pagination.limit;
      sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(pagination.limit, offset);
    }

    return { sql, params };
  }

  protected buildCountQuery(filters?: FilterParams[]): { sql: string; params: unknown[] } {
    let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    const params: unknown[] = [];

    if (filters && filters.length > 0) {
      const whereClause = this.buildWhereClause(filters, 1);
      sql += ` WHERE ${whereClause.clause}`;
      params.push(...whereClause.params);
    }

    return { sql, params };
  }

  protected buildWhereClause(filters: FilterParams[], startParamIndex: number): { clause: string; params: unknown[] } {
    const clauses: string[] = [];
    const params: unknown[] = [];
    let paramIndex = startParamIndex;

    for (let i = 0; i < filters.length; i++) {
      const filter = filters[i];
      const logical = i > 0 ? (filter.logical || 'AND') : '';

      let clause: string;
      switch (filter.operator) {
        case FilterOperator.IS_NULL:
          clause = `${filter.field} IS NULL`;
          break;
        case FilterOperator.IS_NOT_NULL:
          clause = `${filter.field} IS NOT NULL`;
          break;
        case FilterOperator.IN:
        case FilterOperator.NOT_IN:
          if (Array.isArray(filter.value)) {
            const placeholders = filter.value.map(() => `$${paramIndex++}`).join(',');
            clause = `${filter.field} ${filter.operator} (${placeholders})`;
            params.push(...filter.value);
          } else {
            throw new Error(`${filter.operator} requires array value`);
          }
          break;
        case FilterOperator.BETWEEN:
          if (Array.isArray(filter.value) && filter.value.length === 2) {
            clause = `${filter.field} BETWEEN $${paramIndex++} AND $${paramIndex++}`;
            params.push(filter.value[0], filter.value[1]);
          } else {
            throw new Error('BETWEEN requires array with exactly 2 values');
          }
          break;
        default:
          clause = `${filter.field} ${filter.operator} $${paramIndex++}`;
          params.push(filter.value);
      }

      if (logical && clauses.length > 0) {
        clauses.push(`${logical} ${clause}`);
      } else {
        clauses.push(clause);
      }
    }

    return { clause: clauses.join(' '), params };
  }

  protected async executeQuery<T>(sql: string, params?: unknown[], options?: QueryOptions): Promise<QueryResult<T>> {
    if (options?.transaction) {
      return options.transaction.query<T>(sql, params);
    }
    return this.connection.query<T>(sql, params);
  }

  protected async executeCommand(sql: string, params?: unknown[], options?: QueryOptions) {
    if (options?.transaction) {
      return options.transaction.execute(sql, params);
    }
    return this.connection.execute(sql, params);
  }
}