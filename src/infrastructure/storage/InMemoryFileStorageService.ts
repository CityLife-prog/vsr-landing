/**
 * In-Memory File Storage Service - Infrastructure Layer
 * Clean Architecture: Development/testing implementation of file storage
 */

import { 
  FileStorageService, 
  FileMetadata, 
  UploadedFile,
  FileValidator,
  FileValidationResult,
  FileValidationRule,
  FileValidationError
} from '../../domain/services/FileStorageService';
import { UniqueEntityId } from '../../domain/shared/UniqueEntityId';

interface StoredFile {
  id: string;
  content: Buffer;
  metadata: FileMetadata;
}

export class InMemoryFileStorageService implements FileStorageService {
  private files = new Map<string, StoredFile>();
  private validator: FileValidator;

  constructor() {
    this.validator = new BasicFileValidator();
  }

  async uploadFile(
    file: Buffer,
    filename: string,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<UploadedFile> {
    // Validate file
    const validationResult = this.validator.validateFile(file, filename, contentType);
    if (!validationResult.isValid) {
      throw new FileValidationError(validationResult.errors, validationResult.warnings);
    }

    const fileId = UniqueEntityId.create().toString();
    const now = new Date();

    const fileMetadata: FileMetadata = {
      id: fileId,
      filename,
      contentType,
      size: file.length,
      uploadedAt: now
    };

    const storedFile: StoredFile = {
      id: fileId,
      content: file,
      metadata: fileMetadata
    };

    this.files.set(fileId, storedFile);

    return {
      id: fileId,
      url: `file://${fileId}`, // Mock URL for development
      metadata: fileMetadata
    };
  }

  async downloadFile(fileId: string): Promise<Buffer> {
    const file = this.files.get(fileId);
    if (!file) {
      throw new Error(`File not found: ${fileId}`);
    }
    return file.content;
  }

  async getFileMetadata(fileId: string): Promise<FileMetadata | null> {
    const file = this.files.get(fileId);
    return file ? file.metadata : null;
  }

  async deleteFile(fileId: string): Promise<void> {
    if (!this.files.has(fileId)) {
      throw new Error(`File not found: ${fileId}`);
    }
    this.files.delete(fileId);
  }

  async generateSignedUrl(fileId: string, expiresIn: number = 3600): Promise<string> {
    const file = this.files.get(fileId);
    if (!file) {
      throw new Error(`File not found: ${fileId}`);
    }
    
    // Mock signed URL for development
    const expirationTime = Date.now() + (expiresIn * 1000);
    return `file://${fileId}?expires=${expirationTime}`;
  }

  // Development helper methods
  async clear(): Promise<void> {
    this.files.clear();
  }

  async count(): Promise<number> {
    return this.files.size;
  }

  async listFiles(): Promise<FileMetadata[]> {
    return Array.from(this.files.values()).map(file => file.metadata);
  }
}

class BasicFileValidator implements FileValidator {
  private readonly rules: Record<string, FileValidationRule> = {
    'resume': {
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      allowedExtensions: ['.pdf', '.doc', '.docx']
    },
    'quote-attachment': {
      maxSize: 20 * 1024 * 1024, // 20MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],
      allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf']
    }
  };

  validateFile(file: Buffer, filename: string, contentType: string): FileValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validations
    if (file.length === 0) {
      errors.push('File is empty');
    }

    if (!filename || filename.trim().length === 0) {
      errors.push('Filename is required');
    }

    if (!contentType || contentType.trim().length === 0) {
      errors.push('Content type is required');
    }

    // Size validation (general limit)
    const maxGeneralSize = 50 * 1024 * 1024; // 50MB
    if (file.length > maxGeneralSize) {
      errors.push(`File size exceeds maximum limit of ${maxGeneralSize / 1024 / 1024}MB`);
    }

    // Filename validation
    if (filename) {
      const extension = this.getFileExtension(filename);
      if (!extension) {
        warnings.push('File has no extension');
      }

      // Check for potentially dangerous extensions
      const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.vbs', '.js'];
      if (dangerousExtensions.includes(extension.toLowerCase())) {
        errors.push('File type is not allowed for security reasons');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private getFileExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex > -1 ? filename.substring(lastDotIndex) : '';
  }
}