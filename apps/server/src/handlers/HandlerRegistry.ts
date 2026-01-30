import { Server, Socket } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents } from '@stadium-lights/shared';

export type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
export type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

export interface ISocketHandler {
  /**
   * Attaches event listeners to a socket
   */
  attachToSocket(socket: TypedSocket): void;
}

export class HandlerRegistry {
  private handlers: ISocketHandler[] = [];

  constructor(private readonly io: TypedServer) {}

  /**
   * Registers a handler with the registry
   */
  register(handler: ISocketHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Attaches all registered handlers to a socket
   */
  attachToSocket(socket: TypedSocket): void {
    for (const handler of this.handlers) {
      handler.attachToSocket(socket);
    }
  }

  /**
   * Gets the Socket.io server instance
   */
  getServer(): TypedServer {
    return this.io;
  }
}
