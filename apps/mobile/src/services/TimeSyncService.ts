export class TimeSyncService {
  private serverTimeOffset = 0;
  private syncedAt: number | null = null;

  /**
   * Syncs local time with server time
   * @param serverTime - Unix timestamp from server
   */
  sync(serverTime: number): void {
    const localTime = Date.now();
    this.serverTimeOffset = serverTime - localTime;
    this.syncedAt = localTime;
    console.log(`Time synced. Offset: ${this.serverTimeOffset}ms`);
  }

  /**
   * Gets the current server time based on local time + offset
   */
  getServerTime(): number {
    return Date.now() + this.serverTimeOffset;
  }

  /**
   * Converts a server timestamp to local time
   */
  toLocalTime(serverTime: number): number {
    return serverTime - this.serverTimeOffset;
  }

  /**
   * Gets the time offset between local and server
   */
  getOffset(): number {
    return this.serverTimeOffset;
  }

  /**
   * Checks if time has been synced
   */
  isSynced(): boolean {
    return this.syncedAt !== null;
  }

  /**
   * Schedules a callback to run at a specific server time
   */
  scheduleAt(serverTime: number, callback: () => void): NodeJS.Timeout | null {
    const localExecutionTime = this.toLocalTime(serverTime);
    const delay = localExecutionTime - Date.now();

    if (delay <= 0) {
      // Already past, execute immediately
      callback();
      return null;
    }

    return setTimeout(callback, delay);
  }
}
