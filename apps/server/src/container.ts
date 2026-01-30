type Constructor<T> = new (...args: any[]) => T;
type Factory<T> = () => T;

interface ServiceDescriptor<T> {
  instance?: T;
  factory?: Factory<T>;
  singleton: boolean;
}

export class Container {
  private services = new Map<string, ServiceDescriptor<any>>();

  /**
   * Registers a singleton instance
   */
  registerInstance<T>(token: string, instance: T): void {
    this.services.set(token, { instance, singleton: true });
  }

  /**
   * Registers a factory function for creating instances
   * @param singleton - If true, only one instance will be created
   */
  registerFactory<T>(token: string, factory: Factory<T>, singleton = true): void {
    this.services.set(token, { factory, singleton });
  }

  /**
   * Resolves a service by its token
   */
  resolve<T>(token: string): T {
    const descriptor = this.services.get(token);

    if (!descriptor) {
      throw new Error(`Service not registered: ${token}`);
    }

    if (descriptor.instance) {
      return descriptor.instance;
    }

    if (descriptor.factory) {
      const instance = descriptor.factory();

      if (descriptor.singleton) {
        descriptor.instance = instance;
      }

      return instance;
    }

    throw new Error(`Invalid service descriptor for: ${token}`);
  }

  /**
   * Checks if a service is registered
   */
  has(token: string): boolean {
    return this.services.has(token);
  }

  /**
   * Clears all registered services (useful for testing)
   */
  clear(): void {
    this.services.clear();
  }
}

// Service tokens for dependency injection
export const ServiceTokens = {
  // Repositories
  GroupRepository: 'IGroupRepository',
  ParticipantRepository: 'IParticipantRepository',

  // Services
  GroupService: 'IGroupService',
  ParticipantService: 'IParticipantService',
  PatternService: 'IPatternService',
  ZoneService: 'IZoneService',

  // Infrastructure
  Database: 'Database',
  SocketServer: 'SocketServer',
} as const;

// Global container instance
export const container = new Container();
