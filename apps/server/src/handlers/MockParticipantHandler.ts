import { Server } from 'socket.io';
import {
  SpawnMockParticipantsPayload,
  ClientToServerEvents,
  ServerToClientEvents,
} from '@stadium-lights/shared';
import { IGroupService } from '../interfaces/IGroupService';
import { IParticipantService } from '../interfaces/IParticipantService';
import { IZoneService } from '../interfaces/IZoneService';
import { ISocketHandler, TypedSocket } from './HandlerRegistry';
import { getSocketData } from './GroupHandler';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

// Track mock participants per group
const mockParticipantsByGroup = new Map<string, string[]>();

export class MockParticipantHandler implements ISocketHandler {
  constructor(
    private readonly groupService: IGroupService,
    private readonly participantService: IParticipantService,
    private readonly zoneService: IZoneService,
    private readonly io: TypedServer
  ) {}

  attachToSocket(socket: TypedSocket): void {
    socket.on('spawn_mock_participants', async (payload: SpawnMockParticipantsPayload) => {
      await this.handleSpawnMockParticipants(socket, payload);
    });

    socket.on('clear_mock_participants', async () => {
      await this.handleClearMockParticipants(socket);
    });
  }

  private async handleSpawnMockParticipants(
    socket: TypedSocket,
    payload: SpawnMockParticipantsPayload
  ): Promise<void> {
    try {
      const socketData = getSocketData(socket.id);

      if (!socketData) {
        socket.emit('error', {
          message: 'You must create or join a group first',
          code: 'NOT_IN_GROUP',
        });
        return;
      }

      if (!socketData.isController) {
        socket.emit('error', {
          message: 'Only the controller can spawn mock participants',
          code: 'NOT_CONTROLLER',
        });
        return;
      }

      const { groupId } = socketData;
      const { count } = payload;

      if (count < 1 || count > 1000) {
        socket.emit('error', {
          message: 'Count must be between 1 and 1000',
          code: 'INVALID_COUNT',
        });
        return;
      }

      // Get the group to get stadium bounds
      const groups = await this.groupService.getGroupsByController(socketData.deviceId);
      const group = groups.find((g) => g.id === groupId);

      if (!group) {
        socket.emit('error', {
          message: 'Group not found',
          code: 'GROUP_NOT_FOUND',
        });
        return;
      }

      // Get zones for this group
      const zones = this.zoneService.getZones(groupId);

      if (zones.length === 0) {
        socket.emit('error', {
          message: 'No zones configured for this group',
          code: 'NO_ZONES',
        });
        return;
      }

      // Calculate bounds from zones
      const minLat = Math.min(...zones.map((z) => z.bounds.minLat));
      const maxLat = Math.max(...zones.map((z) => z.bounds.maxLat));
      const minLng = Math.min(...zones.map((z) => z.bounds.minLng));
      const maxLng = Math.max(...zones.map((z) => z.bounds.maxLng));

      // Spawn mock participants spread across the grid
      const mockDeviceIds: string[] = [];

      for (let i = 0; i < count; i++) {
        const deviceId = `mock-${groupId}-${Date.now()}-${i}`;

        // Distribute participants evenly across zones
        const zoneIndex = i % zones.length;
        const zone = zones[zoneIndex];

        // Random position within the zone
        const latitude =
          zone.bounds.minLat + Math.random() * (zone.bounds.maxLat - zone.bounds.minLat);
        const longitude =
          zone.bounds.minLng + Math.random() * (zone.bounds.maxLng - zone.bounds.minLng);

        await this.participantService.join({
          groupId,
          deviceId,
          displayName: `Mock ${i + 1}`,
          coordinates: { latitude, longitude },
        });

        mockDeviceIds.push(deviceId);
      }

      // Track mock participants for this group
      const existing = mockParticipantsByGroup.get(groupId) || [];
      mockParticipantsByGroup.set(groupId, [...existing, ...mockDeviceIds]);

      // Get updated stats
      const stats = await this.participantService.getStats(groupId);

      // Notify the controller
      socket.emit('mock_participants_spawned', {
        count,
        totalParticipants: stats.count,
      });

      // Notify all participants in the group
      this.io.to(groupId).emit('participant_count', {
        count: stats.count,
        zoneDistribution: stats.zoneDistribution,
      });

      console.log(`Spawned ${count} mock participants in group ${groupId} (total: ${stats.count})`);
    } catch (error) {
      console.error('Error spawning mock participants:', error);
      socket.emit('error', {
        message: 'Failed to spawn mock participants',
        code: 'SPAWN_FAILED',
      });
    }
  }

  private async handleClearMockParticipants(socket: TypedSocket): Promise<void> {
    try {
      const socketData = getSocketData(socket.id);

      if (!socketData) {
        socket.emit('error', {
          message: 'You must create or join a group first',
          code: 'NOT_IN_GROUP',
        });
        return;
      }

      if (!socketData.isController) {
        socket.emit('error', {
          message: 'Only the controller can clear mock participants',
          code: 'NOT_CONTROLLER',
        });
        return;
      }

      const { groupId } = socketData;

      // Get mock participants for this group
      const mockDeviceIds = mockParticipantsByGroup.get(groupId) || [];

      if (mockDeviceIds.length === 0) {
        socket.emit('mock_participants_cleared', {
          clearedCount: 0,
          totalParticipants: (await this.participantService.getStats(groupId)).count,
        });
        return;
      }

      // Remove all mock participants
      for (const deviceId of mockDeviceIds) {
        await this.participantService.leave(groupId, deviceId);
      }

      const clearedCount = mockDeviceIds.length;
      mockParticipantsByGroup.delete(groupId);

      // Get updated stats
      const stats = await this.participantService.getStats(groupId);

      // Notify the controller
      socket.emit('mock_participants_cleared', {
        clearedCount,
        totalParticipants: stats.count,
      });

      // Notify all participants in the group
      this.io.to(groupId).emit('participant_count', {
        count: stats.count,
        zoneDistribution: stats.zoneDistribution,
      });

      console.log(`Cleared ${clearedCount} mock participants from group ${groupId}`);
    } catch (error) {
      console.error('Error clearing mock participants:', error);
      socket.emit('error', {
        message: 'Failed to clear mock participants',
        code: 'CLEAR_FAILED',
      });
    }
  }
}
