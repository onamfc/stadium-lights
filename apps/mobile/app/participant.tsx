import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useKeepAwake } from 'expo-keep-awake';
import { useSocket, useLocation } from '../src/context/ServiceProvider';
import { useFlashSync } from '../src/hooks/useFlashSync';
import { ConnectionStatusOverlay } from '../src/components/ConnectionStatusOverlay';
import {
  ParticipantOnboarding,
  shouldShowParticipantOnboarding,
} from '../src/components/ParticipantOnboarding';
import { PatternExecution } from '@stadium-lights/shared';

const { width } = Dimensions.get('window');

export default function ParticipantScreen() {
  // Keep the screen awake while participating in the light show
  useKeepAwake();

  const { groupId, zoneId: initialZoneId, participantCount: initialCount, activePattern: activePatternParam } = useLocalSearchParams<{
    groupId: string;
    zoneId: string;
    participantCount?: string;
    activePattern?: string;
  }>();
  const socket = useSocket();
  const location = useLocation();
  const [groupCode, setGroupCode] = useState<string | null>(null);

  const [zoneId, setZoneId] = useState<string | null>(initialZoneId || null);
  const [participantCount, setParticipantCount] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Check if we should show onboarding
  useEffect(() => {
    shouldShowParticipantOnboarding().then((shouldShow) => {
      setShowOnboarding(shouldShow);
    });
  }, []);

  // Parse active pattern from params if present
  const initialActivePattern = useMemo(() => {
    if (activePatternParam) {
      try {
        return JSON.parse(activePatternParam) as PatternExecution;
      } catch {
        return undefined;
      }
    }
    return undefined;
  }, [activePatternParam]);

  const { isExecuting, currentPattern } = useFlashSync({
    zoneId,
    enabled: true,
    initialPattern: initialActivePattern,
  });

  // Store the group code for reconnection
  useEffect(() => {
    const loadGroupCode = async () => {
      const storedCode = await AsyncStorage.getItem(`group_code_${groupId}`);
      if (storedCode) {
        setGroupCode(storedCode);
      }
    };
    loadGroupCode();
  }, [groupId]);

  // Handle reconnection - re-join the group
  const handleReconnected = useCallback(async () => {
    if (groupCode) {
      const deviceId = await AsyncStorage.getItem('deviceId');
      if (deviceId) {
        console.log('Reconnected - re-joining group:', groupCode);
        socket.joinGroup({
          code: groupCode,
          deviceId,
          displayName: 'Participant',
        });
      }
    }
  }, [groupCode, socket]);

  // Watch location updates
  useEffect(() => {
    const stopWatching = location.watchPosition((coords) => {
      socket.updateLocation({
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
    });

    return () => {
      stopWatching();
    };
  }, [location, socket]);

  // Listen for zone updates
  useEffect(() => {
    socket.onZoneUpdated(({ zoneId: newZoneId }) => {
      setZoneId(newZoneId);
    });

    socket.onParticipantCount(({ count }) => {
      setParticipantCount(count);
    });
  }, [socket]);

  return (
    <View style={styles.container}>
      <ConnectionStatusOverlay onReconnected={handleReconnected} />
      <View style={styles.statusContainer}>
        <View style={[styles.statusDot, socket.isConnected() && styles.statusDotConnected]} />
        <Text style={styles.statusText}>
          {socket.isConnected() ? 'Connected' : 'Disconnected'}
        </Text>
      </View>

      <View style={styles.mainContent}>
        <View
          style={[
            styles.flashIndicator,
            isExecuting && styles.flashIndicatorActive,
          ]}
        >
          <Text style={styles.flashIcon}>{isExecuting ? '💡' : '🔦'}</Text>
        </View>

        {currentPattern && (
          <Text style={styles.patternText}>
            Pattern: {currentPattern}
          </Text>
        )}

        {!isExecuting && (
          <Text style={styles.waitingText}>
            Waiting for patterns...
          </Text>
        )}
      </View>

      <View style={styles.infoContainer}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Zone</Text>
          <Text style={styles.infoValue}>{zoneId || 'Unknown'}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Participants</Text>
          <Text style={styles.infoValue}>{participantCount}</Text>
        </View>
      </View>

      <Text style={styles.instructions}>
        Keep your phone's flashlight facing up and visible
      </Text>

      <ParticipantOnboarding
        visible={showOnboarding}
        onComplete={() => setShowOnboarding(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    padding: 20,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#dc3545',
    marginRight: 8,
  },
  statusDotConnected: {
    backgroundColor: '#28a745',
  },
  statusText: {
    color: '#888',
    fontSize: 14,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flashIndicator: {
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    backgroundColor: '#2d2d44',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  flashIndicatorActive: {
    backgroundColor: '#ffd700',
    shadowColor: '#ffd700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 10,
  },
  flashIcon: {
    fontSize: 80,
  },
  patternText: {
    color: '#4a90d9',
    fontSize: 18,
    fontWeight: '600',
  },
  waitingText: {
    color: '#666',
    fontSize: 16,
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#2d2d44',
  },
  infoItem: {
    alignItems: 'center',
  },
  infoLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },
  infoValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  instructions: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    paddingBottom: 20,
  },
});
