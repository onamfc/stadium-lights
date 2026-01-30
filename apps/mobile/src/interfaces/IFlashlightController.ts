export interface IFlashlightController {
  /**
   * Turns the flashlight on
   */
  turnOn(): Promise<void>;

  /**
   * Turns the flashlight off
   */
  turnOff(): Promise<void>;

  /**
   * Toggles the flashlight state
   */
  toggle(): Promise<void>;

  /**
   * Checks if the flashlight is currently on
   */
  isOn(): boolean;

  /**
   * Checks if the device has a flashlight
   */
  isAvailable(): Promise<boolean>;
}
