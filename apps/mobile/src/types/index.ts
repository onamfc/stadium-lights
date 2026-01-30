// Re-export shared types
export * from '@stadium-lights/shared';

// App-specific types
export interface AppState {
  deviceId: string;
  displayName: string;
  groupId: string | null;
  groupCode: string | null;
  isController: boolean;
  zoneId: string | null;
  isConnected: boolean;
  participantCount: number;
}

export type AppScreen = 'home' | 'controller' | 'participant';

export interface ConnectionStatus {
  isConnected: boolean;
  lastError: string | null;
}
