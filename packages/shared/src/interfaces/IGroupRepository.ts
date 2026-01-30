import { Group, StadiumBounds } from '../types/models';

export interface CreateGroupDto {
  controllerDeviceId: string;
  stadiumBounds: StadiumBounds;
  gridSize: { rows: number; cols: number };
  customCode?: string; // Optional custom code - if not provided, a random code is generated
  expiresAt: Date;
  isCustomCode: boolean;
}

export interface IGroupRepository {
  /**
   * Creates a new group with a unique code
   */
  create(dto: CreateGroupDto): Promise<Group>;

  /**
   * Finds a group by its unique code
   */
  findByCode(code: string): Promise<Group | null>;

  /**
   * Finds a group by its ID
   */
  findById(id: string): Promise<Group | null>;

  /**
   * Finds a group by controller device ID
   */
  findByControllerDeviceId(deviceId: string): Promise<Group | null>;

  /**
   * Deletes a group and all associated data
   */
  delete(id: string): Promise<void>;

  /**
   * Updates the last activity timestamp and extends expiration
   */
  touch(id: string): Promise<void>;

  /**
   * Finds all active groups controlled by a device
   */
  findAllByControllerDeviceId(deviceId: string): Promise<Group[]>;

  /**
   * Deletes all expired groups and returns the count deleted
   */
  deleteExpired(): Promise<number>;
}
