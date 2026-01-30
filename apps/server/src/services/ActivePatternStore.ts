import { PatternExecution } from '@stadium-lights/shared';

/**
 * In-memory store for active patterns per group
 * Patterns run continuously until stopped or replaced
 */
class ActivePatternStoreClass {
  private activePatterns = new Map<string, PatternExecution>();

  /**
   * Sets the active pattern for a group
   */
  setActivePattern(groupId: string, pattern: PatternExecution): void {
    this.activePatterns.set(groupId, pattern);
    console.log(`Active pattern set for group ${groupId}: ${pattern.patternId}`);
  }

  /**
   * Gets the active pattern for a group
   */
  getActivePattern(groupId: string): PatternExecution | null {
    return this.activePatterns.get(groupId) || null;
  }

  /**
   * Clears the active pattern for a group
   */
  clearActivePattern(groupId: string): void {
    this.activePatterns.delete(groupId);
    console.log(`Active pattern cleared for group ${groupId}`);
  }

  /**
   * Checks if a group has an active pattern
   */
  hasActivePattern(groupId: string): boolean {
    return this.activePatterns.has(groupId);
  }
}

// Singleton instance
export const ActivePatternStore = new ActivePatternStoreClass();
