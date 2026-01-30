import { PatternConfig, PatternType, Zone, ZoneSchedule } from '@stadium-lights/shared';
import { BasePattern } from './BasePattern';

export class PulsePattern extends BasePattern {
  readonly id = PatternType.PULSE;
  readonly name = 'Pulse';

  generateSchedule(zones: Zone[], config: PatternConfig): ZoneSchedule {
    const schedule: ZoneSchedule = {};
    const speed = config.speed || 300;
    const isRing = this.isRingMode(config);

    // Group zones by distance from center
    const zonesByDistance: Map<number, Zone[]> = new Map();

    if (isRing) {
      // Use pre-calculated normalized distance (0-1), bucketed into 10 levels
      const numBuckets = 10;
      for (const zone of zones) {
        const bucket = Math.floor((zone.distance ?? 0) * numBuckets);
        if (!zonesByDistance.has(bucket)) {
          zonesByDistance.set(bucket, []);
        }
        zonesByDistance.get(bucket)!.push(zone);
      }
    } else {
      // Grid mode: calculate distance from row/col center
      const maxRow = Math.max(...zones.map((z) => z.row));
      const maxCol = Math.max(...zones.map((z) => z.col));
      const centerRow = maxRow / 2;
      const centerCol = maxCol / 2;

      for (const zone of zones) {
        const distance = Math.round(this.getDistanceFromCenter(zone, centerRow, centerCol));
        if (!zonesByDistance.has(distance)) {
          zonesByDistance.set(distance, []);
        }
        zonesByDistance.get(distance)!.push(zone);
      }
    }

    // Sort distances
    const distances = [...zonesByDistance.keys()].sort((a, b) => a - b);

    // Generate exactly ONE cycle - looping is handled by the client
    for (let i = 0; i < distances.length; i++) {
      const distance = distances[i];
      const zonesAtDistance = zonesByDistance.get(distance)!;
      const timeOffset = i * speed;

      // Turn on
      schedule[timeOffset] = zonesAtDistance.map((z) => this.createState(z.id, true));

      // Turn off
      const offTime = timeOffset + speed * 0.7;
      if (!schedule[offTime]) {
        schedule[offTime] = [];
      }
      schedule[offTime].push(
        ...zonesAtDistance.map((z) => this.createState(z.id, false))
      );
    }

    return schedule;
  }
}
