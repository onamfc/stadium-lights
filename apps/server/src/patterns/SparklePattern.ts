import { PatternConfig, PatternType, Zone, ZoneSchedule } from '@stadium-lights/shared';
import { BasePattern } from './BasePattern';

export class SparklePattern extends BasePattern {
  readonly id = PatternType.SPARKLE;
  readonly name = 'Random Sparkle';

  generateSchedule(zones: Zone[], config: PatternConfig): ZoneSchedule {
    const schedule: ZoneSchedule = {};
    const density = config.density || 0.3; // 30% of zones lit at any time
    const speed = config.speed || 100; // ms between sparkle updates
    const duration = this.getDuration(config);

    const numZonesToLight = Math.max(1, Math.floor(zones.length * density));

    // Use a seeded random for reproducibility across devices
    let seed = 12345;
    const seededRandom = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };

    let time = 0;
    let previouslyLit = new Set<string>();

    while (time < duration) {
      // Pick random zones to light
      const shuffled = [...zones].sort(() => seededRandom() - 0.5);
      const toLit = shuffled.slice(0, numZonesToLight);
      const litIds = new Set(toLit.map((z) => z.id));

      const states = zones.map((z) => {
        const isOn = litIds.has(z.id);
        const wasOn = previouslyLit.has(z.id);

        // Only include state changes for efficiency
        if (isOn !== wasOn) {
          return this.createState(z.id, isOn);
        }
        return null;
      }).filter(Boolean) as typeof schedule[number];

      if (states.length > 0) {
        schedule[time] = states;
      }

      previouslyLit = litIds;
      time += speed;
    }

    // Turn all off at the end
    schedule[duration] = zones.map((z) => this.createState(z.id, false));

    return schedule;
  }
}
