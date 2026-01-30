import { IFlashlightController } from '../interfaces/IFlashlightController';

/**
 * FlashlightService acts as a bridge to the actual flashlight implementation.
 * The implementation is set by the FlashlightProvider when it mounts.
 * This allows the service to be used in non-component contexts (like PatternExecutor)
 * while the actual camera-based implementation lives in a React component.
 */

type FlashlightImplementation = {
  turnOn: () => Promise<void>;
  turnOff: () => Promise<void>;
  isOn: () => boolean;
};

// Global implementation holder
let flashlightImpl: FlashlightImplementation | null = null;

export function setFlashlightImplementation(impl: FlashlightImplementation | null): void {
  flashlightImpl = impl;
  console.log('Flashlight implementation', impl ? 'set' : 'cleared');
}

export class FlashlightService implements IFlashlightController {
  private _isOn = false;

  async turnOn(): Promise<void> {
    if (flashlightImpl) {
      await flashlightImpl.turnOn();
      this._isOn = true;
    } else {
      console.warn('Flashlight implementation not available');
      this._isOn = true; // Track state even without implementation
    }
  }

  async turnOff(): Promise<void> {
    if (flashlightImpl) {
      await flashlightImpl.turnOff();
      this._isOn = false;
    } else {
      console.warn('Flashlight implementation not available');
      this._isOn = false;
    }
  }

  async toggle(): Promise<void> {
    if (this._isOn) {
      await this.turnOff();
    } else {
      await this.turnOn();
    }
  }

  isOn(): boolean {
    if (flashlightImpl) {
      return flashlightImpl.isOn();
    }
    return this._isOn;
  }

  async isAvailable(): Promise<boolean> {
    return flashlightImpl !== null;
  }
}
