import { UpdateLocationPayload, validateCoordinates } from '@stadium-lights/shared';
import { IParticipantService } from '../interfaces/IParticipantService';
import { ISocketHandler, TypedSocket } from './HandlerRegistry';
import { getSocketData } from './GroupHandler';

export class LocationHandler implements ISocketHandler {
  constructor(private readonly participantService: IParticipantService) {}

  attachToSocket(socket: TypedSocket): void {
    socket.on('update_location', async (payload: UpdateLocationPayload) => {
      await this.handleUpdateLocation(socket, payload);
    });
  }

  private async handleUpdateLocation(
    socket: TypedSocket,
    payload: UpdateLocationPayload
  ): Promise<void> {
    const data = getSocketData(socket.id);

    if (!data?.groupId || !data?.deviceId) {
      socket.emit('error', {
        message: 'Not in a group',
        code: 'NOT_IN_GROUP',
      });
      return;
    }

    // Validate coordinates
    const coordsValidation = validateCoordinates(payload.latitude, payload.longitude);
    if (!coordsValidation.valid) {
      socket.emit('error', {
        message: coordsValidation.error!,
        code: 'INVALID_COORDINATES',
      });
      return;
    }

    try {
      const { participant, zoneChanged } = await this.participantService.updateLocation(
        data.groupId,
        data.deviceId,
        {
          latitude: payload.latitude,
          longitude: payload.longitude,
        }
      );

      if (zoneChanged && participant.zoneId) {
        socket.emit('zone_updated', { zoneId: participant.zoneId });

        // Update zone distribution for controller
        const stats = await this.participantService.getStats(data.groupId);
        socket.to(data.groupId).emit('participant_count', {
          count: stats.count,
          zoneDistribution: stats.zoneDistribution,
        });
      }
    } catch (error) {
      console.error('Error updating location:', error);
      socket.emit('error', {
        message: 'Failed to update location',
        code: 'UPDATE_LOCATION_FAILED',
      });
    }
  }
}
