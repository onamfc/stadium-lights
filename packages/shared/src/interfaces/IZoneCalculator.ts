import { Coordinates, StadiumBounds, Zone } from '../types/models';

export interface IZoneCalculator {
  /**
   * Generates a grid of zones for the stadium
   * @param bounds - The four corners of the stadium
   * @param rows - Number of rows in the grid
   * @param cols - Number of columns in the grid
   */
  generateZones(bounds: StadiumBounds, rows: number, cols: number): Zone[];

  /**
   * Determines which zone a coordinate falls into
   * @param coords - GPS coordinates
   * @param zones - Array of zones to check against
   * @returns The zone ID or null if outside all zones
   */
  findZone(coords: Coordinates, zones: Zone[]): string | null;

  /**
   * Gets the center coordinates of a zone
   */
  getZoneCenter(zone: Zone): Coordinates;

  /**
   * Calculates distance between zone centers (for pattern calculations)
   */
  getZoneDistance(zone1: Zone, zone2: Zone): number;
}
