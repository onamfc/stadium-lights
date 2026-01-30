import {
  CreateGroupPayload,
  JoinGroupPayload,
  GetMyGroupsPayload,
  ResumeGroupPayload,
  ReleaseGroupPayload,
  validateCode,
  validateDeviceId,
  validateDisplayName,
} from '@stadium-lights/shared';
import { IGroupService } from '../interfaces/IGroupService';
import { IParticipantService } from '../interfaces/IParticipantService';
import { IZoneService } from '../interfaces/IZoneService';
import { ISocketHandler, TypedSocket } from './HandlerRegistry';
import { ActivePatternStore } from '../services/ActivePatternStore';

// Socket data storage
interface SocketData {
  deviceId: string;
  groupId: string;
  isController: boolean;
  socketId: string;
}

// Track by both socketId and deviceId for reconnection handling
const socketDataBySocketId = new Map<string, SocketData>();
const socketDataByDeviceId = new Map<string, SocketData>();

export class GroupHandler implements ISocketHandler {
  constructor(
    private readonly groupService: IGroupService,
    private readonly participantService: IParticipantService,
    private readonly zoneService: IZoneService
  ) {}

  attachToSocket(socket: TypedSocket): void {
    socket.on('create_group', async (payload: CreateGroupPayload) => {
      await this.handleCreateGroup(socket, payload);
    });

    socket.on('join_group', async (payload: JoinGroupPayload) => {
      await this.handleJoinGroup(socket, payload);
    });

    socket.on('get_my_groups', async (payload: GetMyGroupsPayload) => {
      await this.handleGetMyGroups(socket, payload);
    });

    socket.on('resume_group', async (payload: ResumeGroupPayload) => {
      await this.handleResumeGroup(socket, payload);
    });

    socket.on('release_group', async (payload: ReleaseGroupPayload) => {
      await this.handleReleaseGroup(socket, payload);
    });

    socket.on('disconnect', async () => {
      await this.handleDisconnect(socket);
    });
  }

  private storeSocketData(data: SocketData): void {
    // Clean up old socket mapping if device reconnected
    const existingData = socketDataByDeviceId.get(data.deviceId);
    if (existingData && existingData.socketId !== data.socketId) {
      console.log(`Device ${data.deviceId} reconnected with new socket ${data.socketId}`);
      socketDataBySocketId.delete(existingData.socketId);
    }

    socketDataBySocketId.set(data.socketId, data);
    socketDataByDeviceId.set(data.deviceId, data);

    console.log(`Stored socket data: socketId=${data.socketId}, deviceId=${data.deviceId}, groupId=${data.groupId}`);
  }

  private async handleCreateGroup(
    socket: TypedSocket,
    payload: CreateGroupPayload
  ): Promise<void> {
    try {
      // Validate device ID
      const deviceIdValidation = validateDeviceId(payload.deviceId);
      if (!deviceIdValidation.valid) {
        socket.emit('error', { message: deviceIdValidation.error!, code: 'INVALID_DEVICE_ID' });
        return;
      }

      // Validate custom code if provided
      let sanitizedCode: string | undefined;
      if (payload.customCode) {
        const codeValidation = validateCode(payload.customCode);
        if (!codeValidation.valid) {
          socket.emit('error', { message: codeValidation.error!, code: 'INVALID_CODE' });
          return;
        }
        sanitizedCode = codeValidation.sanitized;
      }

      const { group, code } = await this.groupService.createGroup({
        controllerDeviceId: deviceIdValidation.sanitized!,
        stadiumBounds: payload.stadiumBounds,
        gridSize: payload.gridSize,
        customCode: sanitizedCode,
      });

      // Store socket data
      this.storeSocketData({
        deviceId: payload.deviceId,
        groupId: group.id,
        isController: true,
        socketId: socket.id,
      });

      // Join the socket room for this group
      socket.join(group.id);

      socket.emit('group_created', {
        groupId: group.id,
        code,
        expiresAt: group.expiresAt.toISOString(),
      });

      console.log(`Group created: ${code} (groupId: ${group.id}, expires: ${group.expiresAt.toISOString()})`);
    } catch (error: any) {
      console.error('Error creating group:', error);
      socket.emit('error', {
        message: error.message || 'Failed to create group',
        code: 'CREATE_GROUP_FAILED',
      });
    }
  }

  private async handleJoinGroup(
    socket: TypedSocket,
    payload: JoinGroupPayload
  ): Promise<void> {
    try {
      // Validate code
      const codeValidation = validateCode(payload.code);
      if (!codeValidation.valid) {
        socket.emit('error', { message: codeValidation.error!, code: 'INVALID_CODE' });
        return;
      }

      // Validate device ID
      const deviceIdValidation = validateDeviceId(payload.deviceId);
      if (!deviceIdValidation.valid) {
        socket.emit('error', { message: deviceIdValidation.error!, code: 'INVALID_DEVICE_ID' });
        return;
      }

      // Validate display name
      const displayNameValidation = validateDisplayName(payload.displayName);
      if (!displayNameValidation.valid) {
        socket.emit('error', { message: displayNameValidation.error!, code: 'INVALID_DISPLAY_NAME' });
        return;
      }

      const group = await this.groupService.joinGroup(codeValidation.sanitized!);

      if (!group) {
        socket.emit('error', {
          message: 'Invalid group code',
          code: 'INVALID_CODE',
        });
        return;
      }

      // For now, use a default location (0, 0) - will be updated when location is sent
      const participant = await this.participantService.join({
        groupId: group.id,
        deviceId: deviceIdValidation.sanitized!,
        displayName: displayNameValidation.sanitized!,
        coordinates: { latitude: 0, longitude: 0 },
      });

      // Store socket data
      this.storeSocketData({
        deviceId: payload.deviceId,
        groupId: group.id,
        isController: false,
        socketId: socket.id,
      });

      // Join the socket room for this group
      socket.join(group.id);

      const stats = await this.participantService.getStats(group.id);

      // Check if there's an active pattern for this group
      const activePattern = ActivePatternStore.getActivePattern(group.id);

      socket.emit('group_joined', {
        groupId: group.id,
        zoneId: participant.zoneId,
        participantCount: stats.count,
        activePattern: activePattern || undefined,
      });

      // Notify others in the group
      socket.to(group.id).emit('participant_count', {
        count: stats.count,
        zoneDistribution: stats.zoneDistribution,
      });

      console.log(`Participant joined group ${payload.code} (groupId: ${group.id})${activePattern ? ' - joining active pattern' : ''}`);
    } catch (error) {
      console.error('Error joining group:', error);
      socket.emit('error', {
        message: 'Failed to join group',
        code: 'JOIN_GROUP_FAILED',
      });
    }
  }

  private async handleGetMyGroups(
    socket: TypedSocket,
    payload: GetMyGroupsPayload
  ): Promise<void> {
    try {
      // Validate device ID
      const deviceIdValidation = validateDeviceId(payload.deviceId);
      if (!deviceIdValidation.valid) {
        socket.emit('error', { message: deviceIdValidation.error!, code: 'INVALID_DEVICE_ID' });
        return;
      }

      const groups = await this.groupService.getGroupsByController(deviceIdValidation.sanitized!);

      const groupSummaries = await Promise.all(
        groups.map(async (group) => {
          const stats = await this.participantService.getStats(group.id);
          return {
            groupId: group.id,
            code: group.code,
            participantCount: stats.count,
            createdAt: group.createdAt.toISOString(),
            expiresAt: group.expiresAt.toISOString(),
          };
        })
      );

      socket.emit('my_groups', { groups: groupSummaries });

      console.log(`Sent ${groupSummaries.length} groups to device ${payload.deviceId}`);
    } catch (error) {
      console.error('Error getting my groups:', error);
      socket.emit('error', {
        message: 'Failed to get groups',
        code: 'GET_GROUPS_FAILED',
      });
    }
  }

  private async handleResumeGroup(
    socket: TypedSocket,
    payload: ResumeGroupPayload
  ): Promise<void> {
    try {
      // Validate device ID
      const deviceIdValidation = validateDeviceId(payload.deviceId);
      if (!deviceIdValidation.valid) {
        socket.emit('error', { message: deviceIdValidation.error!, code: 'INVALID_DEVICE_ID' });
        return;
      }

      // Validate group ID (UUIDs are alphanumeric with hyphens)
      const groupIdValidation = validateDeviceId(payload.groupId); // Same format as device ID
      if (!groupIdValidation.valid) {
        socket.emit('error', { message: 'Invalid group ID', code: 'INVALID_GROUP_ID' });
        return;
      }

      const group = await this.groupService.resumeGroup(groupIdValidation.sanitized!, deviceIdValidation.sanitized!);

      if (!group) {
        socket.emit('error', {
          message: 'Group not found or you are not the controller',
          code: 'RESUME_FAILED',
        });
        return;
      }

      // Store socket data
      this.storeSocketData({
        deviceId: payload.deviceId,
        groupId: group.id,
        isController: true,
        socketId: socket.id,
      });

      // Join the socket room for this group
      socket.join(group.id);

      const stats = await this.participantService.getStats(group.id);

      // Check if there's an active pattern for this group
      const activePattern = ActivePatternStore.getActivePattern(group.id);

      socket.emit('group_resumed', {
        groupId: group.id,
        code: group.code,
        participantCount: stats.count,
        expiresAt: group.expiresAt.toISOString(),
        activePattern: activePattern || undefined,
      });

      console.log(`Controller resumed group ${group.code} (groupId: ${group.id})${activePattern ? ' - active pattern: ' + activePattern.patternId : ''}`);
    } catch (error) {
      console.error('Error resuming group:', error);
      socket.emit('error', {
        message: 'Failed to resume group',
        code: 'RESUME_FAILED',
      });
    }
  }

  private async handleReleaseGroup(
    socket: TypedSocket,
    payload: ReleaseGroupPayload
  ): Promise<void> {
    try {
      // Validate device ID
      const deviceIdValidation = validateDeviceId(payload.deviceId);
      if (!deviceIdValidation.valid) {
        socket.emit('error', { message: deviceIdValidation.error!, code: 'INVALID_DEVICE_ID' });
        return;
      }

      // Validate group ID
      const groupIdValidation = validateDeviceId(payload.groupId);
      if (!groupIdValidation.valid) {
        socket.emit('error', { message: 'Invalid group ID', code: 'INVALID_GROUP_ID' });
        return;
      }

      // Get group info before deleting (for the response)
      const groups = await this.groupService.getGroupsByController(deviceIdValidation.sanitized!);
      const group = groups.find(g => g.id === groupIdValidation.sanitized!);

      if (!group) {
        socket.emit('error', {
          message: 'Group not found or you are not the controller',
          code: 'RELEASE_FAILED',
        });
        return;
      }

      const code = group.code;
      const released = await this.groupService.releaseGroup(groupIdValidation.sanitized!, deviceIdValidation.sanitized!);

      if (!released) {
        socket.emit('error', {
          message: 'Failed to release group',
          code: 'RELEASE_FAILED',
        });
        return;
      }

      // Notify all participants in the group that it's been released
      socket.to(groupIdValidation.sanitized!).emit('error', {
        message: 'The group has been ended by the controller',
        code: 'GROUP_ENDED',
      });

      // Clear active pattern if any
      ActivePatternStore.clearActivePattern(groupIdValidation.sanitized!);

      socket.emit('group_released', {
        groupId: groupIdValidation.sanitized!,
        code,
      });

      console.log(`Group released: ${code} (groupId: ${payload.groupId})`);
    } catch (error) {
      console.error('Error releasing group:', error);
      socket.emit('error', {
        message: 'Failed to release group',
        code: 'RELEASE_FAILED',
      });
    }
  }

  private async handleDisconnect(socket: TypedSocket): Promise<void> {
    const data = socketDataBySocketId.get(socket.id);

    if (!data) {
      console.log(`Socket ${socket.id} disconnected (no data stored)`);
      return;
    }

    console.log(`Socket ${socket.id} disconnected (device: ${data.deviceId}, group: ${data.groupId}, isController: ${data.isController})`);

    try {
      if (!data.isController) {
        // Participants are removed from the group on disconnect
        await this.participantService.leave(data.groupId, data.deviceId);

        const stats = await this.participantService.getStats(data.groupId);

        socket.to(data.groupId).emit('participant_count', {
          count: stats.count,
          zoneDistribution: stats.zoneDistribution,
        });
      }
      // Controllers don't lose their group on disconnect - they can resume
    } catch (error) {
      console.error('Error handling disconnect:', error);
    } finally {
      socketDataBySocketId.delete(socket.id);
      socketDataByDeviceId.delete(data.deviceId);
    }
  }
}

// Export socket data getter for other handlers
export function getSocketData(socketId: string): SocketData | undefined {
  const data = socketDataBySocketId.get(socketId);
  if (data) {
    console.log(`getSocketData(${socketId}): found - groupId=${data.groupId}`);
  } else {
    console.log(`getSocketData(${socketId}): NOT FOUND`);
    console.log(`Current socket mappings: ${Array.from(socketDataBySocketId.keys()).join(', ') || 'none'}`);
  }
  return data;
}
