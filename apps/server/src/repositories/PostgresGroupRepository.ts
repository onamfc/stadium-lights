import { v4 as uuidv4 } from 'uuid';
import { Group, IGroupRepository, CreateGroupDto } from '@stadium-lights/shared';
import { query } from '../db/client';

// Expiration durations
const RANDOM_CODE_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const CUSTOM_CODE_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export class PostgresGroupRepository implements IGroupRepository {
  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 6 }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length))
    ).join('');
  }

  private mapRowToGroup(row: any): Group {
    return {
      id: row.id,
      code: row.code,
      controllerDeviceId: row.controller_device_id,
      stadiumBounds: row.stadium_bounds,
      gridSize: row.grid_size,
      isCustomCode: row.is_custom_code,
      createdAt: new Date(row.created_at),
      lastActivity: new Date(row.last_activity),
      expiresAt: new Date(row.expires_at),
    };
  }

  async create(dto: CreateGroupDto): Promise<Group> {
    // Clean up expired groups first
    await this.deleteExpired();

    const id = uuidv4();
    let code: string;

    if (dto.customCode) {
      const normalizedCode = dto.customCode.toUpperCase().trim();
      // Check if custom code is already in use
      const existing = await this.findByCode(normalizedCode);
      if (existing) {
        throw new Error(`Code "${normalizedCode}" is already in use`);
      }
      code = normalizedCode;
    } else {
      // Generate unique code
      let attempts = 0;
      do {
        code = this.generateCode();
        const existing = await this.findByCode(code);
        if (!existing) break;
        attempts++;
      } while (attempts < 10);

      if (attempts >= 10) {
        throw new Error('Failed to generate unique code');
      }
    }

    const result = await query<any>(
      `INSERT INTO groups (id, code, controller_device_id, stadium_bounds, grid_size, is_custom_code, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        id,
        code,
        dto.controllerDeviceId,
        JSON.stringify(dto.stadiumBounds),
        JSON.stringify(dto.gridSize),
        dto.isCustomCode,
        dto.expiresAt,
      ]
    );

    return this.mapRowToGroup(result.rows[0]);
  }

  async findByCode(code: string): Promise<Group | null> {
    const result = await query<any>(
      `SELECT * FROM groups WHERE code = $1 AND expires_at > NOW()`,
      [code.toUpperCase()]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToGroup(result.rows[0]);
  }

  async findById(id: string): Promise<Group | null> {
    const result = await query<any>(
      `SELECT * FROM groups WHERE id = $1 AND expires_at > NOW()`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToGroup(result.rows[0]);
  }

  async findByControllerDeviceId(deviceId: string): Promise<Group | null> {
    const result = await query<any>(
      `SELECT * FROM groups WHERE controller_device_id = $1 AND expires_at > NOW() LIMIT 1`,
      [deviceId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToGroup(result.rows[0]);
  }

  async findAllByControllerDeviceId(deviceId: string): Promise<Group[]> {
    const result = await query<any>(
      `SELECT * FROM groups WHERE controller_device_id = $1 AND expires_at > NOW() ORDER BY created_at DESC`,
      [deviceId]
    );

    return result.rows.map((row: any) => this.mapRowToGroup(row));
  }

  async delete(id: string): Promise<void> {
    await query('DELETE FROM groups WHERE id = $1', [id]);
  }

  async touch(id: string): Promise<void> {
    // Get current group to determine expiration duration
    const group = await this.findById(id);
    if (!group) return;

    const expirationMs = group.isCustomCode
      ? CUSTOM_CODE_EXPIRATION_MS
      : RANDOM_CODE_EXPIRATION_MS;

    const newExpiresAt = new Date(Date.now() + expirationMs);

    await query(
      `UPDATE groups SET last_activity = NOW(), expires_at = $1 WHERE id = $2`,
      [newExpiresAt, id]
    );
  }

  async deleteExpired(): Promise<number> {
    const result = await query('SELECT cleanup_expired_groups() as count');
    const count = result.rows[0]?.count || 0;
    if (count > 0) {
      console.log(`Cleaned up ${count} expired groups`);
    }
    return count;
  }
}
