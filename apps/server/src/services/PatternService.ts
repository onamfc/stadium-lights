import {
  PatternConfig,
  PatternExecution,
  Zone,
  ZoneSchedule,
  PATTERN_CATALOG,
  PatternInfo,
  PatternType,
} from '@stadium-lights/shared';
import { IPatternService } from '../interfaces/IPatternService';
import { PatternRegistry } from '../patterns/PatternRegistry';

export class PatternService implements IPatternService {
  private readonly patternRegistry: PatternRegistry;

  constructor() {
    this.patternRegistry = new PatternRegistry();
  }

  getPatterns(): PatternInfo[] {
    return PATTERN_CATALOG;
  }

  getPattern(id: PatternType): PatternInfo | null {
    return PATTERN_CATALOG.find((p) => p.id === id) || null;
  }

  generateExecution(
    patternId: PatternType,
    zones: Zone[],
    config?: PatternConfig
  ): PatternExecution {
    const pattern = this.patternRegistry.getPattern(patternId);

    if (!pattern) {
      throw new Error(`Pattern not found: ${patternId}`);
    }

    const patternInfo = this.getPattern(patternId);
    const mergedConfig: PatternConfig = {
      ...patternInfo?.defaultConfig,
      ...config,
    };

    const zoneSchedule = pattern.generateSchedule(zones, mergedConfig);

    // Calculate actual duration from the schedule (may be longer than config duration
    // if pattern needs to complete a full cycle)
    const timeOffsets = Object.keys(zoneSchedule).map(Number);
    const actualDuration = timeOffsets.length > 0
      ? Math.max(...timeOffsets) + 100 // Add buffer for last state to be visible
      : pattern.getDuration(mergedConfig);

    return {
      patternId,
      startTime: Date.now(),
      duration: actualDuration,
      zoneSchedule,
      loop: false,
      mode: mergedConfig.mode || 'grid',
    };
  }

  validateConfig(patternId: PatternType, config: PatternConfig): boolean {
    const pattern = this.getPattern(patternId);

    if (!pattern) {
      return false;
    }

    // Basic validation
    if (config.duration !== undefined && config.duration <= 0) {
      return false;
    }

    if (config.speed !== undefined && config.speed <= 0) {
      return false;
    }

    if (config.frequency !== undefined && config.frequency <= 0) {
      return false;
    }

    if (config.density !== undefined && (config.density < 0 || config.density > 1)) {
      return false;
    }

    return true;
  }
}
