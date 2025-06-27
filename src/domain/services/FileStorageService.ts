/**
 * File Storage Service Interface - Domain Service
 * Clean Architecture: Domain service for file operations
 */

export interface FileMetadata {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  uploadedAt: Date;
  uploadedBy?: string;
}

export interface UploadedFile {
  id: string;
  url: string;
  metadata: FileMetadata;
}

export interface FileStorageService {
  uploadFile(
    file: Buffer,
    filename: string,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<UploadedFile>;
  
  downloadFile(fileId: string): Promise<Buffer>;
  getFileMetadata(fileId: string): Promise<FileMetadata | null>;
  deleteFile(fileId: string): Promise<void>;
  generateSignedUrl(fileId: string, expiresIn?: number): Promise<string>;
}

export interface FileValidationRule {
  maxSize: number; // in bytes
  allowedTypes: string[];
  allowedExtensions: string[];
}

export interface FileValidator {
  validateFile(file: Buffer, filename: string, contentType: string): FileValidationResult;
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class FileValidationError extends Error {
  constructor(
    public readonly errors: string[],
    public readonly warnings: string[]
  ) {
    super(`File validation failed: ${errors.join(', ')}`);
  }
}