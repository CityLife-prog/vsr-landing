/**
 * In-Memory Job Application Repository - Infrastructure Layer
 * Clean Architecture: Infrastructure implements domain interfaces
 */

import { JobApplication, ApplicationStatus, ExperienceLevel } from '../../domain/application/JobApplication';
import { JobApplicationRepository, JobApplicationQueryFilters, JobApplicationQueryResult } from '../../domain/application/JobApplicationRepository';
import { UniqueEntityId } from '../../domain/shared/UniqueEntityId';

export class InMemoryJobApplicationRepository implements JobApplicationRepository {
  private applications = new Map<string, JobApplication>();

  async save(application: JobApplication): Promise<void> {
    this.applications.set(application.id.toString(), application);
  }

  async findById(id: UniqueEntityId): Promise<JobApplication | null> {
    return this.applications.get(id.toString()) || null;
  }

  async findByEmail(email: string): Promise<JobApplication[]> {
    return Array.from(this.applications.values()).filter(
      app => app.email.value.toLowerCase() === email.toLowerCase()
    );
  }

  async findByStatus(status: ApplicationStatus): Promise<JobApplication[]> {
    return Array.from(this.applications.values()).filter(
      app => app.status === status
    );
  }

  async findByExperienceLevel(level: ExperienceLevel): Promise<JobApplication[]> {
    return Array.from(this.applications.values()).filter(
      app => app.experienceLevel === level
    );
  }

  async findPendingApplications(): Promise<JobApplication[]> {
    return this.findByStatus(ApplicationStatus.PENDING);
  }

  async findApplicationsForReview(): Promise<JobApplication[]> {
    return this.findByStatus(ApplicationStatus.UNDER_REVIEW);
  }

  async findScheduledInterviews(date?: Date): Promise<JobApplication[]> {
    const applications = Array.from(this.applications.values()).filter(
      app => app.status === ApplicationStatus.INTERVIEW_SCHEDULED && app.interviewDate
    );

    if (date) {
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);

      return applications.filter(app => {
        const interviewDate = app.interviewDate!;
        return interviewDate >= targetDate && interviewDate < nextDay;
      });
    }

    return applications;
  }

  async countByStatus(status: ApplicationStatus): Promise<number> {
    return Array.from(this.applications.values()).filter(
      app => app.status === status
    ).length;
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<JobApplication[]> {
    return Array.from(this.applications.values()).filter(
      app => app.submittedAt >= startDate && app.submittedAt <= endDate
    );
  }

  async delete(id: UniqueEntityId): Promise<void> {
    this.applications.delete(id.toString());
  }

  async findWithFilters(filters: JobApplicationQueryFilters): Promise<JobApplicationQueryResult> {
    let applications = Array.from(this.applications.values());

    // Apply filters
    if (filters.status) {
      applications = applications.filter(app => app.status === filters.status);
    }

    if (filters.experienceLevel) {
      applications = applications.filter(app => app.experienceLevel === filters.experienceLevel);
    }

    if (filters.applicantName) {
      applications = applications.filter(app => 
        app.applicantName.toLowerCase().includes(filters.applicantName!.toLowerCase())
      );
    }

    if (filters.email) {
      applications = applications.filter(app => 
        app.email.value.toLowerCase().includes(filters.email!.toLowerCase())
      );
    }

    if (filters.hasResume !== undefined) {
      applications = applications.filter(app => app.hasResume() === filters.hasResume);
    }

    if (filters.submittedAfter) {
      applications = applications.filter(app => app.submittedAt >= filters.submittedAfter!);
    }

    if (filters.submittedBefore) {
      applications = applications.filter(app => app.submittedAt <= filters.submittedBefore!);
    }

    if (filters.interviewDateAfter) {
      applications = applications.filter(app => 
        app.interviewDate && app.interviewDate >= filters.interviewDateAfter!
      );
    }

    if (filters.interviewDateBefore) {
      applications = applications.filter(app => 
        app.interviewDate && app.interviewDate <= filters.interviewDateBefore!
      );
    }

    // Apply sorting
    const orderBy = filters.orderBy || 'submittedAt';
    const orderDirection = filters.orderDirection || 'desc';

    applications.sort((a, b) => {
      let aValue: unknown;
      let bValue: unknown;

      switch (orderBy) {
        case 'submittedAt':
          aValue = a.submittedAt.getTime();
          bValue = b.submittedAt.getTime();
          break;
        case 'updatedAt':
          aValue = a.updatedAt.getTime();
          bValue = b.updatedAt.getTime();
          break;
        case 'applicantName':
          aValue = a.applicantName.toLowerCase();
          bValue = b.applicantName.toLowerCase();
          break;
        case 'interviewDate':
          aValue = a.interviewDate?.getTime() || 0;
          bValue = b.interviewDate?.getTime() || 0;
          break;
        default:
          aValue = a.submittedAt.getTime();
          bValue = b.submittedAt.getTime();
      }

      if (aValue < bValue) return orderDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return orderDirection === 'asc' ? 1 : -1;
      return 0;
    });

    const total = applications.length;
    const offset = filters.offset || 0;
    const limit = filters.limit || 50;

    applications = applications.slice(offset, offset + limit);

    return {
      applications,
      total,
      hasMore: offset + applications.length < total
    };
  }

  // Development helper methods
  async clear(): Promise<void> {
    this.applications.clear();
  }

  async count(): Promise<number> {
    return this.applications.size;
  }
}