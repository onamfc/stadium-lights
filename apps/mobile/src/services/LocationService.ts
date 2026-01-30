import * as Location from 'expo-location';
import { Coordinates } from '@stadium-lights/shared';
import { ILocationProvider } from '../interfaces/ILocationProvider';

export class LocationService implements ILocationProvider {
  private watchSubscription: Location.LocationSubscription | null = null;

  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Failed to request location permissions:', error);
      return false;
    }
  }

  async getCurrentPosition(): Promise<Coordinates> {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error) {
      console.error('Failed to get current position:', error);
      throw error;
    }
  }

  watchPosition(callback: (coords: Coordinates) => void): () => void {
    // Start watching
    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000, // Update every 5 seconds
        distanceInterval: 5, // Or when moved 5 meters
      },
      (location) => {
        callback({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    ).then((subscription) => {
      this.watchSubscription = subscription;
    });

    // Return cleanup function
    return () => {
      if (this.watchSubscription) {
        this.watchSubscription.remove();
        this.watchSubscription = null;
      }
    };
  }

  async isEnabled(): Promise<boolean> {
    try {
      const enabled = await Location.hasServicesEnabledAsync();
      return enabled;
    } catch (error) {
      console.error('Failed to check location services:', error);
      return false;
    }
  }
}
