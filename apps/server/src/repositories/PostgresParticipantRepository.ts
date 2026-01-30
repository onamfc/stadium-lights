import { v4 as uuidv4 } from 'uuid';
import {
  Participant,
  IParticipantRepository,
  CreateParticipantDto,
  UpdateLocationDto,
} from '@stadium-lights/shared';
import { query } from '../db/client';

export class PostgresParticipantRepository implements IParticipantRepository {
  private mapRowToParticipant(row: any): Participant {
    return {
      id: row.id,
      groupId: row.group_id,
      deviceId: row.device_id,
      displayName: row.display_name,
      latitude: row.latitude,
      longitude: row.longitude,
      zoneId: row.zone_id,
      lastSeen: new Date(row.last_seen),
    };
  }

  async upsert(dto: CreateParticipantDto): Promise<Participant> {
    const result = await query<any>(
      `INSERT INTO participants (id, device_id, group_id, display_name, latitude, longitude, last_seen)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (device_id, group_id)
       DO UPDATE SET
         display_name = EXCLUDED.display_name,
         latitude = EXCLUDED.latitude,
         longitude = EXCLUDED.longitude,
         last_seen = NOW()
       RETURNING *`,
      [
        uuidv4(),
        dto.deviceId,
        dto.groupId,
        dto.displayName,
        dto.latitude,
        dto.longitude,
      ]
    );

    return this.mapRowToParticipant(result.rows[0]);
  }

  async findByDeviceId(groupId: string, deviceId: string): Promise<Participant | null> {
    const result = await query<any>(
      `SELECT * FROM participants WHERE group_id = $1 AND device_id = $2`,
      [groupId, deviceId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToParticipant(result.rows[0]);
  }

  async findByGroupId(groupId: string): Promise<Participant[]> {
    const result = await query<any>(
      `SELECT * FROM participants WHERE group_id = $1 ORDER BY last_seen DESC`,
      [groupId]
    );

    return result.rows.map((row: any) => this.mapRowToParticipant(row));
  }

  async updateLocation(id: string, dto: UpdateLocationDto): Promise<Participant> {
    const result = await query<any>(
      `UPDATE participants
       SET latitude = $1, longitude = $2, zone_id = $3, last_seen = NOW()
       WHERE id = $4
       RETURNING *`,
      [dto.latitude, dto.longitude, dto.zoneId, id]
    );

    if (result.rows.length === 0) {
      throw new Error(`Participant not found: ${id}`);
    }

    return this.mapRowToParticipant(result.rows[0]);
  }

  async delete(id: string): Promise<void> {
    await query('DELETE FROM participants WHERE id = $1', [id]);
  }

  async deleteByGroupId(groupId: string): Promise<void> {
    await query('DELETE FROM participants WHERE group_id = $1', [groupId]);
  }

  async countByGroupId(groupId: string): Promise<number> {
    const result = await query<any>(
      `SELECT COUNT(*) as count FROM participants WHERE group_id = $1`,
      [groupId]
    );

    return parseInt(result.rows[0].count, 10);
  }

  async getZoneDistribution(groupId: string): Promise<Record<string, number>> {
    const result = await query<any>(
      `SELECT COALESCE(zone_id, 'unassigned') as zone, COUNT(*) as count
       FROM participants
       WHERE group_id = $1
       GROUP BY zone_id`,
      [groupId]
    );

    const distribution: Record<string, number> = {};
    for (const row of result.rows) {
      distribution[row.zone] = parseInt(row.count, 10);
    }

    return distribution;
  }
}
