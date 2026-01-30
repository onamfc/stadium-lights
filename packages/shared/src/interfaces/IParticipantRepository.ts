import { Participant } from '../types/models';

export interface CreateParticipantDto {
  groupId: string;
  deviceId: string;
  displayName: string;
  latitude: number;
  longitude: number;
}

export interface UpdateLocationDto {
  latitude: number;
  longitude: number;
  zoneId: string | null;
}

export interface IParticipantRepository {
  /**
   * Creates or updates a participant in a group
   */
  upsert(dto: CreateParticipantDto): Promise<Participant>;

  /**
   * Finds a participant by device ID within a group
   */
  findByDeviceId(groupId: string, deviceId: string): Promise<Participant | null>;

  /**
   * Finds all participants in a group
   */
  findByGroupId(groupId: string): Promise<Participant[]>;

  /**
   * Updates participant location and zone
   */
  updateLocation(id: string, dto: UpdateLocationDto): Promise<Participant>;

  /**
   * Removes a participant
   */
  delete(id: string): Promise<void>;

  /**
   * Removes all participants from a group
   */
  deleteByGroupId(groupId: string): Promise<void>;

  /**
   * Counts participants in a group
   */
  countByGroupId(groupId: string): Promise<number>;

  /**
   * Gets zone distribution for a group
   */
  getZoneDistribution(groupId: string): Promise<Record<string, number>>;
}
