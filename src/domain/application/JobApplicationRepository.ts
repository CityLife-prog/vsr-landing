/**
 * Job Application Repository Interface - Domain Layer
 * Clean Architecture: Domain defines interfaces, infrastructure implements them
 */

import { JobApplication, ApplicationStatus, ExperienceLevel } from './JobApplication';
import { UniqueEntityId } from '../shared/UniqueEntityId';

export interface JobApplicationRepository {
  save(application: JobApplication): Promise<void>;
  findById(id: UniqueEntityId): Promise<JobApplication | null>;
  findByEmail(email: string): Promise<JobApplication[]>;
  findByStatus(status: ApplicationStatus): Promise<JobApplication[]>;
  findByExperienceLevel(level: ExperienceLevel): Promise<JobApplication[]>;
  findPendingApplications(): Promise<JobApplication[]>;
  findApplicationsForReview(): Promise<JobApplication[]>;
  findScheduledInterviews(date?: Date): Promise<JobApplication[]>;
  countByStatus(status: ApplicationStatus): Promise<number>;
  findByDateRange(startDate: Date, endDate: Date): Promise<JobApplication[]>;
  delete(id: UniqueEntityId): Promise<void>;
}

export interface JobApplicationQueryFilters {
  status?: ApplicationStatus;
  experienceLevel?: ExperienceLevel;
  applicantName?: string;
  email?: string;
  hasResume?: boolean;
  submittedAfter?: Date;
  submittedBefore?: Date;
  interviewDateAfter?: Date;
  interviewDateBefore?: Date;
  limit?: number;
  offset?: number;
  orderBy?: 'submittedAt' | 'updatedAt' | 'applicantName' | 'interviewDate';
  orderDirection?: 'asc' | 'desc';
}

export interface JobApplicationQueryResult {
  applications: JobApplication[];
  total: number;
  hasMore: boolean;
}