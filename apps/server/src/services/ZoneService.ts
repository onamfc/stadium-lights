import {
  Coordinates,
  IZoneCalculator,
  StadiumBounds,
  Zone,
} from '@stadium-lights/shared';
import { IZoneService } from '../interfaces/IZoneService';

export class ZoneService implements IZoneService, IZoneCalculator {
  private zonesByGroup = new Map<string, Zone[]>();

  createZoneGrid(
    groupId: string,
    bounds: StadiumBounds,
    rows: number,
    cols: number
  ): Zone[] {
    const zones = this.generateZones(bounds, rows, cols);
    this.zonesByGroup.set(groupId, zones);
    return zones;
  }

  getZones(groupId: string): Zone[] {
    return this.zonesByGroup.get(groupId) || [];
  }

  findZoneForCoordinates(groupId: string, coordinates: Coordinates): string | null {
    const zones = this.getZones(groupId);
    return this.findZone(coordinates, zones);
  }

  clearZones(groupId: string): void {
    this.zonesByGroup.delete(groupId);
  }

  getZone(groupId: string, zoneId: string): Zone | null {
    const zones = this.getZones(groupId);
    return zones.find((z) => z.id === zoneId) || null;
  }

  // IZoneCalculator implementation

  generateZones(bounds: StadiumBounds, rows: number, cols: number): Zone[] {
    const zones: Zone[] = [];

    // Calculate the lat/lng range
    const minLat = Math.min(
      bounds.topLeft.latitude,
      bounds.topRight.latitude,
      bounds.bottomLeft.latitude,
      bounds.bottomRight.latitude
    );
    const maxLat = Math.max(
      bounds.topLeft.latitude,
      bounds.topRight.latitude,
      bounds.bottomLeft.latitude,
      bounds.bottomRight.latitude
    );
    const minLng = Math.min(
      bounds.topLeft.longitude,
      bounds.topRight.longitude,
      bounds.bottomLeft.longitude,
      bounds.bottomRight.longitude
    );
    const maxLng = Math.max(
      bounds.topLeft.longitude,
      bounds.topRight.longitude,
      bounds.bottomLeft.longitude,
      bounds.bottomRight.longitude
    );

    const latStep = (maxLat - minLat) / rows;
    const lngStep = (maxLng - minLng) / cols;

    // Calculate stadium center for ring mode
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    const maxDistance = Math.sqrt(
      Math.pow((maxLat - minLat) / 2, 2) + Math.pow((maxLng - minLng) / 2, 2)
    );

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        // Calculate zone center
        const zoneCenterLat = minLat + (row + 0.5) * latStep;
        const zoneCenterLng = minLng + (col + 0.5) * lngStep;

        // Calculate angle from stadium center (0-360 degrees, 0 = right/east, going counter-clockwise)
        const deltaLat = zoneCenterLat - centerLat;
        const deltaLng = zoneCenterLng - centerLng;
        let angle = Math.atan2(deltaLat, deltaLng) * (180 / Math.PI);
        if (angle < 0) angle += 360; // Normalize to 0-360

        // Calculate normalized distance from center (0-1)
        const distance = Math.sqrt(deltaLat * deltaLat + deltaLng * deltaLng) / maxDistance;

        const zone: Zone = {
          id: `zone-${row}-${col}`,
          row,
          col,
          bounds: {
            minLat: minLat + row * latStep,
            maxLat: minLat + (row + 1) * latStep,
            minLng: minLng + col * lngStep,
            maxLng: minLng + (col + 1) * lngStep,
          },
          angle,
          distance,
        };
        zones.push(zone);
      }
    }

    return zones;
  }

  findZone(coords: Coordinates, zones: Zone[]): string | null {
    for (const zone of zones) {
      if (
        coords.latitude >= zone.bounds.minLat &&
        coords.latitude < zone.bounds.maxLat &&
        coords.longitude >= zone.bounds.minLng &&
        coords.longitude < zone.bounds.maxLng
      ) {
        return zone.id;
      }
    }
    return null;
  }

  getZoneCenter(zone: Zone): Coordinates {
    return {
      latitude: (zone.bounds.minLat + zone.bounds.maxLat) / 2,
      longitude: (zone.bounds.minLng + zone.bounds.maxLng) / 2,
    };
  }

  getZoneDistance(zone1: Zone, zone2: Zone): number {
    const center1 = this.getZoneCenter(zone1);
    const center2 = this.getZoneCenter(zone2);

    // Simple Euclidean distance (good enough for small areas like a stadium)
    const latDiff = center1.latitude - center2.latitude;
    const lngDiff = center1.longitude - center2.longitude;

    return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
  }
}
