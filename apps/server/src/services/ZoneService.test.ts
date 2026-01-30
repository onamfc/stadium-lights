import { describe, it, expect, beforeEach } from 'vitest';
import { ZoneService } from './ZoneService';
import { StadiumBounds } from '@stadium-lights/shared';

describe('ZoneService', () => {
  let zoneService: ZoneService;

  const mockStadiumBounds: StadiumBounds = {
    topLeft: { latitude: 40.760, longitude: -73.985 },
    topRight: { latitude: 40.760, longitude: -73.980 },
    bottomLeft: { latitude: 40.755, longitude: -73.985 },
    bottomRight: { latitude: 40.755, longitude: -73.980 },
  };

  beforeEach(() => {
    zoneService = new ZoneService();
  });

  describe('createZoneGrid', () => {
    it('should create a grid of zones', () => {
      const zones = zoneService.createZoneGrid('group-1', mockStadiumBounds, 3, 4);

      expect(zones.length).toBe(12); // 3 rows x 4 cols
    });

    it('should assign correct row and col to each zone', () => {
      const zones = zoneService.createZoneGrid('group-1', mockStadiumBounds, 2, 2);

      const zone00 = zones.find((z) => z.row === 0 && z.col === 0);
      const zone01 = zones.find((z) => z.row === 0 && z.col === 1);
      const zone10 = zones.find((z) => z.row === 1 && z.col === 0);
      const zone11 = zones.find((z) => z.row === 1 && z.col === 1);

      expect(zone00).toBeDefined();
      expect(zone01).toBeDefined();
      expect(zone10).toBeDefined();
      expect(zone11).toBeDefined();
    });

    it('should store zones per group', () => {
      zoneService.createZoneGrid('group-1', mockStadiumBounds, 2, 2);
      zoneService.createZoneGrid('group-2', mockStadiumBounds, 3, 3);

      const zones1 = zoneService.getZones('group-1');
      const zones2 = zoneService.getZones('group-2');

      expect(zones1.length).toBe(4);
      expect(zones2.length).toBe(9);
    });
  });

  describe('getZones', () => {
    it('should return empty array for non-existent group', () => {
      const zones = zoneService.getZones('non-existent');
      expect(zones).toEqual([]);
    });

    it('should return zones for existing group', () => {
      zoneService.createZoneGrid('group-1', mockStadiumBounds, 2, 2);

      const zones = zoneService.getZones('group-1');
      expect(zones.length).toBe(4);
    });
  });

  describe('findZoneForCoordinates', () => {
    it('should find the correct zone for coordinates within bounds', () => {
      zoneService.createZoneGrid('group-1', mockStadiumBounds, 2, 2);

      // Center of the stadium
      const zoneId = zoneService.findZoneForCoordinates('group-1', {
        latitude: 40.7575,
        longitude: -73.9825,
      });

      expect(zoneId).toBeDefined();
    });

    it('should return null for coordinates outside bounds', () => {
      zoneService.createZoneGrid('group-1', mockStadiumBounds, 2, 2);

      // Outside the stadium
      const zoneId = zoneService.findZoneForCoordinates('group-1', {
        latitude: 41.0,
        longitude: -74.0,
      });

      expect(zoneId).toBeNull();
    });

    it('should return null for non-existent group', () => {
      const zoneId = zoneService.findZoneForCoordinates('non-existent', {
        latitude: 40.7575,
        longitude: -73.9825,
      });

      expect(zoneId).toBeNull();
    });
  });

  describe('clearZones', () => {
    it('should remove zones for a group', () => {
      zoneService.createZoneGrid('group-1', mockStadiumBounds, 2, 2);
      expect(zoneService.getZones('group-1').length).toBe(4);

      zoneService.clearZones('group-1');

      expect(zoneService.getZones('group-1')).toEqual([]);
    });
  });

  describe('getZone', () => {
    it('should return a specific zone by id', () => {
      zoneService.createZoneGrid('group-1', mockStadiumBounds, 2, 2);

      const zone = zoneService.getZone('group-1', 'zone-0-0');

      expect(zone).toBeDefined();
      expect(zone?.row).toBe(0);
      expect(zone?.col).toBe(0);
    });

    it('should return null for non-existent zone', () => {
      zoneService.createZoneGrid('group-1', mockStadiumBounds, 2, 2);

      const zone = zoneService.getZone('group-1', 'zone-99-99');

      expect(zone).toBeNull();
    });
  });

  describe('getZoneCenter', () => {
    it('should calculate the center of a zone', () => {
      const zones = zoneService.createZoneGrid('group-1', mockStadiumBounds, 2, 2);
      const zone = zones[0];

      const center = zoneService.getZoneCenter(zone);

      expect(center.latitude).toBeCloseTo((zone.bounds.minLat + zone.bounds.maxLat) / 2);
      expect(center.longitude).toBeCloseTo((zone.bounds.minLng + zone.bounds.maxLng) / 2);
    });
  });

  describe('getZoneDistance', () => {
    it('should calculate distance between adjacent zones', () => {
      const zones = zoneService.createZoneGrid('group-1', mockStadiumBounds, 2, 2);

      const zone00 = zones.find((z) => z.row === 0 && z.col === 0)!;
      const zone01 = zones.find((z) => z.row === 0 && z.col === 1)!;

      const distance = zoneService.getZoneDistance(zone00, zone01);

      expect(distance).toBeGreaterThan(0);
    });

    it('should return 0 for same zone', () => {
      const zones = zoneService.createZoneGrid('group-1', mockStadiumBounds, 2, 2);
      const zone = zones[0];

      const distance = zoneService.getZoneDistance(zone, zone);

      expect(distance).toBe(0);
    });
  });
});
