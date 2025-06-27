/**
 * CQRS Command Infrastructure - Application Layer
 * Command side of CQRS pattern for write operations
 */

import { UniqueEntityId } from '../../domain/shared/UniqueEntityId';

/**
 * Base Command Interface
 * All commands must implement this interface
 */
export interface Command {
  readonly commandId: string;
  readonly timestamp: Date;
  readonly correlationId?: string;
  readonly userId?: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Base Command Implementation
 * Provides common command functionality
 */
export abstract class BaseCommand implements Command {
  public readonly commandId: string;
  public readonly timestamp: Date;

  constructor(
    public readonly correlationId?: string,
    public readonly userId?: string,
    public readonly metadata?: Record<string, unknown>
  ) {
    this.commandId = UniqueEntityId.create().toString();
    this.timestamp = new Date();
  }
}

/**
 * Command Handler Interface
 * Defines contract for command processing
 */
export interface CommandHandler<TCommand extends Command, TResult = void> {
  handle(command: TCommand): Promise<TResult>;
}

/**
 * Command Dispatcher Interface
 * Routes commands to appropriate handlers
 */
export interface CommandDispatcher {
  dispatch<TCommand extends Command, TResult = void>(
    command: TCommand
  ): Promise<TResult>;
  
  register<TCommand extends Command, TResult = void>(
    commandType: new (...args: unknown[]) => TCommand,
    handler: CommandHandler<TCommand, TResult>
  ): void;
}

/**
 * Command Validation Result
 */
export interface CommandValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * Command Validator Interface
 */
export interface CommandValidator<TCommand extends Command> {
  validate(command: TCommand): Promise<CommandValidationResult>;
}

/**
 * Command Middleware Interface
 * For cross-cutting concerns like logging, validation, etc.
 */
export interface CommandMiddleware {
  execute<TCommand extends Command, TResult = void>(
    command: TCommand,
    next: (command: TCommand) => Promise<TResult>
  ): Promise<TResult>;
}

/**
 * Command Result Interface
 * Standardized command response
 */
export interface CommandResult<TData = unknown> {
  success: boolean;
  data?: TData;
  errors?: ValidationError[];
  message?: string;
  commandId: string;
  timestamp: Date;
}

/**
 * Base Command Result Implementation
 */
export class BaseCommandResult<TData = unknown> implements CommandResult<TData> {
  constructor(
    public readonly success: boolean,
    public readonly commandId: string,
    public readonly data?: TData,
    public readonly errors?: ValidationError[],
    public readonly message?: string
  ) {
    this.timestamp = new Date();
  }

  public readonly timestamp: Date;

  static success<TData>(
    commandId: string,
    data?: TData,
    message?: string
  ): BaseCommandResult<TData> {
    return new BaseCommandResult(true, commandId, data, undefined, message);
  }

  static failure<TData>(
    commandId: string,
    errors: ValidationError[],
    message?: string
  ): BaseCommandResult<TData> {
    return new BaseCommandResult(false, commandId, undefined, errors, message);
  }
}