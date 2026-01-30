import { Coordinates, IParticipantRepository, Participant } from '@stadium-lights/shared';
import { IParticipantService, JoinOptions } from '../interfaces/IParticipantService';
import { IZoneService } from '../interfaces/IZoneService';

export class ParticipantService implements IParticipantService {
  constructor(
    private readonly participantRepository: IParticipantRepository,
    private readonly zoneService: IZoneService
  ) {}

  async join(options: JoinOptions): Promise<Participant> {
    const participant = await this.participantRepository.upsert({
      groupId: options.groupId,
      deviceId: options.deviceId,
      displayName: options.displayName,
      latitude: options.coordinates.latitude,
      longitude: options.coordinates.longitude,
    });

    // Calculate initial zone
    const zoneId = this.zoneService.findZoneForCoordinates(
      options.groupId,
      options.coordinates
    );

    if (zoneId !== participant.zoneId) {
      await this.participantRepository.updateLocation(participant.id, {
        latitude: options.coordinates.latitude,
        longitude: options.coordinates.longitude,
        zoneId,
      });
      participant.zoneId = zoneId;
    }

    return participant;
  }

  async updateLocation(
    groupId: string,
    deviceId: string,
    coordinates: Coordinates
  ): Promise<{ participant: Participant; zoneChanged: boolean }> {
    const participant = await this.participantRepository.findByDeviceId(
      groupId,
      deviceId
    );

    if (!participant) {
      throw new Error(`Participant not found: ${deviceId}`);
    }

    const newZoneId = this.zoneService.findZoneForCoordinates(groupId, coordinates);
    const zoneChanged = newZoneId !== participant.zoneId;

    const updated = await this.participantRepository.updateLocation(participant.id, {
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      zoneId: newZoneId,
    });

    return { participant: updated, zoneChanged };
  }

  async leave(groupId: string, deviceId: string): Promise<void> {
    const participant = await this.participantRepository.findByDeviceId(
      groupId,
      deviceId
    );

    if (participant) {
      await this.participantRepository.delete(participant.id);
    }
  }

  async getParticipants(groupId: string): Promise<Participant[]> {
    return this.participantRepository.findByGroupId(groupId);
  }

  async getStats(groupId: string): Promise<{
    count: number;
    zoneDistribution: Record<string, number>;
  }> {
    const [count, zoneDistribution] = await Promise.all([
      this.participantRepository.countByGroupId(groupId),
      this.participantRepository.getZoneDistribution(groupId),
    ]);

    return { count, zoneDistribution };
  }
}
