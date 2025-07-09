// Optimized File Upload component with performance improvements
// FRONTEND IMPROVEMENT: Enhanced performance and consistent utilities

import React, { useCallback, useState, useRef, useId, useMemo, memo } from 'react';
import { FileInputProps, FileValidationResult } from '@/types';
import classNames from 'classnames';
import {
  getFieldErrorProps,
  getErrorDisplayProps,
  getHelperTextProps,
  getFieldWrapperClasses,
  getLabelClasses,
  getRequiredIndicatorProps,
  formatFileSize,
  debounce,
} from '@/lib/ui-utils';

/**
 * Optimized File Upload component with performance improvements
 * PERFORMANCE IMPROVEMENTS:
 * - Memoized validation and formatting functions
 * - Debounced validation for better UX
 * - Memoized sub-components to prevent unnecessary re-renders
 * - Optimized drag event handlers
 * 
 * CONSISTENCY IMPROVEMENTS:
 * - Uses standardized UI utilities
 * - Consistent error handling patterns
 * - Standardized accessibility attributes
 */

interface FileListItemProps {
  file: File;
  onRemove: (file: File) => void;
  disabled?: boolean;
}

const FileListItem = memo<FileListItemProps>(({ file, onRemove, disabled }) => {
  const handleRemove = useCallback(() => {
    if (!disabled) {
      onRemove(file);
    }
  }, [file, onRemove, disabled]);

  return (
    <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
      <div className="flex items-center space-x-3 min-w-0">
        <div className="flex-shrink-0">
          <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm12 2H4v8h12V6z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white truncate">
            {file.name}
          </p>
          <p className="text-xs text-gray-400">
            {formatFileSize(file.size)}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={handleRemove}
        disabled={disabled}
        className={classNames(
          'flex-shrink-0 p-1 rounded-full text-gray-400 hover:text-red-400 transition-colors duration-200',
          {
            'cursor-not-allowed opacity-50': disabled,
            'hover:bg-gray-600': !disabled,
          }
        )}
        aria-label={`Remove ${file.name}`}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
});

FileListItem.displayName = 'FileListItem';

interface DropZoneProps {
  onDrop: (files: FileList) => void;
  isDragOver: boolean;
  setIsDragOver: (isDragOver: boolean) => void;
  disabled?: boolean;
  accept?: string;
  multiple?: boolean;
  onClick: () => void;
  maxSize: number;
}

const DropZone = memo<DropZoneProps>(({ 
  onDrop, 
  isDragOver, 
  setIsDragOver, 
  disabled, 
  accept, 
  multiple, 
  onClick,
  maxSize 
}) => {
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled, setIsDragOver]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, [disabled, setIsDragOver]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (!disabled && e.dataTransfer?.files) {
      onDrop(e.dataTransfer.files);
    }
  }, [disabled, onDrop, setIsDragOver]);

  const formattedMaxSize = useMemo(() => formatFileSize(maxSize), [maxSize]);

  return (
    <div
      className={classNames(
        'relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer',
        {
          'border-gray-600 hover:border-gray-500': !isDragOver && !disabled,
          'border-blue-500 bg-blue-500/10': isDragOver && !disabled,
          'border-gray-700 bg-gray-800 cursor-not-allowed': disabled,
        }
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={!disabled ? onClick : undefined}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
    >
      <div className="space-y-3">
        <div className="mx-auto w-12 h-12">
          <svg
            className={classNames('w-full h-full', {
              'text-gray-400': !isDragOver && !disabled,
              'text-blue-500': isDragOver && !disabled,
              'text-gray-600': disabled,
            })}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>
        <div>
          <p className={classNames('text-sm font-medium', {
            'text-gray-200': !disabled,
            'text-gray-500': disabled,
          })}>
            {isDragOver ? 'Drop files here' : 'Drag files here or click to browse'}
          </p>
          <p className={classNames('text-xs mt-1', {
            'text-gray-400': !disabled,
            'text-gray-600': disabled,
          })}>
            {accept && `Supported formats: ${accept}`}
            {maxSize && ` • Max size: ${formattedMaxSize}`}
            {multiple && ` • Multiple files allowed`}
          </p>
        </div>
      </div>
    </div>
  );
});

DropZone.displayName = 'DropZone';

const FileUploadOptimized: React.FC<FileInputProps> = ({
  id,
  name,
  label,
  accept,
  multiple = false,
  files,
  onChange,
  error,
  maxSize = 5 * 1024 * 1024, // 5MB default
  maxFiles = 5,
  disabled = false,
  required = false,
  'aria-describedby': ariaDescribedBy,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const generatedId = useId();
  const inputId = id || generatedId;

  // Memoized validation function
  const validateFiles = useMemo(() => {
    return (fileList: FileList): FileValidationResult[] => {
      const results: FileValidationResult[] = [];
      const errors: string[] = [];

      if (multiple && fileList.length + files.length > maxFiles) {
        errors.push(`Maximum ${maxFiles} files allowed`);
        setValidationErrors(errors);
        return [];
      }

      Array.from(fileList).forEach((file) => {
        const result: FileValidationResult = {
          file,
          valid: true,
          errors: [],
        };

        // Size validation
        if (file.size > maxSize) {
          result.valid = false;
          result.errors.push(`File size exceeds ${formatFileSize(maxSize)}`);
        }

        // Type validation
        if (accept) {
          const acceptedTypes = accept.split(',').map(type => type.trim());
          const isValidType = acceptedTypes.some(type => {
            if (type.startsWith('.')) {
              return file.name.toLowerCase().endsWith(type.toLowerCase());
            }
            return file.type.match(type.replace('*', '.*'));
          });

          if (!isValidType) {
            result.valid = false;
            result.errors.push('File type not supported');
          }
        }

        results.push(result);
      });

      setValidationErrors(errors);
      return results;
    };
  }, [accept, maxSize, maxFiles, multiple, files.length]);

  // Debounced file processing
  const debouncedProcessFiles = useMemo(
    () => debounce((fileList: FileList) => {
      const validationResults = validateFiles(fileList);
      const validFiles = validationResults
        .filter(result => result.valid)
        .map(result => result.file);

      if (validFiles.length > 0) {
        onChange([...files, ...validFiles]);
      }
    }, 150),
    [validateFiles, onChange, files]
  );

  const handleFileSelect = useCallback((fileList: FileList) => {
    if (fileList.length > 0) {
      debouncedProcessFiles(fileList);
    }
  }, [debouncedProcessFiles]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileSelect(e.target.files);
    }
  }, [handleFileSelect]);

  const handleRemoveFile = useCallback((fileToRemove: File) => {
    onChange(files.filter(file => file !== fileToRemove));
  }, [files, onChange]);

  const openFileDialog = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  const errorProps = getErrorDisplayProps(inputId);
  const helperProps = getHelperTextProps(inputId);
  const fieldProps = getFieldErrorProps(inputId, error);

  const allErrors = [...(error ? [error] : []), ...validationErrors];

  return (
    <div className={getFieldWrapperClasses()}>
      {/* Label */}
      <label htmlFor={inputId} className={getLabelClasses(disabled, required)}>
        {label}
        {required && <span {...getRequiredIndicatorProps()} />}
      </label>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        id={inputId}
        name={name}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleInputChange}
        disabled={disabled}
        className="sr-only"
        {...fieldProps}
        aria-describedby={classNames(
          allErrors.length > 0 && errorProps.id,
          ariaDescribedBy,
          helperProps.id
        ).trim() || undefined}
      />

      {/* Drop Zone */}
      <DropZone
        onDrop={handleFileSelect}
        isDragOver={isDragOver}
        setIsDragOver={setIsDragOver}
        disabled={disabled}
        accept={accept}
        multiple={multiple}
        onClick={openFileDialog}
        maxSize={maxSize}
      />

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-200">
            Selected Files ({files.length})
          </h4>
          <div className="space-y-2">
            {files.map((file, index) => (
              <FileListItem
                key={`${file.name}-${file.size}-${index}`}
                file={file}
                onRemove={handleRemoveFile}
                disabled={disabled}
              />
            ))}
          </div>
        </div>
      )}

      {/* Helper Text */}
      <div {...helperProps} className="text-xs text-gray-400">
        {accept && `Supported: ${accept}`}
        {maxSize && ` • Max: ${formatFileSize(maxSize)}`}
        {multiple && ` • Max files: ${maxFiles}`}
      </div>

      {/* Error Messages */}
      {allErrors.length > 0 && (
        <div {...errorProps} className="space-y-1">
          {allErrors.map((errorMessage, index) => (
            <div key={index} className="text-sm text-red-400 flex items-center space-x-1">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path 
                  fillRule="evenodd" 
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" 
                  clipRule="evenodd" 
                />
              </svg>
              <span>{errorMessage}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUploadOptimized;