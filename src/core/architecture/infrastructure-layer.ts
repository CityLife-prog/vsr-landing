/**
 * Infrastructure Layer Architecture - External Concerns
 * ENTERPRISE PATTERN: Ports and Adapters (Hexagonal Architecture)
 * 
 * This layer contains:
 * - Database implementations
 * - External service integrations
 * - Framework-specific code
 * - Configuration and dependency wiring
 */

import {
  ApplicationRepository,
  ApplicationSubmission,
  Email,
  ApplicationStatus,
  DomainEventPublisher,
  DomainEvent,
  ApplicationValidationRules
} from './domain-layer';

import {
  FileStorageService,
  FileMetadata,
  NotificationService,
  ApplicationMetrics,
  ApplicationLogger,
  ApplicationContainer,
  DefaultApplicationContainer
} from './application-layer';

// ================== DATABASE ADAPTERS ==================

export interface DatabaseConnection {
  query<T>(sql: string, params?: any[]): Promise<T[]>;
  execute(sql: string, params?: any[]): Promise<{ affectedRows: number; insertId?: any }>;
  transaction<T>(fn: (conn: DatabaseConnection) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export interface DatabasePool {
  getConnection(): Promise<DatabaseConnection>;
  close(): Promise<void>;
}

export class PostgreSQLApplicationRepository implements ApplicationRepository {
  constructor(
    private readonly pool: DatabasePool,
    private readonly logger: ApplicationLogger
  ) {}
  
  async save(application: ApplicationSubmission): Promise<void> {
    const connection = await this.pool.getConnection();
    
    try {
      const snapshot = application.toSnapshot();
      
      await connection.execute(`
        INSERT INTO applications (
          id, name, email, phone, experience, resume_file_id,
          submitted_at, status, ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          experience = EXCLUDED.experience,
          resume_file_id = EXCLUDED.resume_file_id,
          status = EXCLUDED.status,
          ip_address = EXCLUDED.ip_address,
          user_agent = EXCLUDED.user_agent
      `, [
        snapshot.id,
        snapshot.name,
        snapshot.email,
        snapshot.phone,
        snapshot.experience,
        snapshot.resumeFileId,
        snapshot.submittedAt,
        snapshot.status,
        snapshot.ipAddress,
        snapshot.userAgent
      ]);
      
      this.logger.debug('Application saved to database', { applicationId: snapshot.id });
      
    } catch (error) {
      this.logger.error('Failed to save application', error as Error, { 
        applicationId: application.getId() 
      });
      throw error;
    }
  }
  
  async findById(id: string): Promise<ApplicationSubmission | null> {
    const connection = await this.pool.getConnection();
    
    try {
      const rows = await connection.query<any>(`
        SELECT * FROM applications WHERE id = $1 LIMIT 1
      `, [id]);
      
      if (rows.length === 0) {
        return null;
      }
      
      const row = rows[0];
      return ApplicationSubmission.reconstitute(row.id, {
        name: row.name,
        email: row.email,
        phone: row.phone,
        experience: row.experience,
        resumeFileId: row.resume_file_id,
        submittedAt: new Date(row.submitted_at),
        status: row.status as ApplicationStatus,
        ipAddress: row.ip_address,
        userAgent: row.user_agent
      });
      
    } catch (error) {
      this.logger.error('Failed to find application by ID', error as Error, { applicationId: id });
      throw error;
    }
  }
  
  async findByEmail(email: Email): Promise<ApplicationSubmission | null> {
    const connection = await this.pool.getConnection();
    
    try {
      const rows = await connection.query<any>(`
        SELECT * FROM applications WHERE email = $1 ORDER BY submitted_at DESC LIMIT 1
      `, [email.value]);
      
      if (rows.length === 0) {
        return null;
      }
      
      const row = rows[0];
      return ApplicationSubmission.reconstitute(row.id, {
        name: row.name,
        email: row.email,
        phone: row.phone,
        experience: row.experience,
        resumeFileId: row.resume_file_id,
        submittedAt: new Date(row.submitted_at),
        status: row.status as ApplicationStatus,
        ipAddress: row.ip_address,
        userAgent: row.user_agent
      });
      
    } catch (error) {
      this.logger.error('Failed to find application by email', error as Error, { 
        email: email.value 
      });
      throw error;
    }
  }
  
  async findByStatus(status: ApplicationStatus): Promise<ApplicationSubmission[]> {
    const connection = await this.pool.getConnection();
    
    try {
      const rows = await connection.query<any>(`
        SELECT * FROM applications WHERE status = $1 ORDER BY submitted_at DESC
      `, [status]);
      
      return rows.map(row => ApplicationSubmission.reconstitute(row.id, {
        name: row.name,
        email: row.email,
        phone: row.phone,
        experience: row.experience,
        resumeFileId: row.resume_file_id,
        submittedAt: new Date(row.submitted_at),
        status: row.status as ApplicationStatus,
        ipAddress: row.ip_address,
        userAgent: row.user_agent
      }));
      
    } catch (error) {
      this.logger.error('Failed to find applications by status', error as Error, { status });
      throw error;
    }
  }
  
  async exists(email: Email): Promise<boolean> {
    const connection = await this.pool.getConnection();
    
    try {
      const rows = await connection.query<{ count: number }>(`
        SELECT COUNT(*) as count FROM applications WHERE email = $1
      `, [email.value]);
      
      return rows[0].count > 0;
      
    } catch (error) {
      this.logger.error('Failed to check application existence', error as Error, { 
        email: email.value 
      });
      throw error;
    }
  }
}

// ================== EVENT PUBLISHING ==================

export interface EventStore {
  append(streamId: string, events: DomainEvent[]): Promise<void>;
  getEvents(streamId: string, fromVersion?: number): Promise<DomainEvent[]>;
}

export interface MessageBus {
  publish(topic: string, message: any): Promise<void>;
  subscribe(topic: string, handler: (message: any) => Promise<void>): Promise<void>;
}

export class EventPublisher implements DomainEventPublisher {
  constructor(
    private readonly eventStore: EventStore,
    private readonly messageBus: MessageBus,
    private readonly logger: ApplicationLogger
  ) {}
  
  async publish(event: DomainEvent): Promise<void> {
    try {
      // Store event for audit trail and event sourcing
      await this.eventStore.append(event.aggregateId, [event]);
      
      // Publish to message bus for async processing
      await this.messageBus.publish(`domain.${event.eventType.toLowerCase()}`, {
        eventId: event.eventId,
        aggregateId: event.aggregateId,
        eventType: event.eventType,
        occurredOn: event.occurredOn,
        payload: event
      });
      
      this.logger.info('Domain event published', {
        eventId: event.eventId,
        eventType: event.eventType,
        aggregateId: event.aggregateId
      });
      
    } catch (error) {
      this.logger.error('Failed to publish domain event', error as Error, {
        eventId: event.eventId,
        eventType: event.eventType,
        aggregateId: event.aggregateId
      });
      throw error;
    }
  }
}

// ================== FILE STORAGE ==================

export interface CloudStorageClient {
  upload(key: string, data: Buffer, metadata: Record<string, string>): Promise<string>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  getMetadata(key: string): Promise<Record<string, string>>;
}

export class S3FileStorageService implements FileStorageService {
  constructor(
    private readonly s3Client: CloudStorageClient,
    private readonly bucket: string,
    private readonly logger: ApplicationLogger
  ) {}
  
  async store(file: Buffer, metadata: FileMetadata): Promise<string> {
    const fileId = this.generateFileId();
    const key = `applications/resumes/${fileId}`;
    
    try {
      await this.s3Client.upload(key, file, {
        'Content-Type': metadata.mimeType,
        'Original-Name': metadata.originalName,
        'File-Size': metadata.size.toString(),
        'Uploaded-At': metadata.uploadedAt.toISOString(),
        'Uploaded-By': metadata.uploadedBy || 'anonymous'
      });
      
      this.logger.info('File stored successfully', {
        fileId,
        originalName: metadata.originalName,
        size: metadata.size
      });
      
      return fileId;
      
    } catch (error) {
      this.logger.error('Failed to store file', error as Error, {
        fileId,
        originalName: metadata.originalName,
        size: metadata.size
      });
      throw error;
    }
  }
  
  async retrieve(fileId: string): Promise<Buffer> {
    const key = `applications/resumes/${fileId}`;
    
    try {
      return await this.s3Client.download(key);
    } catch (error) {
      this.logger.error('Failed to retrieve file', error as Error, { fileId });
      throw error;
    }
  }
  
  async delete(fileId: string): Promise<void> {
    const key = `applications/resumes/${fileId}`;
    
    try {
      await this.s3Client.delete(key);
      this.logger.info('File deleted successfully', { fileId });
    } catch (error) {
      this.logger.error('Failed to delete file', error as Error, { fileId });
      throw error;
    }
  }
  
  async getMetadata(fileId: string): Promise<FileMetadata> {
    const key = `applications/resumes/${fileId}`;
    
    try {
      const metadata = await this.s3Client.getMetadata(key);
      
      return {
        originalName: metadata['Original-Name'],
        mimeType: metadata['Content-Type'],
        size: parseInt(metadata['File-Size']),
        uploadedAt: new Date(metadata['Uploaded-At']),
        uploadedBy: metadata['Uploaded-By'] !== 'anonymous' ? metadata['Uploaded-By'] : undefined
      };
      
    } catch (error) {
      this.logger.error('Failed to get file metadata', error as Error, { fileId });
      throw error;
    }
  }
  
  private generateFileId(): string {
    return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ================== NOTIFICATION SERVICES ==================

export interface EmailProvider {
  send(to: string, subject: string, body: string, isHtml?: boolean): Promise<void>;
}

export class SMTPNotificationService implements NotificationService {
  constructor(
    private readonly emailProvider: EmailProvider,
    private readonly adminEmails: string[],
    private readonly logger: ApplicationLogger
  ) {}
  
  async sendApplicationConfirmation(
    email: string,
    applicationId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const subject = 'Application Received - VSR Construction';
    const body = this.generateConfirmationEmail(applicationId, metadata?.applicantName);
    
    try {
      await this.emailProvider.send(email, subject, body, true);
      this.logger.info('Application confirmation sent', { email, applicationId });
    } catch (error) {
      this.logger.error('Failed to send application confirmation', error as Error, {
        email,
        applicationId
      });
      throw error;
    }
  }
  
  async notifyAdministrators(
    applicationId: string,
    applicantName: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const subject = `New Application Received - ${applicantName}`;
    const body = this.generateAdminNotificationEmail(applicationId, applicantName, metadata);
    
    try {
      await Promise.all(
        this.adminEmails.map(email =>
          this.emailProvider.send(email, subject, body, true)
        )
      );
      
      this.logger.info('Admin notifications sent', { applicationId, applicantName });
    } catch (error) {
      this.logger.error('Failed to send admin notifications', error as Error, {
        applicationId,
        applicantName
      });
      throw error;
    }
  }
  
  private generateConfirmationEmail(applicationId: string, applicantName?: string): string {
    return `
      <html>
        <body>
          <h2>Thank you for your application!</h2>
          <p>Dear ${applicantName || 'Applicant'},</p>
          <p>We have received your application and will review it shortly.</p>
          <p><strong>Application ID:</strong> ${applicationId}</p>
          <p>We will contact you within 3-5 business days regarding next steps.</p>
          <p>Best regards,<br>VSR Construction Team</p>
        </body>
      </html>
    `;
  }
  
  private generateAdminNotificationEmail(
    applicationId: string,
    applicantName: string,
    metadata?: Record<string, any>
  ): string {
    return `
      <html>
        <body>
          <h2>New Application Received</h2>
          <p><strong>Applicant:</strong> ${applicantName}</p>
          <p><strong>Application ID:</strong> ${applicationId}</p>
          <p><strong>Submitted:</strong> ${metadata?.submittedAt || 'Now'}</p>
          <p>Please review the application in the admin dashboard.</p>
        </body>
      </html>
    `;
  }
}

// ================== VALIDATION RULES ==================

export class BusinessApplicationValidationRules implements ApplicationValidationRules {
  constructor(
    private readonly applicationRepository: ApplicationRepository,
    private readonly logger: ApplicationLogger
  ) {}
  
  validateExperienceLevel(experience: string): boolean {
    const validLevels = ['entry', 'mid', 'senior', 'expert'];
    const isValid = validLevels.includes(experience.toLowerCase());
    
    if (!isValid) {
      this.logger.debug('Invalid experience level', { experience, validLevels });
    }
    
    return isValid;
  }
  
  validateResumeRequirement(hasResume: boolean): boolean {
    // Business rule: Resume is always required
    return hasResume;
  }
  
  async checkDuplicateApplication(email: Email): Promise<boolean> {
    try {
      return await this.applicationRepository.exists(email);
    } catch (error) {
      this.logger.error('Failed to check duplicate application', error as Error, {
        email: email.value
      });
      // Fail open - allow application to proceed
      return false;
    }
  }
}

// ================== METRICS AND LOGGING ==================

export class PrometheusMetrics implements ApplicationMetrics {
  private readonly counters = new Map<string, number>();
  private readonly histograms = new Map<string, number[]>();
  
  recordCommandExecution(commandType: string, duration: number, success: boolean): void {
    const metric = `command_${commandType.toLowerCase()}_duration_ms`;
    this.addToHistogram(metric, duration);
    
    const statusMetric = `command_${commandType.toLowerCase()}_${success ? 'success' : 'failure'}_total`;
    this.incrementCounter(statusMetric);
  }
  
  recordQueryExecution(queryType: string, duration: number, recordCount: number): void {
    const durationMetric = `query_${queryType.toLowerCase()}_duration_ms`;
    this.addToHistogram(durationMetric, duration);
    
    const countMetric = `query_${queryType.toLowerCase()}_records_returned`;
    this.addToHistogram(countMetric, recordCount);
  }
  
  incrementCounter(metric: string, tags?: Record<string, string>): void {
    const fullMetric = tags ? `${metric}_${Object.entries(tags).map(([k, v]) => `${k}_${v}`).join('_')}` : metric;
    this.counters.set(fullMetric, (this.counters.get(fullMetric) || 0) + 1);
  }
  
  private addToHistogram(metric: string, value: number): void {
    const values = this.histograms.get(metric) || [];
    values.push(value);
    this.histograms.set(metric, values);
  }
  
  getMetrics(): Record<string, any> {
    return {
      counters: Object.fromEntries(this.counters),
      histograms: Object.fromEntries(
        Array.from(this.histograms.entries()).map(([key, values]) => [
          key,
          {
            count: values.length,
            sum: values.reduce((a, b) => a + b, 0),
            avg: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
            min: values.length > 0 ? Math.min(...values) : 0,
            max: values.length > 0 ? Math.max(...values) : 0
          }
        ])
      )
    };
  }
}

export interface LogLevel {
  DEBUG: number;
  INFO: number;
  WARN: number;
  ERROR: number;
}

export class StructuredLogger implements ApplicationLogger {
  private readonly logLevel: number;
  
  constructor(
    private readonly serviceName: string,
    private readonly version: string,
    logLevel: keyof LogLevel = 'INFO'
  ) {
    const levels: LogLevel = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
    this.logLevel = levels[logLevel];
  }
  
  info(message: string, context?: Record<string, any>): void {
    if (this.logLevel <= 1) {
      this.log('INFO', message, context);
    }
  }
  
  warn(message: string, context?: Record<string, any>): void {
    if (this.logLevel <= 2) {
      this.log('WARN', message, context);
    }
  }
  
  error(message: string, error?: Error, context?: Record<string, any>): void {
    if (this.logLevel <= 3) {
      this.log('ERROR', message, {
        ...context,
        error: error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : undefined
      });
    }
  }
  
  debug(message: string, context?: Record<string, any>): void {
    if (this.logLevel <= 0) {
      this.log('DEBUG', message, context);
    }
  }
  
  private log(level: string, message: string, context?: Record<string, any>): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      version: this.version,
      message,
      ...context
    };
    
    console.log(JSON.stringify(logEntry));
  }
}

// ================== INFRASTRUCTURE CONTAINER ==================

export class InfrastructureContainer extends DefaultApplicationContainer {
  constructor(
    private readonly config: InfrastructureConfig
  ) {
    super();
    this.wireInfrastructure();
  }
  
  private wireInfrastructure(): void {
    // Register infrastructure services
    this.register('ApplicationLogger', () => 
      new StructuredLogger('vsr-application', '1.0.0', this.config.logLevel)
    );
    
    this.register('ApplicationMetrics', () => 
      new PrometheusMetrics()
    );
    
    this.register('ApplicationRepository', () => 
      new PostgreSQLApplicationRepository(
        this.config.databasePool,
        this.getApplicationLogger()
      )
    );
    
    this.register('FileStorageService', () => 
      new S3FileStorageService(
        this.config.storageClient,
        this.config.storageBucket,
        this.getApplicationLogger()
      )
    );
    
    this.register('NotificationService', () => 
      new SMTPNotificationService(
        this.config.emailProvider,
        this.config.adminEmails,
        this.getApplicationLogger()
      )
    );
    
    this.register('DomainEventPublisher', () => 
      new EventPublisher(
        this.config.eventStore,
        this.config.messageBus,
        this.getApplicationLogger()
      )
    );
    
    this.register('ApplicationValidationRules', () => 
      new BusinessApplicationValidationRules(
        this.getApplicationRepository(),
        this.getApplicationLogger()
      )
    );
  }
}

export interface InfrastructureConfig {
  databasePool: DatabasePool;
  storageClient: CloudStorageClient;
  storageBucket: string;
  emailProvider: EmailProvider;
  adminEmails: string[];
  eventStore: EventStore;
  messageBus: MessageBus;
  logLevel: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
}