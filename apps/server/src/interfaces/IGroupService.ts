import { Group, StadiumBounds, Zone } from '@stadium-lights/shared';

export interface CreateGroupOptions {
  controllerDeviceId: string;
  stadiumBounds: StadiumBounds;
  gridSize?: { rows: number; cols: number };
  customCode?: string; // Optional custom code (e.g., "COLDPLAY2024")
}

export interface IGroupService {
  /**
   * Creates a new group and generates zones
   */
  createGroup(options: CreateGroupOptions): Promise<{ group: Group; code: string }>;

  /**
   * Joins an existing group by code
   * @returns The group if found and valid
   */
  joinGroup(code: string): Promise<Group | null>;

  /**
   * Gets the zones for a group
   */
  getGroupZones(groupId: string): Zone[];

  /**
   * Validates if a device is the controller of a group
   */
  isController(groupId: string, deviceId: string): Promise<boolean>;

  /**
   * Deletes a group (controller only)
   */
  deleteGroup(groupId: string, deviceId: string): Promise<boolean>;

  /**
   * Gets all active groups for a controller device
   */
  getGroupsByController(deviceId: string): Promise<Group[]>;

  /**
   * Resumes control of a group (updates activity, returns group if valid)
   */
  resumeGroup(groupId: string, deviceId: string): Promise<Group | null>;

  /**
   * Updates the activity timestamp for a group
   */
  touchGroup(groupId: string): Promise<void>;

  /**
   * Releases (immediately expires) a group
   */
  releaseGroup(groupId: string, deviceId: string): Promise<boolean>;

  /**
   * Gets the count of active groups for a controller
   */
  getGroupCountByController(deviceId: string): Promise<number>;
}
