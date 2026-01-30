import { PatternExecution } from '../types/models';

export interface IPatternExecutor {
  /**
   * Executes a pattern based on the provided schedule
   * @param execution - Pattern execution details including schedule and timing
   * @param zoneId - The zone ID this device belongs to
   */
  execute(execution: PatternExecution, zoneId: string): void;

  /**
   * Stops the currently running pattern
   */
  stop(): void;

  /**
   * Returns whether a pattern is currently executing
   */
  isExecuting(): boolean;
}
