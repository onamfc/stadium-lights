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

type EventHandler<T> = (payload: T) => void;

export interface ISocketClient {
  /**
   * Connects to the server
   */
  connect(serverUrl: string): Promise<void>;

  /**
   * Disconnects from the server
   */
  disconnect(): void;

  /**
   * Checks if connected to the server
   */
  isConnected(): boolean;

  // Client -> Server events
  createGroup(payload: CreateGroupPayload): void;
  joinGroup(payload: JoinGroupPayload): void;
  updateLocation(payload: UpdateLocationPayload): void;
  triggerPattern(payload: TriggerPatternPayload): void;
  updatePattern(payload: UpdatePatternPayload): void;
  stopPattern(): void;
  getMyGroups(payload: GetMyGroupsPayload): void;
  resumeGroup(payload: ResumeGroupPayload): void;
  releaseGroup(payload: ReleaseGroupPayload): void;
  // Mock participant events (for testing)
  spawnMockParticipants(count: number): void;
  clearMockParticipants(): void;

  // Server -> Client event listeners
  onGroupCreated(handler: EventHandler<{ groupId: string; code: string; expiresAt: string }>): void;
  onGroupJoined(
    handler: EventHandler<{ groupId: string; zoneId: string | null; participantCount: number; activePattern?: any }>
  ): void;
  onZoneUpdated(handler: EventHandler<{ zoneId: string }>): void;
  onParticipantCount(
    handler: EventHandler<{ count: number; zoneDistribution: Record<string, number> }>
  ): void;
  onPatternStart(handler: EventHandler<any>): void;
  onPatternStop(handler: EventHandler<void>): void;
  onTimeSync(handler: EventHandler<{ serverTime: number }>): void;
  onError(handler: EventHandler<{ message: string; code?: string }>): void;
  onDisconnect(handler: EventHandler<void>): void;
  onConnect(handler: EventHandler<void>): void;
  onReconnect(handler: EventHandler<{ attemptNumber: number }>): void;
  onReconnectAttempt(handler: EventHandler<{ attemptNumber: number }>): void;
  onMyGroups(handler: EventHandler<{ groups: GroupSummary[] }>): void;
  onGroupResumed(handler: EventHandler<{ groupId: string; code: string; participantCount: number; expiresAt: string }>): void;
  onGroupReleased(handler: EventHandler<{ groupId: string; code: string }>): void;
  // Mock participant event listeners
  onMockParticipantsSpawned(handler: EventHandler<{ count: number; totalParticipants: number }>): void;
  onMockParticipantsCleared(handler: EventHandler<{ clearedCount: number; totalParticipants: number }>): void;

  /**
   * Removes all event listeners
   */
  removeAllListeners(): void;
}
