import { Group, IGroupRepository, Zone } from '@stadium-lights/shared';
import { CreateGroupOptions, IGroupService } from '../interfaces/IGroupService';
import { IZoneService } from '../interfaces/IZoneService';

const DEFAULT_GRID_SIZE = { rows: 10, cols: 10 };

// Expiration durations
const RANDOM_CODE_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const CUSTOM_CODE_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Group limits per tier (currently only default tier)
const MAX_GROUPS_PER_CONTROLLER = 3;

export class GroupService implements IGroupService {
  constructor(
    private readonly groupRepository: IGroupRepository,
    private readonly zoneService: IZoneService
  ) {}

  async createGroup(
    options: CreateGroupOptions
  ): Promise<{ group: Group; code: string }> {
    // Check group limit
    const currentCount = await this.getGroupCountByController(options.controllerDeviceId);
    if (currentCount >= MAX_GROUPS_PER_CONTROLLER) {
      throw new Error(`You can only have ${MAX_GROUPS_PER_CONTROLLER} active groups at a time. Release an existing group to create a new one.`);
    }

    const gridSize = options.gridSize || DEFAULT_GRID_SIZE;
    const isCustomCode = !!options.customCode;
    const expirationMs = isCustomCode
      ? CUSTOM_CODE_EXPIRATION_MS
      : RANDOM_CODE_EXPIRATION_MS;
    const expiresAt = new Date(Date.now() + expirationMs);

    const group = await this.groupRepository.create({
      controllerDeviceId: options.controllerDeviceId,
      stadiumBounds: options.stadiumBounds,
      gridSize,
      customCode: options.customCode,
      expiresAt,
      isCustomCode,
    });

    // Generate zones for this group
    this.zoneService.createZoneGrid(
      group.id,
      options.stadiumBounds,
      gridSize.rows,
      gridSize.cols
    );

    return { group, code: group.code };
  }

  async joinGroup(code: string): Promise<Group | null> {
    const group = await this.groupRepository.findByCode(code.toUpperCase());

    if (group) {
      await this.groupRepository.touch(group.id);
    }

    return group;
  }

  getGroupZones(groupId: string): Zone[] {
    return this.zoneService.getZones(groupId);
  }

  async isController(groupId: string, deviceId: string): Promise<boolean> {
    const group = await this.groupRepository.findById(groupId);
    return group?.controllerDeviceId === deviceId;
  }

  async deleteGroup(groupId: string, deviceId: string): Promise<boolean> {
    const isController = await this.isController(groupId, deviceId);

    if (!isController) {
      return false;
    }

    this.zoneService.clearZones(groupId);
    await this.groupRepository.delete(groupId);

    return true;
  }

  async getGroupsByController(deviceId: string): Promise<Group[]> {
    return this.groupRepository.findAllByControllerDeviceId(deviceId);
  }

  async resumeGroup(groupId: string, deviceId: string): Promise<Group | null> {
    const group = await this.groupRepository.findById(groupId);

    if (!group || group.controllerDeviceId !== deviceId) {
      return null;
    }

    // Update activity timestamp
    await this.groupRepository.touch(groupId);

    // Return refreshed group with new expiration
    return this.groupRepository.findById(groupId);
  }

  async touchGroup(groupId: string): Promise<void> {
    await this.groupRepository.touch(groupId);
  }

  async releaseGroup(groupId: string, deviceId: string): Promise<boolean> {
    const group = await this.groupRepository.findById(groupId);

    if (!group || group.controllerDeviceId !== deviceId) {
      return false;
    }

    this.zoneService.clearZones(groupId);
    await this.groupRepository.delete(groupId);

    return true;
  }

  async getGroupCountByController(deviceId: string): Promise<number> {
    const groups = await this.groupRepository.findAllByControllerDeviceId(deviceId);
    return groups.length;
  }
}
