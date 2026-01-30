import { io, Socket } from 'socket.io-client';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  CreateGroupPayload,
  JoinGroupPayload,
  UpdateLocationPayload,
  TriggerPatternPayload,
  UpdatePatternPayload,
  GetMyGroupsPayload,
  ResumeGroupPayload,
  ReleaseGroupPayload,
  GroupSummary,
} from '@stadium-lights/shared';
import { ISocketClient } from '../interfaces/ISocketClient';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export class SocketService implements ISocketClient {
  private socket: TypedSocket | null = null;
  private _isConnected = false;
  private _serverUrl: string | null = null;
  private _reconnectAttempt = 0;

  async connect(serverUrl: string): Promise<void> {
    this._serverUrl = serverUrl;

    return new Promise((resolve, reject) => {
      try {
        this.socket = io(serverUrl, {
          transports: ['websocket'],
          autoConnect: true,
          reconnection: true,
          reconnectionAttempts: Infinity,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 10000,
          randomizationFactor: 0.5,
        });

        const handleFirstConnect = () => {
          this._isConnected = true;
          this._reconnectAttempt = 0;
          console.log('Connected to server');
          this.socket?.off('connect', handleFirstConnect);
          resolve();
        };

        this.socket.on('connect', handleFirstConnect);

        this.socket.on('connect_error', (error) => {
          console.error('Connection error:', error);
          if (!this._isConnected) {
            reject(error);
          }
        });

        this.socket.on('disconnect', (reason) => {
          this._isConnected = false;
          console.log('Disconnected from server:', reason);
        });

        this.socket.io.on('reconnect_attempt', (attempt) => {
          this._reconnectAttempt = attempt;
          console.log('Reconnection attempt:', attempt);
        });

        this.socket.io.on('reconnect', (attempt) => {
          this._isConnected = true;
          this._reconnectAttempt = 0;
          console.log('Reconnected after', attempt, 'attempts');
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this._isConnected = false;
    }
  }

  isConnected(): boolean {
    return this._isConnected;
  }

  // Client -> Server events
  createGroup(payload: CreateGroupPayload): void {
    console.log('SocketService.createGroup called, socket exists:', !!this.socket);
    console.log('Payload:', JSON.stringify(payload));
    this.socket?.emit('create_group', payload);
  }

  joinGroup(payload: JoinGroupPayload): void {
    this.socket?.emit('join_group', payload);
  }

  updateLocation(payload: UpdateLocationPayload): void {
    this.socket?.emit('update_location', payload);
  }

  triggerPattern(payload: TriggerPatternPayload): void {
    console.log('SocketService.triggerPattern called, socket exists:', !!this.socket);
    console.log('Socket connected:', this._isConnected);
    this.socket?.emit('trigger_pattern', payload);
  }

  updatePattern(payload: UpdatePatternPayload): void {
    this.socket?.emit('update_pattern', payload);
  }

  stopPattern(): void {
    this.socket?.emit('stop_pattern');
  }

  getMyGroups(payload: GetMyGroupsPayload): void {
    this.socket?.emit('get_my_groups', payload);
  }

  resumeGroup(payload: ResumeGroupPayload): void {
    this.socket?.emit('resume_group', payload);
  }

  releaseGroup(payload: ReleaseGroupPayload): void {
    this.socket?.emit('release_group', payload);
  }

  // Mock participant events (for testing)
  spawnMockParticipants(count: number): void {
    this.socket?.emit('spawn_mock_participants', { count });
  }

  clearMockParticipants(): void {
    this.socket?.emit('clear_mock_participants', {});
  }

  // Server -> Client event listeners
  onGroupCreated(handler: (payload: { groupId: string; code: string; expiresAt: string }) => void): void {
    this.socket?.on('group_created', handler);
  }

  onGroupJoined(
    handler: (payload: {
      groupId: string;
      zoneId: string | null;
      participantCount: number;
      activePattern?: any;
    }) => void
  ): void {
    this.socket?.on('group_joined', handler);
  }

  onZoneUpdated(handler: (payload: { zoneId: string }) => void): void {
    this.socket?.on('zone_updated', handler);
  }

  onParticipantCount(
    handler: (payload: { count: number; zoneDistribution: Record<string, number> }) => void
  ): void {
    this.socket?.on('participant_count', handler);
  }

  onPatternStart(handler: (payload: any) => void): void {
    this.socket?.on('pattern_start', handler);
  }

  onPatternStop(handler: () => void): void {
    this.socket?.on('pattern_stop', handler);
  }

  onTimeSync(handler: (payload: { serverTime: number }) => void): void {
    this.socket?.on('time_sync', handler);
  }

  onError(handler: (payload: { message: string; code?: string }) => void): void {
    this.socket?.on('error', handler);
  }

  onDisconnect(handler: () => void): void {
    this.socket?.on('disconnect', handler);
  }

  onConnect(handler: () => void): void {
    this.socket?.on('connect', handler);
  }

  onReconnect(handler: (payload: { attemptNumber: number }) => void): void {
    this.socket?.io.on('reconnect', (attemptNumber) => {
      handler({ attemptNumber });
    });
  }

  onReconnectAttempt(handler: (payload: { attemptNumber: number }) => void): void {
    this.socket?.io.on('reconnect_attempt', (attemptNumber) => {
      handler({ attemptNumber });
    });
  }

  onMyGroups(handler: (payload: { groups: GroupSummary[] }) => void): void {
    this.socket?.on('my_groups', handler);
  }

  onGroupResumed(handler: (payload: { groupId: string; code: string; participantCount: number; expiresAt: string; activePattern?: any }) => void): void {
    this.socket?.on('group_resumed', handler);
  }

  onGroupReleased(handler: (payload: { groupId: string; code: string }) => void): void {
    this.socket?.on('group_released', handler);
  }

  onMockParticipantsSpawned(handler: (payload: { count: number; totalParticipants: number }) => void): void {
    this.socket?.on('mock_participants_spawned', handler);
  }

  onMockParticipantsCleared(handler: (payload: { clearedCount: number; totalParticipants: number }) => void): void {
    this.socket?.on('mock_participants_cleared', handler);
  }

  removeAllListeners(): void {
    this.socket?.removeAllListeners();
  }
}
