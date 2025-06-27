// Input validation schemas and functions for VSR Landing API
import { sanitizeText, validateEmail, validatePhone, SECURITY_CONFIG } from './security';

export interface ValidationResult<T = Record<string, unknown>> {
  isValid: boolean;
  data?: T;
  errors: string[];
}

/**
 * Validation schema for job application form
 * CRITICAL: Validates all input fields to prevent injection attacks
 */
export interface ApplicationData {
  name: string;
  email: string;
  phone: string;
  experience: string;
}

export function validateApplicationData(fields: Record<string, unknown>, files: Record<string, unknown>): {
  success: boolean;
  validatedData?: ApplicationData;
  resumeFile?: File | { filepath: string; originalFilename: string; mimetype: string; size: number };
  errors: string[];
} {
  const errors: string[] = [];
  const data: Partial<ApplicationData> = {};

  // Validate name
  const name = sanitizeText(Array.isArray(fields.name) ? fields.name[0] : fields.name);
  if (!name || name.length < 2) {
    errors.push('Name must be at least 2 characters long');
  } else if (name.length > SECURITY_CONFIG.MAX_NAME_LENGTH) {
    errors.push(`Name must be less than ${SECURITY_CONFIG.MAX_NAME_LENGTH} characters`);
  } else {
    data.name = name;
  }

  // Validate email
  const emailValidation = validateEmail(Array.isArray(fields.email) ? fields.email[0] : fields.email);
  if (!emailValidation.isValid) {
    errors.push('Valid email address is required');
  } else {
    data.email = emailValidation.sanitized;
  }

  // Validate phone
  const phoneValidation = validatePhone(Array.isArray(fields.phone) ? fields.phone[0] : fields.phone);
  if (!phoneValidation.isValid) {
    errors.push('Valid phone number is required (10 digits)');
  } else {
    data.phone = phoneValidation.sanitized;
  }

  // Validate experience
  const experience = sanitizeText(Array.isArray(fields.experience) ? fields.experience[0] : fields.experience);
  if (!experience || experience.length < 10) {
    errors.push('Experience description must be at least 10 characters long');
  } else {
    data.experience = experience;
  }

  // Handle resume file
  let resumeFile: File | { filepath: string; originalFilename: string; mimetype: string; size: number } | undefined = undefined;
  if (files.resume) {
    const resume = Array.isArray(files.resume) ? files.resume[0] : files.resume;
    resumeFile = resume;
  }

  return {
    success: errors.length === 0,
    validatedData: errors.length === 0 ? data as ApplicationData : undefined,
    resumeFile,
    errors
  };
}

/**
 * Validation schema for quote request form
 * CRITICAL: Validates all input fields to prevent injection attacks
 */
export interface QuoteData {
  fullName: string;
  email: string;
  phone: string;
  service: string;
  details: string;
}

export function validateQuoteData(fields: Record<string, unknown>, files: Record<string, unknown>): {
  success: boolean;
  validatedData?: QuoteData;
  photoFiles?: File[] | { filepath: string; originalFilename: string; mimetype: string; size: number }[];
  errors: string[];
} {
  const errors: string[] = [];
  const data: Partial<QuoteData> = {};

  // Validate full name
  const fullName = sanitizeText(Array.isArray(fields.fullName) ? fields.fullName[0] : fields.fullName);
  if (!fullName || fullName.length < 2) {
    errors.push('Full name must be at least 2 characters long');
  } else if (fullName.length > SECURITY_CONFIG.MAX_NAME_LENGTH) {
    errors.push(`Full name must be less than ${SECURITY_CONFIG.MAX_NAME_LENGTH} characters`);
  } else {
    data.fullName = fullName;
  }

  // Validate email
  const emailValidation = validateEmail(Array.isArray(fields.email) ? fields.email[0] : fields.email);
  if (!emailValidation.isValid) {
    errors.push('Valid email address is required');
  } else {
    data.email = emailValidation.sanitized;
  }

  // Validate phone
  const phoneValidation = validatePhone(Array.isArray(fields.phone) ? fields.phone[0] : fields.phone);
  if (!phoneValidation.isValid) {
    errors.push('Valid phone number is required (10 digits)');
  } else {
    data.phone = phoneValidation.sanitized;
  }

  // Validate service
  const allowedServices = [
    'Snow Removal',
    'Landscaping / Hardscaping',
    'Concrete / Asphalt Repairs',
    'Demolition',
    'Painting',
    'Other'
  ];
  
  const service = sanitizeText(Array.isArray(fields.service) ? fields.service[0] : fields.service);
  if (!service || !allowedServices.includes(service)) {
    errors.push('Please select a valid service');
  } else {
    data.service = service;
  }

  // Validate details
  const details = sanitizeText(Array.isArray(fields.details) ? fields.details[0] : fields.details);
  if (!details || details.length < 10) {
    errors.push('Project details must be at least 10 characters long');
  } else {
    data.details = details;
  }

  // Handle photo files
  let photoFiles: File[] | { filepath: string; originalFilename: string; mimetype: string; size: number }[] = [];
  if (files.photos) {
    photoFiles = Array.isArray(files.photos) ? files.photos : [files.photos];
  }

  return {
    success: errors.length === 0,
    validatedData: errors.length === 0 ? data as QuoteData : undefined,
    photoFiles,
    errors
  };
}

/**
 * Generic input sanitization for form fields
 * CRITICAL: Ensures all text input is safe before processing
 */
export function sanitizeFormFields(fields: Record<string, unknown>): Record<string, string> {
  const sanitized: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeText(value);
    } else if (Array.isArray(value) && typeof value[0] === 'string') {
      sanitized[key] = sanitizeText(value[0]);
    } else {
      sanitized[key] = '';
    }
  }
  
  return sanitized;
}