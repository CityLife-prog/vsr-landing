/**
 * Cloud Storage Provider Interface - Infrastructure Layer
 * Multi-cloud storage abstraction for files and assets
 */

export interface CloudStorageProvider {
  // Basic file operations
  upload(key: string, data: Buffer, options?: UploadOptions): Promise<UploadResult>;
  download(key: string): Promise<DownloadResult>;
  delete(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  
  // File metadata
  getMetadata(key: string): Promise<FileMetadata | null>;
  updateMetadata(key: string, metadata: Partial<FileMetadata>): Promise<void>;
  
  // URL operations
  getSignedUrl(key: string, operation: 'read' | 'write', expiresIn?: number): Promise<string>;
  getPublicUrl(key: string): string;
  
  // Batch operations
  uploadBatch(files: BatchUploadItem[]): Promise<BatchUploadResult>;
  deleteBatch(keys: string[]): Promise<BatchDeleteResult>;
  
  // Directory operations
  listFiles(prefix?: string, options?: ListOptions): Promise<ListResult>;
  copyFile(sourceKey: string, destinationKey: string): Promise<void>;
  moveFile(sourceKey: string, destinationKey: string): Promise<void>;
  
  // Administrative
  getBucketInfo(): Promise<BucketInfo>;
  getUsageStats(): Promise<UsageStats>;
}

export interface UploadOptions {
  contentType?: string;
  contentEncoding?: string;
  cacheControl?: string;
  metadata?: Record<string, string>;
  tags?: Record<string, string>;
  storageClass?: StorageClass;
  encryption?: EncryptionOptions;
  acl?: AccessControlLevel;
}

export interface EncryptionOptions {
  algorithm?: 'AES256' | 'aws:kms';
  kmsKeyId?: string;
}

export enum StorageClass {
  STANDARD = 'standard',
  REDUCED_REDUNDANCY = 'reduced_redundancy',
  INFREQUENT_ACCESS = 'infrequent_access',
  GLACIER = 'glacier',
  DEEP_ARCHIVE = 'deep_archive',
  COLD = 'cold',
  HOT = 'hot'
}

export enum AccessControlLevel {
  PRIVATE = 'private',
  PUBLIC_READ = 'public-read',
  PUBLIC_READ_WRITE = 'public-read-write',
  AUTHENTICATED_READ = 'authenticated-read'
}

export interface UploadResult {
  key: string;
  url: string;
  etag: string;
  size: number;
  contentType: string;
  lastModified: Date;
  metadata: Record<string, string>;
}

export interface DownloadResult {
  data: Buffer;
  metadata: FileMetadata;
  contentType: string;
  contentLength: number;
  etag: string;
  lastModified: Date;
}

export interface FileMetadata {
  key: string;
  size: number;
  contentType: string;
  etag: string;
  lastModified: Date;
  storageClass: StorageClass;
  metadata: Record<string, string>;
  tags: Record<string, string>;
  isPublic: boolean;
}

export interface BatchUploadItem {
  key: string;
  data: Buffer;
  options?: UploadOptions;
}

export interface BatchUploadResult {
  successful: UploadResult[];
  failed: Array<{
    key: string;
    error: string;
  }>;
  totalUploaded: number;
  totalFailed: number;
}

export interface BatchDeleteResult {
  successful: string[];
  failed: Array<{
    key: string;
    error: string;
  }>;
  totalDeleted: number;
  totalFailed: number;
}

export interface ListOptions {
  maxKeys?: number;
  continuationToken?: string;
  delimiter?: string;
  includeMetadata?: boolean;
}

export interface ListResult {
  files: FileMetadata[];
  continuationToken?: string;
  hasMore: boolean;
  totalCount: number;
  totalSize: number;
}

export interface BucketInfo {
  name: string;
  region: string;
  provider: CloudStorageProviderType;
  createdAt: Date;
  versioning: boolean;
  encryption: boolean;
  publicAccess: boolean;
}

export interface UsageStats {
  totalFiles: number;
  totalSize: number;
  storageClasses: Record<StorageClass, {
    files: number;
    size: number;
  }>;
  bandwidthUsage: {
    upload: number;
    download: number;
  };
  requestCounts: {
    read: number;
    write: number;
    delete: number;
  };
  costs: {
    storage: number;
    bandwidth: number;
    requests: number;
    total: number;
  };
}

export enum CloudStorageProviderType {
  AWS_S3 = 'aws_s3',
  GOOGLE_CLOUD_STORAGE = 'google_cloud_storage',
  AZURE_BLOB = 'azure_blob',
  CLOUDFLARE_R2 = 'cloudflare_r2',
  DIGITALOCEAN_SPACES = 'digitalocean_spaces',
  BACKBLAZE_B2 = 'backblaze_b2',
  VERCEL_BLOB = 'vercel_blob',
  SUPABASE_STORAGE = 'supabase_storage',
  LOCAL_FILESYSTEM = 'local_filesystem'
}

export interface CloudStorageConfig {
  provider: CloudStorageProviderType;
  bucket: string;
  region?: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  token?: string;
  credentials?: string;
  defaultStorageClass?: StorageClass;
  defaultACL?: AccessControlLevel;
  maxFileSize?: number;
  allowedFileTypes?: string[];
  baseUrl?: string;
  cdnUrl?: string;
  encryption?: EncryptionOptions;
}

export abstract class CloudStorageError extends Error {
  abstract readonly errorCode: string;
  
  constructor(
    message: string,
    public readonly key?: string,
    public readonly operation?: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class CloudStorageConnectionError extends CloudStorageError {
  readonly errorCode = 'CLOUD_STORAGE_CONNECTION_ERROR';
}

export class CloudStorageOperationError extends CloudStorageError {
  readonly errorCode = 'CLOUD_STORAGE_OPERATION_ERROR';
}

export class CloudStorageNotFoundError extends CloudStorageError {
  readonly errorCode = 'CLOUD_STORAGE_NOT_FOUND';
}

export class CloudStoragePermissionError extends CloudStorageError {
  readonly errorCode = 'CLOUD_STORAGE_PERMISSION_ERROR';
}

export class CloudStorageQuotaError extends CloudStorageError {
  readonly errorCode = 'CLOUD_STORAGE_QUOTA_ERROR';
}