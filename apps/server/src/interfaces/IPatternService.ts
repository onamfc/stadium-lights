import { PatternConfig, PatternExecution, Zone } from '@stadium-lights/shared';
import { PatternInfo, PatternType } from '@stadium-lights/shared';

export interface IPatternService {
  /**
   * Gets all available patterns
   */
  getPatterns(): PatternInfo[];

  /**
   * Gets a pattern by ID
   */
  getPattern(id: PatternType): PatternInfo | null;

  /**
   * Generates a pattern execution for a set of zones
   */
  generateExecution(
    patternId: PatternType,
    zones: Zone[],
    config?: PatternConfig
  ): PatternExecution;

  /**
   * Validates pattern configuration
   */
  validateConfig(patternId: PatternType, config: PatternConfig): boolean;
}
