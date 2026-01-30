import { JoinVisualizerPayload, validateCode } from '@stadium-lights/shared';
import { IGroupService } from '../interfaces/IGroupService';
import { IParticipantService } from '../interfaces/IParticipantService';
import { IZoneService } from '../interfaces/IZoneService';
import { ISocketHandler, TypedSocket } from './HandlerRegistry';

export class VisualizerHandler implements ISocketHandler {
  constructor(
    private readonly groupService: IGroupService,
    private readonly participantService: IParticipantService,
    private readonly zoneService: IZoneService
  ) {}

  attachToSocket(socket: TypedSocket): void {
    socket.on('join_visualizer', async (payload: JoinVisualizerPayload) => {
      await this.handleJoinVisualizer(socket, payload);
    });
  }

  private async handleJoinVisualizer(
    socket: TypedSocket,
    payload: JoinVisualizerPayload
  ): Promise<void> {
    try {
      // Validate code
      const codeValidation = validateCode(payload.code);
      if (!codeValidation.valid) {
        socket.emit('error', { message: codeValidation.error!, code: 'INVALID_CODE' });
        return;
      }

      // Find the group
      const group = await this.groupService.joinGroup(codeValidation.sanitized!);

      if (!group) {
        socket.emit('error', {
          message: 'Invalid group code',
          code: 'INVALID_CODE',
        });
        return;
      }

      // Join the socket room for this group (to receive pattern events)
      socket.join(group.id);

      // Get participant stats
      const stats = await this.participantService.getStats(group.id);

      // Get zone data for ring mode visualization
      const zones = this.zoneService.getZones(group.id);

      socket.emit('visualizer_joined', {
        groupId: group.id,
        gridSize: group.gridSize,
        participantCount: stats.count,
        zoneDistribution: stats.zoneDistribution,
        zones: zones.map((z) => ({
          id: z.id,
          row: z.row,
          col: z.col,
          angle: z.angle,
          distance: z.distance,
        })),
      });

      console.log(`Visualizer joined group ${payload.code} (groupId: ${group.id})`);
    } catch (error) {
      console.error('Error joining visualizer:', error);
      socket.emit('error', {
        message: 'Failed to join as visualizer',
        code: 'JOIN_FAILED',
      });
    }
  }
}
