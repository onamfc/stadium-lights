import { Coordinates, Participant } from '@stadium-lights/shared';

export interface JoinOptions {
  groupId: string;
  deviceId: string;
  displayName: string;
  coordinates: Coordinates;
}

export interface IParticipantService {
  /**
   * Adds or updates a participant in a group
   */
  join(options: JoinOptions): Promise<Participant>;

  /**
   * Updates participant location and recalculates zone
   */
  updateLocation(
    groupId: string,
    deviceId: string,
    coordinates: Coordinates
  ): Promise<{ participant: Participant; zoneChanged: boolean }>;

  /**
   * Removes a participant from a group
   */
  leave(groupId: string, deviceId: string): Promise<void>;

  /**
   * Gets all participants in a group
   */
  getParticipants(groupId: string): Promise<Participant[]>;

  /**
   * Gets participant count and zone distribution
   */
  getStats(groupId: string): Promise<{
    count: number;
    zoneDistribution: Record<string, number>;
  }>;
}
