import { IPatternExecutor, PatternExecution, ZoneState } from '@stadium-lights/shared';
import { IFlashlightController } from '../interfaces/IFlashlightController';
import { TimeSyncService } from '../services/TimeSyncService';
import { IBrightnessController } from '../services/BrightnessService';

export class PatternExecutor implements IPatternExecutor {
  private intervalId: NodeJS.Timeout | null = null;
  private _isExecuting = false;
  private currentExecution: PatternExecution | null = null;
  private currentZoneId: string | null = null;
  private lastState: boolean | null = null;

  constructor(
    private readonly flashlight: IFlashlightController,
    private readonly timeSync: TimeSyncService,
    private readonly brightness?: IBrightnessController
  ) {}

  execute(execution: PatternExecution, zoneId: string): void {
    if (this._isExecuting) {
      this.stop();
    }

    this._isExecuting = true;
    this.currentExecution = execution;
    this.currentZoneId = zoneId;
    this.lastState = null;

    console.log(`Executing pattern ${execution.patternId} for zone ${zoneId} (loop: ${execution.loop})`);

    // Start the execution loop
    this.startExecutionLoop();
  }

  private startExecutionLoop(): void {
    // Check state every 16ms (~60fps) for smooth execution
    this.intervalId = setInterval(() => {
      this.updateState();
    }, 16);

    // Also update immediately
    this.updateState();
  }

  private updateState(): void {
    if (!this.currentExecution || !this.currentZoneId) {
      return;
    }

    const { startTime, duration, zoneSchedule, loop } = this.currentExecution;
    const serverTime = this.timeSync.getServerTime();

    // Calculate elapsed time since pattern started
    let elapsed = serverTime - startTime;

    if (elapsed < 0) {
      // Pattern hasn't started yet
      return;
    }

    if (loop) {
      // For looping patterns, wrap around
      elapsed = elapsed % duration;
    } else if (elapsed >= duration) {
      // Non-looping pattern has ended
      this.stop();
      return;
    }

    // Find the state that should be active at this time
    const currentState = this.getStateAtTime(elapsed, zoneSchedule, this.currentZoneId);

    // Only apply if state changed (to reduce flashlight API calls)
    if (currentState !== null && currentState !== this.lastState) {
      this.lastState = currentState;
      if (currentState) {
        this.flashlight.turnOn().catch(console.error);
        // Also set screen brightness to max for visual feedback
        this.brightness?.setMaxBrightness().catch(console.error);
      } else {
        this.flashlight.turnOff().catch(console.error);
        // Dim screen when flashlight is off
        this.brightness?.setMinBrightness().catch(console.error);
      }
    }
  }

  private getStateAtTime(
    elapsed: number,
    zoneSchedule: { [key: number]: ZoneState[] },
    zoneId: string
  ): boolean | null {
    // Get all time offsets sorted
    const timeOffsets = Object.keys(zoneSchedule)
      .map(Number)
      .sort((a, b) => a - b);

    // Find the most recent time offset that has passed
    let activeState: boolean | null = null;

    for (const offset of timeOffsets) {
      if (offset <= elapsed) {
        const states = zoneSchedule[offset];
        const myState = states.find((s) => s.zoneId === zoneId);
        if (myState) {
          activeState = myState.isOn;
        }
      } else {
        // Future offset, stop looking
        break;
      }
    }

    return activeState;
  }

  stop(): void {
    // Clear the execution loop
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Turn off flashlight
    this.flashlight.turnOff().catch(console.error);

    // Restore original brightness
    this.brightness?.restoreOriginalBrightness().catch(console.error);

    this._isExecuting = false;
    this.currentExecution = null;
    this.currentZoneId = null;
    this.lastState = null;

    console.log('Pattern execution stopped');
  }

  isExecuting(): boolean {
    return this._isExecuting;
  }
}
