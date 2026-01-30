import { Coordinates, PatternConfig, PatternExecution, StadiumBounds } from './models';

// Client → Server Events
export interface CreateGroupPayload {
  deviceId: string;
  displayName: string;
  stadiumBounds: StadiumBounds;
  gridSize?: { rows: number; cols: number };
  customCode?: string; // Optional custom code (e.g., "COLDPLAY2024") - if not provided, a random code is generated
}

export interface JoinGroupPayload {
  code: string;
  deviceId: string;
  displayName: string;
}

export interface UpdateLocationPayload {
  latitude: number;
  longitude: number;
}

export interface TriggerPatternPayload {
  patternId: string;
  config?: PatternConfig;
}

export interface UpdatePatternPayload {
  config: PatternConfig;
}

export interface GetMyGroupsPayload {
  deviceId: string;
}

export interface ResumeGroupPayload {
  deviceId: string;
  groupId: string;
}

export interface ReleaseGroupPayload {
  deviceId: string;
  groupId: string;
}

// Mock participant events (for testing)
export interface SpawnMockParticipantsPayload {
  count: number;
}

export interface ClearMockParticipantsPayload {}

export interface MockParticipantsSpawnedPayload {
  count: number;
  totalParticipants: number;
}

export interface MockParticipantsClearedPayload {
  clearedCount: number;
  totalParticipants: number;
}

// Visualizer events
export interface JoinVisualizerPayload {
  code: string;
}

export interface VisualizerZoneData {
  id: string;
  row: number;
  col: number;
  angle?: number;
  distance?: number;
}

export interface VisualizerJoinedPayload {
  groupId: string;
  gridSize: { rows: number; cols: number };
  participantCount: number;
  zoneDistribution: Record<string, number>;
  zones: VisualizerZoneData[];
}

// Server → Client Events
export interface GroupCreatedPayload {
  groupId: string;
  code: string;
  expiresAt: string; // ISO date string
}

export interface GroupSummary {
  groupId: string;
  code: string;
  participantCount: number;
  createdAt: string; // ISO date string
  expiresAt: string; // ISO date string
}

export interface MyGroupsPayload {
  groups: GroupSummary[];
}

export interface GroupResumedPayload {
  groupId: string;
  code: string;
  participantCount: number;
  expiresAt: string; // ISO date string
  activePattern?: PatternExecution; // If a pattern is currently playing
}

export interface GroupReleasedPayload {
  groupId: string;
  code: string;
}

export interface GroupJoinedPayload {
  groupId: string;
  zoneId: string | null;
  participantCount: number;
  activePattern?: PatternExecution; // If a pattern is currently playing, new users receive it
}

export interface ZoneUpdatedPayload {
  zoneId: string;
}

export interface ParticipantCountPayload {
  count: number;
  zoneDistribution: Record<string, number>;
}

export interface PatternStartPayload extends PatternExecution {}

export interface PatternStopPayload {}

export interface TimeSyncPayload {
  serverTime: number;
}

export interface ErrorPayload {
  message: string;
  code?: string;
}

// Event type maps for type-safe socket handling
export interface ClientToServerEvents {
  create_group: (payload: CreateGroupPayload) => void;
  join_group: (payload: JoinGroupPayload) => void;
  update_location: (payload: UpdateLocationPayload) => void;
  trigger_pattern: (payload: TriggerPatternPayload) => void;
  update_pattern: (payload: UpdatePatternPayload) => void;
  stop_pattern: () => void;
  get_my_groups: (payload: GetMyGroupsPayload) => void;
  resume_group: (payload: ResumeGroupPayload) => void;
  release_group: (payload: ReleaseGroupPayload) => void;
  // Mock/testing events
  spawn_mock_participants: (payload: SpawnMockParticipantsPayload) => void;
  clear_mock_participants: (payload: ClearMockParticipantsPayload) => void;
  // Visualizer events
  join_visualizer: (payload: JoinVisualizerPayload) => void;
}

export interface ServerToClientEvents {
  group_created: (payload: GroupCreatedPayload) => void;
  group_joined: (payload: GroupJoinedPayload) => void;
  zone_updated: (payload: ZoneUpdatedPayload) => void;
  participant_count: (payload: ParticipantCountPayload) => void;
  pattern_start: (payload: PatternStartPayload) => void;
  pattern_stop: (payload: PatternStopPayload) => void;
  time_sync: (payload: TimeSyncPayload) => void;
  error: (payload: ErrorPayload) => void;
  my_groups: (payload: MyGroupsPayload) => void;
  group_resumed: (payload: GroupResumedPayload) => void;
  group_released: (payload: GroupReleasedPayload) => void;
  // Mock/testing events
  mock_participants_spawned: (payload: MockParticipantsSpawnedPayload) => void;
  mock_participants_cleared: (payload: MockParticipantsClearedPayload) => void;
  // Visualizer events
  visualizer_joined: (payload: VisualizerJoinedPayload) => void;
}
