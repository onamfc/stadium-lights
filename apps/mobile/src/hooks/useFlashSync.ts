import { useEffect, useCallback, useState, useRef } from 'react';
import { PatternExecution } from '@stadium-lights/shared';
import { useSocket, usePatternExecutor, useTimeSync } from '../context/ServiceProvider';

interface UseFlashSyncOptions {
  zoneId: string | null;
  enabled?: boolean;
  initialPattern?: PatternExecution; // Pattern to start immediately (for joining mid-pattern)
}

interface UseFlashSyncResult {
  isExecuting: boolean;
  currentPattern: string | null;
}

export function useFlashSync({
  zoneId,
  enabled = true,
  initialPattern,
}: UseFlashSyncOptions): UseFlashSyncResult {
  const socket = useSocket();
  const patternExecutor = usePatternExecutor();
  const timeSync = useTimeSync();
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentPattern, setCurrentPattern] = useState<string | null>(null);
  const initialPatternStarted = useRef(false);

  const handlePatternStart = useCallback(
    (execution: PatternExecution) => {
      if (!enabled || !zoneId) {
        console.log('Flash sync disabled or no zone assigned');
        return;
      }

      console.log('Pattern start received:', execution.patternId, 'loop:', execution.loop);
      setCurrentPattern(execution.patternId);
      setIsExecuting(true);
      patternExecutor.execute(execution, zoneId);
    },
    [enabled, zoneId, patternExecutor]
  );

  const handlePatternStop = useCallback(() => {
    console.log('Pattern stop received');
    setCurrentPattern(null);
    setIsExecuting(false);
    patternExecutor.stop();
  }, [patternExecutor]);

  const handleTimeSync = useCallback(
    (payload: { serverTime: number }) => {
      timeSync.sync(payload.serverTime);
    },
    [timeSync]
  );

  // Set up socket listeners
  useEffect(() => {
    socket.onPatternStart(handlePatternStart);
    socket.onPatternStop(handlePatternStop);
    socket.onTimeSync(handleTimeSync);

    return () => {
      // Cleanup is handled by socket.removeAllListeners() on disconnect
    };
  }, [socket, handlePatternStart, handlePatternStop, handleTimeSync]);

  // Handle initial pattern (joining mid-pattern)
  useEffect(() => {
    if (
      initialPattern &&
      !initialPatternStarted.current &&
      enabled &&
      zoneId &&
      timeSync.isSynced()
    ) {
      console.log('Starting initial pattern (joining mid-pattern):', initialPattern.patternId);
      initialPatternStarted.current = true;
      handlePatternStart(initialPattern);
    }
  }, [initialPattern, enabled, zoneId, timeSync, handlePatternStart]);

  // If we have an initial pattern but time isn't synced yet, wait for sync
  useEffect(() => {
    if (initialPattern && !initialPatternStarted.current && enabled && zoneId) {
      // Time sync should happen automatically on connection
      // The pattern will start once time is synced (handled by the effect above)
      console.log('Waiting for time sync before starting initial pattern...');
    }
  }, [initialPattern, enabled, zoneId]);

  // Stop pattern execution when component unmounts
  useEffect(() => {
    return () => {
      if (patternExecutor.isExecuting()) {
        patternExecutor.stop();
      }
    };
  }, [patternExecutor]);

  return {
    isExecuting,
    currentPattern,
  };
}
