/**
 * Command Logging Middleware - CQRS Infrastructure
 * Logs all command executions for audit and debugging
 */

import { Command, CommandMiddleware } from '../cqrs/Command';

export class CommandLoggingMiddleware implements CommandMiddleware {
  async execute<TCommand extends Command, TResult = void>(
    command: TCommand,
    next: (command: TCommand) => Promise<TResult>
  ): Promise<TResult> {
    const startTime = Date.now();
    const commandName = command.constructor.name;

    console.log('🔄 Command Start:', {
      commandName,
      commandId: command.commandId,
      correlationId: command.correlationId,
      userId: command.userId,
      timestamp: command.timestamp
    });

    try {
      const result = await next(command);
      const executionTime = Date.now() - startTime;

      console.log('✅ Command Success:', {
        commandName,
        commandId: command.commandId,
        executionTimeMs: executionTime,
        hasResult: result !== undefined
      });

      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;

      console.error('❌ Command Failed:', {
        commandName,
        commandId: command.commandId,
        executionTimeMs: executionTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      throw error;
    }
  }
}