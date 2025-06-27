/**
 * In-Memory Command Dispatcher - CQRS Infrastructure
 * Routes commands to appropriate handlers with middleware support
 */

import { 
  Command, 
  CommandHandler, 
  CommandDispatcher,
  CommandMiddleware
} from '../../application/cqrs/Command';

export class InMemoryCommandDispatcher implements CommandDispatcher {
  private handlers = new Map<string, CommandHandler<Command, unknown>>();
  private middlewares: CommandMiddleware[] = [];

  register<TCommand extends Command, TResult = void>(
    commandType: new (...args: unknown[]) => TCommand,
    handler: CommandHandler<TCommand, TResult>
  ): void {
    const commandName = commandType.name;
    this.handlers.set(commandName, handler as CommandHandler<Command, unknown>);
  }

  addMiddleware(middleware: CommandMiddleware): void {
    this.middlewares.push(middleware);
  }

  async dispatch<TCommand extends Command, TResult = void>(
    command: TCommand
  ): Promise<TResult> {
    const commandName = command.constructor.name;
    const handler = this.handlers.get(commandName);

    if (!handler) {
      throw new Error(`No handler registered for command: ${commandName}`);
    }

    // Build middleware chain
    let next = (cmd: TCommand) => handler.handle(cmd) as Promise<TResult>;

    // Apply middlewares in reverse order
    for (let i = this.middlewares.length - 1; i >= 0; i--) {
      const middleware = this.middlewares[i];
      const currentNext = next;
      next = (cmd: TCommand) => middleware.execute(cmd, currentNext);
    }

    return next(command);
  }

  getRegisteredCommands(): string[] {
    return Array.from(this.handlers.keys());
  }

  hasHandler(commandName: string): boolean {
    return this.handlers.has(commandName);
  }

  clear(): void {
    this.handlers.clear();
    this.middlewares = [];
  }
}