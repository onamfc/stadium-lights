import { v4 as uuidv4 } from 'uuid';
import { Group, IGroupRepository, CreateGroupDto } from '@stadium-lights/shared';

// Expiration durations
const RANDOM_CODE_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const CUSTOM_CODE_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export class InMemoryGroupRepository implements IGroupRepository {
  private groups = new Map<string, Group>();
  private codeToId = new Map<string, string>();

  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code: string;
    do {
      code = Array.from({ length: 6 }, () =>
        chars.charAt(Math.floor(Math.random() * chars.length))
      ).join('');
    } while (this.codeToId.has(code));
    return code;
  }

  async create(dto: CreateGroupDto): Promise<Group> {
    // Clean up expired groups first
    await this.deleteExpired();

    const id = uuidv4();

    // Use custom code if provided, otherwise generate one
    let code: string;
    if (dto.customCode) {
      const normalizedCode = dto.customCode.toUpperCase().trim();
      // Check if custom code is already in use
      if (this.codeToId.has(normalizedCode)) {
        throw new Error(`Code "${normalizedCode}" is already in use`);
      }
      code = normalizedCode;
    } else {
      code = this.generateCode();
    }

    const now = new Date();
    const group: Group = {
      id,
      code,
      controllerDeviceId: dto.controllerDeviceId,
      stadiumBounds: dto.stadiumBounds,
      gridSize: dto.gridSize,
      createdAt: now,
      lastActivity: now,
      expiresAt: dto.expiresAt,
      isCustomCode: dto.isCustomCode,
    };

    this.groups.set(id, group);
    this.codeToId.set(code, id);

    return group;
  }

  async findByCode(code: string): Promise<Group | null> {
    const id = this.codeToId.get(code.toUpperCase());
    if (!id) return null;
    const group = this.groups.get(id);
    if (!group) return null;

    // Check if expired
    if (new Date() > group.expiresAt) {
      await this.delete(id);
      return null;
    }

    return group;
  }

  async findById(id: string): Promise<Group | null> {
    const group = this.groups.get(id);
    if (!group) return null;

    // Check if expired
    if (new Date() > group.expiresAt) {
      await this.delete(id);
      return null;
    }

    return group;
  }

  async findByControllerDeviceId(deviceId: string): Promise<Group | null> {
    for (const group of this.groups.values()) {
      if (group.controllerDeviceId === deviceId && new Date() <= group.expiresAt) {
        return group;
      }
    }
    return null;
  }

  async findAllByControllerDeviceId(deviceId: string): Promise<Group[]> {
    const results: Group[] = [];
    const now = new Date();

    for (const group of this.groups.values()) {
      if (group.controllerDeviceId === deviceId && now <= group.expiresAt) {
        results.push(group);
      }
    }

    return results;
  }

  async delete(id: string): Promise<void> {
    const group = this.groups.get(id);
    if (group) {
      this.codeToId.delete(group.code);
      this.groups.delete(id);
    }
  }

  async touch(id: string): Promise<void> {
    const group = this.groups.get(id);
    if (group) {
      const now = new Date();
      const expirationMs = group.isCustomCode
        ? CUSTOM_CODE_EXPIRATION_MS
        : RANDOM_CODE_EXPIRATION_MS;

      group.lastActivity = now;
      group.expiresAt = new Date(now.getTime() + expirationMs);
    }
  }

  async deleteExpired(): Promise<number> {
    const now = new Date();
    let count = 0;

    for (const [id, group] of this.groups.entries()) {
      if (now > group.expiresAt) {
        this.codeToId.delete(group.code);
        this.groups.delete(id);
        count++;
        console.log(`Expired group deleted: ${group.code}`);
      }
    }

    return count;
  }
}
