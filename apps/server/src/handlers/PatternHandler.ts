import { PatternType, TriggerPatternPayload, UpdatePatternPayload } from '@stadium-lights/shared';
import { IGroupService } from '../interfaces/IGroupService';
import { IPatternService } from '../interfaces/IPatternService';
import { IZoneService } from '../interfaces/IZoneService';
import { ISocketHandler, TypedSocket } from './HandlerRegistry';
import { getSocketData } from './GroupHandler';
import { ActivePatternStore } from '../services/ActivePatternStore';

export class PatternHandler implements ISocketHandler {
  constructor(
    private readonly groupService: IGroupService,
    private readonly patternService: IPatternService,
    private readonly zoneService: IZoneService
  ) {}

  attachToSocket(socket: TypedSocket): void {
    socket.on('trigger_pattern', async (payload: TriggerPatternPayload) => {
      await this.handleTriggerPattern(socket, payload);
    });

    socket.on('update_pattern', async (payload: UpdatePatternPayload) => {
      await this.handleUpdatePattern(socket, payload);
    });

    socket.on('stop_pattern', async () => {
      await this.handleStopPattern(socket);
    });
  }

  private async handleTriggerPattern(
    socket: TypedSocket,
    payload: TriggerPatternPayload
  ): Promise<void> {
    const data = getSocketData(socket.id);

    if (!data?.groupId || !data?.deviceId) {
      socket.emit('error', {
        message: 'Not in a group',
        code: 'NOT_IN_GROUP',
      });
      return;
    }

    // Verify controller permission
    const isController = await this.groupService.isController(
      data.groupId,
      data.deviceId
    );

    if (!isController) {
      socket.emit('error', {
        message: 'Only the controller can trigger patterns',
        code: 'NOT_CONTROLLER',
      });
      return;
    }

    try {
      const zones = this.zoneService.getZones(data.groupId);

      if (zones.length === 0) {
        socket.emit('error', {
          message: 'No zones configured for this group',
          code: 'NO_ZONES',
        });
        return;
      }

      // Validate pattern
      if (!this.patternService.validateConfig(payload.patternId as PatternType, payload.config || {})) {
        socket.emit('error', {
          message: 'Invalid pattern configuration',
          code: 'INVALID_CONFIG',
        });
        return;
      }

      const execution = this.patternService.generateExecution(
        payload.patternId as PatternType,
        zones,
        payload.config
      );

      // Add loop flag for continuous playback
      const continuousExecution = {
        ...execution,
        loop: true,
      };

      // Store as active pattern for this group (for new joiners)
      ActivePatternStore.setActivePattern(data.groupId, continuousExecution);

      // Update group activity timestamp (resets expiration timer)
      await this.groupService.touchGroup(data.groupId);

      // Broadcast to all participants in the group (including controller)
      socket.to(data.groupId).emit('pattern_start', continuousExecution);
      socket.emit('pattern_start', continuousExecution);

      console.log(`Pattern ${payload.patternId} triggered for group ${data.groupId} (continuous)`);
    } catch (error) {
      console.error('Error triggering pattern:', error);
      socket.emit('error', {
        message: 'Failed to trigger pattern',
        code: 'TRIGGER_PATTERN_FAILED',
      });
    }
  }

  private async handleUpdatePattern(
    socket: TypedSocket,
    payload: UpdatePatternPayload
  ): Promise<void> {
    const data = getSocketData(socket.id);

    if (!data?.groupId || !data?.deviceId) {
      socket.emit('error', {
        message: 'Not in a group',
        code: 'NOT_IN_GROUP',
      });
      return;
    }

    // Verify controller permission
    const isController = await this.groupService.isController(
      data.groupId,
      data.deviceId
    );

    if (!isController) {
      socket.emit('error', {
        message: 'Only the controller can update patterns',
        code: 'NOT_CONTROLLER',
      });
      return;
    }

    // Get currently active pattern
    const activePattern = ActivePatternStore.getActivePattern(data.groupId);

    if (!activePattern) {
      // No active pattern to update
      return;
    }

    try {
      const zones = this.zoneService.getZones(data.groupId);

      if (zones.length === 0) {
        return;
      }

      // Calculate current progress through the pattern (0-1)
      const now = Date.now();
      const elapsed = now - activePattern.startTime;
      const oldProgress = (elapsed % activePattern.duration) / activePattern.duration;

      // Regenerate with updated config
      const execution = this.patternService.generateExecution(
        activePattern.patternId as PatternType,
        zones,
        payload.config
      );

      // Adjust startTime to maintain the same relative position
      // If we were 50% through the old pattern, we should be 50% through the new one
      const newElapsed = oldProgress * execution.duration;
      const adjustedStartTime = now - newElapsed;

      const continuousExecution = {
        ...execution,
        startTime: adjustedStartTime,
        loop: true,
      };

      // Store updated pattern
      ActivePatternStore.setActivePattern(data.groupId, continuousExecution);

      // Broadcast to all participants
      socket.to(data.groupId).emit('pattern_start', continuousExecution);
      socket.emit('pattern_start', continuousExecution);

      console.log(`Pattern updated for group ${data.groupId} (maintaining ${Math.round(oldProgress * 100)}% progress)`);
    } catch (error) {
      console.error('Error updating pattern:', error);
    }
  }

  private async handleStopPattern(socket: TypedSocket): Promise<void> {
    const data = getSocketData(socket.id);

    if (!data?.groupId || !data?.deviceId) {
      socket.emit('error', {
        message: 'Not in a group',
        code: 'NOT_IN_GROUP',
      });
      return;
    }

    // Verify controller permission
    const isController = await this.groupService.isController(
      data.groupId,
      data.deviceId
    );

    if (!isController) {
      socket.emit('error', {
        message: 'Only the controller can stop patterns',
        code: 'NOT_CONTROLLER',
      });
      return;
    }

    // Clear active pattern for this group
    ActivePatternStore.clearActivePattern(data.groupId);

    // Broadcast stop to all participants in the group
    socket.to(data.groupId).emit('pattern_stop', {});
    socket.emit('pattern_stop', {});

    console.log(`Pattern stopped for group ${data.groupId}`);
  }
}

// Export function to get active pattern for a group (used by GroupHandler)
export function getActivePatternForGroup(groupId: string) {
  return ActivePatternStore.getActivePattern(groupId);
}
