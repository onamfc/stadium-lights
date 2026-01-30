import * as Brightness from 'expo-brightness';

export interface IBrightnessController {
  setMaxBrightness(): Promise<void>;
  setMinBrightness(): Promise<void>;
  restoreOriginalBrightness(): Promise<void>;
  isAvailable(): Promise<boolean>;
}

export class BrightnessService implements IBrightnessController {
  private originalBrightness: number | null = null;
  private hasPermission = false;

  async initialize(): Promise<void> {
    try {
      const { status } = await Brightness.requestPermissionsAsync();
      this.hasPermission = status === 'granted';

      if (this.hasPermission) {
        // Store original brightness to restore later
        this.originalBrightness = await Brightness.getBrightnessAsync();
      }
    } catch (error) {
      console.warn('Failed to initialize brightness service:', error);
      this.hasPermission = false;
    }
  }

  async setMaxBrightness(): Promise<void> {
    if (!this.hasPermission) {
      return;
    }

    try {
      // Store current brightness if we haven't already
      if (this.originalBrightness === null) {
        this.originalBrightness = await Brightness.getBrightnessAsync();
      }
      await Brightness.setBrightnessAsync(1.0);
    } catch (error) {
      console.warn('Failed to set max brightness:', error);
    }
  }

  async setMinBrightness(): Promise<void> {
    if (!this.hasPermission) {
      return;
    }

    try {
      // Use a low but not zero brightness so users can still see the screen
      await Brightness.setBrightnessAsync(0.1);
    } catch (error) {
      console.warn('Failed to set min brightness:', error);
    }
  }

  async restoreOriginalBrightness(): Promise<void> {
    if (!this.hasPermission || this.originalBrightness === null) {
      return;
    }

    try {
      await Brightness.setBrightnessAsync(this.originalBrightness);
    } catch (error) {
      console.warn('Failed to restore brightness:', error);
    }
  }

  async isAvailable(): Promise<boolean> {
    return this.hasPermission;
  }
}
