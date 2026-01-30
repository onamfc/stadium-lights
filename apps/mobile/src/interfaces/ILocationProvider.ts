import { Coordinates } from '@stadium-lights/shared';

export interface ILocationProvider {
  /**
   * Requests location permissions from the user
   */
  requestPermissions(): Promise<boolean>;

  /**
   * Gets the current GPS position
   */
  getCurrentPosition(): Promise<Coordinates>;

  /**
   * Watches for position changes
   * @returns A cleanup function to stop watching
   */
  watchPosition(callback: (coords: Coordinates) => void): () => void;

  /**
   * Checks if location services are enabled
   */
  isEnabled(): Promise<boolean>;
}
