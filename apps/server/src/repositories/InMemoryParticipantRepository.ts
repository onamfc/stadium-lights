import { v4 as uuidv4 } from 'uuid';
import {
  Participant,
  IParticipantRepository,
  CreateParticipantDto,
  UpdateLocationDto,
} from '@stadium-lights/shared';

export class InMemoryParticipantRepository implements IParticipantRepository {
  private participants = new Map<string, Participant>();
  private groupIndex = new Map<string, Set<string>>(); // groupId -> participantIds
  private deviceIndex = new Map<string, string>(); // `${groupId}:${deviceId}` -> participantId

  async upsert(dto: CreateParticipantDto): Promise<Participant> {
    const key = `${dto.groupId}:${dto.deviceId}`;
    const existingId = this.deviceIndex.get(key);

    if (existingId) {
      const existing = this.participants.get(existingId)!;
      existing.latitude = dto.latitude;
      existing.longitude = dto.longitude;
      existing.displayName = dto.displayName;
      existing.lastSeen = new Date();
      return existing;
    }

    const id = uuidv4();
    const participant: Participant = {
      id,
      groupId: dto.groupId,
      deviceId: dto.deviceId,
      displayName: dto.displayName,
      latitude: dto.latitude,
      longitude: dto.longitude,
      zoneId: null,
      lastSeen: new Date(),
    };

    this.participants.set(id, participant);
    this.deviceIndex.set(key, id);

    if (!this.groupIndex.has(dto.groupId)) {
      this.groupIndex.set(dto.groupId, new Set());
    }
    this.groupIndex.get(dto.groupId)!.add(id);

    return participant;
  }

  async findByDeviceId(groupId: string, deviceId: string): Promise<Participant | null> {
    const key = `${groupId}:${deviceId}`;
    const id = this.deviceIndex.get(key);
    if (!id) return null;
    return this.participants.get(id) || null;
  }

  async findByGroupId(groupId: string): Promise<Participant[]> {
    const ids = this.groupIndex.get(groupId);
    if (!ids) return [];
    return Array.from(ids)
      .map((id) => this.participants.get(id)!)
      .filter(Boolean);
  }

  async updateLocation(id: string, dto: UpdateLocationDto): Promise<Participant> {
    const participant = this.participants.get(id);
    if (!participant) {
      throw new Error(`Participant not found: ${id}`);
    }

    participant.latitude = dto.latitude;
    participant.longitude = dto.longitude;
    participant.zoneId = dto.zoneId;
    participant.lastSeen = new Date();

    return participant;
  }

  async delete(id: string): Promise<void> {
    const participant = this.participants.get(id);
    if (!participant) return;

    const key = `${participant.groupId}:${participant.deviceId}`;
    this.deviceIndex.delete(key);

    const groupIds = this.groupIndex.get(participant.groupId);
    if (groupIds) {
      groupIds.delete(id);
    }

    this.participants.delete(id);
  }

  async deleteByGroupId(groupId: string): Promise<void> {
    const ids = this.groupIndex.get(groupId);
    if (!ids) return;

    for (const id of ids) {
      const participant = this.participants.get(id);
      if (participant) {
        const key = `${participant.groupId}:${participant.deviceId}`;
        this.deviceIndex.delete(key);
        this.participants.delete(id);
      }
    }

    this.groupIndex.delete(groupId);
  }

  async countByGroupId(groupId: string): Promise<number> {
    const ids = this.groupIndex.get(groupId);
    return ids ? ids.size : 0;
  }

  async getZoneDistribution(groupId: string): Promise<Record<string, number>> {
    const participants = await this.findByGroupId(groupId);
    const distribution: Record<string, number> = {};

    for (const p of participants) {
      const zone = p.zoneId || 'unassigned';
      distribution[zone] = (distribution[zone] || 0) + 1;
    }

    return distribution;
  }
}
