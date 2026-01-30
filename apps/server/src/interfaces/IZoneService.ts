import { Coordinates, StadiumBounds, Zone } from '@stadium-lights/shared';

export interface IZoneService {
  /**
   * Creates a zone grid for a group
   */
  createZoneGrid(
    groupId: string,
    bounds: StadiumBounds,
    rows: number,
    cols: number
  ): Zone[];

  /**
   * Gets the zones for a group
   */
  getZones(groupId: string): Zone[];

  /**
   * Finds which zone a coordinate belongs to
   */
  findZoneForCoordinates(groupId: string, coordinates: Coordinates): string | null;

  /**
   * Clears zones for a group
   */
  clearZones(groupId: string): void;

  /**
   * Gets zone by ID
   */
  getZone(groupId: string, zoneId: string): Zone | null;
}
