/**
 * Command Validation Middleware - CQRS Infrastructure
 * Validates commands before execution using registered validators
 */

import { Command, CommandMiddleware, CommandValidator, ValidationError } from '../cqrs/Command';

export class CommandValidationMiddleware implements CommandMiddleware {
  private validators = new Map<string, CommandValidator<Command>>();

  registerValidator<TCommand extends Command>(
    commandType: new (...args: unknown[]) => TCommand,
    validator: CommandValidator<TCommand>
  ): void {
    const commandName = commandType.name;
    this.validators.set(commandName, validator as CommandValidator<Command>);
  }

  async execute<TCommand extends Command, TResult = void>(
    command: TCommand,
    next: (command: TCommand) => Promise<TResult>
  ): Promise<TResult> {
    const commandName = command.constructor.name;
    const validator = this.validators.get(commandName);

    if (validator) {
      console.log(`🔍 Validating command: ${commandName}`);
      
      const validationResult = await validator.validate(command);
      
      if (!validationResult.isValid) {
        console.warn('❌ Command validation failed:', {
          commandName,
          commandId: command.commandId,
          errors: validationResult.errors
        });
        
        throw new CommandValidationError(
          `Command validation failed for ${commandName}`,
          validationResult.errors
        );
      }

      console.log(`✅ Command validation passed: ${commandName}`);
    }

    return next(command);
  }

  hasValidator(commandName: string): boolean {
    return this.validators.has(commandName);
  }

  getRegisteredValidators(): string[] {
    return Array.from(this.validators.keys());
  }
}

export class CommandValidationError extends Error {
  constructor(
    message: string,
    public readonly validationErrors: ValidationError[]
  ) {
    super(message);
    this.name = 'CommandValidationError';
  }
}