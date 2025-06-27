/**
 * Enterprise Architecture Type Definitions
 * Eliminates 'any' types throughout the architecture
 */

// ================== GENERAL TYPES ==================

export type Unknown = unknown;
export type GenericObject = Record<string, unknown>;
export type GenericFunction = (...args: unknown[]) => unknown;

// ================== METRICS TYPES ==================

export interface MetricTags {
  [key: string]: string;
}

export interface MetricValue {
  value: number;
  timestamp: Date;
  tags?: MetricTags;
}

// ================== LOGGING TYPES ==================

export interface LogContext {
  [key: string]: unknown;
}

export interface LoggerInstance {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error, context?: LogContext): void;
}

// ================== DATABASE TYPES ==================

export interface DatabaseRow {
  [column: string]: unknown;
}

export interface DatabaseResult<T = DatabaseRow> {
  rows: T[];
  rowCount: number;
}

export interface QueryParameters {
  [key: string]: unknown;
}

// ================== HTTP TYPES ==================

export interface RequestHeaders {
  [header: string]: string | string[] | undefined;
}

export interface ResponseData {
  [key: string]: unknown;
}

// ================== SERVICE TYPES ==================

export interface ServiceConfiguration {
  [key: string]: unknown;
}

export interface ServiceInstance {
  [method: string]: GenericFunction;
}

// ================== EVENT TYPES ==================

export interface EventPayload {
  [key: string]: unknown;
}

export interface MessageData {
  [key: string]: unknown;
}

// ================== VALIDATION TYPES ==================

export interface ValidationResult<T = GenericObject> {
  isValid: boolean;
  data?: T;
  errors: string[];
}

export interface FormData {
  [field: string]: unknown;
}

// ================== FILE TYPES ==================

export interface FileData {
  [property: string]: unknown;
}

export interface UploadedFile {
  filepath: string;
  originalFilename: string;
  mimetype: string;
  size: number;
}

// ================== CACHE TYPES ==================

export interface CacheData {
  [key: string]: unknown;
}

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
}

// ================== MONITORING TYPES ==================

export interface MonitoringData {
  [metric: string]: unknown;
}

export interface HealthCheckData {
  [component: string]: unknown;
}

// ================== CONTAINER TYPES ==================

export interface ContainerInstance {
  [property: string]: unknown;
}

export interface ServiceFactory<T = ServiceInstance> {
  (): T;
}

// ================== ERROR TYPES ==================

export interface ErrorDetails {
  [key: string]: unknown;
}

export interface SerializedError {
  name: string;
  message: string;
  stack?: string;
  code?: string;
}

// ================== INFRASTRUCTURE TYPES ==================

export interface CloudStorageMetadata {
  [key: string]: string;
}

export interface EmailContent {
  [key: string]: unknown;
}

export interface DatabaseConnection {
  [method: string]: GenericFunction;
}

// ================== TYPE GUARDS ==================

export function isObject(value: unknown): value is GenericObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isFunction(value: unknown): value is GenericFunction {
  return typeof value === 'function';
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

// ================== UTILITY TYPES ==================

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type AsyncResult<T> = Promise<T>;
export type EventHandler<T = GenericObject> = (data: T) => void | Promise<void>;
export type AsyncEventHandler<T = GenericObject> = (data: T) => Promise<void>;

// ================== BRANDED TYPES ==================

export type TraceId = string & { readonly __brand: 'TraceId' };
export type SpanId = string & { readonly __brand: 'SpanId' };
export type CorrelationId = string & { readonly __brand: 'CorrelationId' };
export type RequestId = string & { readonly __brand: 'RequestId' };

export function createTraceId(value: string): TraceId {
  return value as TraceId;
}

export function createSpanId(value: string): SpanId {
  return value as SpanId;
}

export function createCorrelationId(value: string): CorrelationId {
  return value as CorrelationId;
}

export function createRequestId(value: string): RequestId {
  return value as RequestId;
}