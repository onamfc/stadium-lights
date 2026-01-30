import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Share,
  Modal,
  Dimensions,
  Alert,
  BackHandler,
} from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import QRCode from 'react-native-qrcode-svg';
import { useSocket } from '../src/context/ServiceProvider';
import { ConnectionStatusOverlay } from '../src/components/ConnectionStatusOverlay';
import { PATTERN_CATALOG, PatternType, PatternMode, RingDirection } from '@stadium-lights/shared';
import {
  ControllerOnboarding,
  shouldShowControllerOnboarding,
} from '../src/components/ControllerOnboarding';

const DEEP_LINK_BASE_URL = 'https://go.stadiumlights.io';
const { width: screenWidth } = Dimensions.get('window');

export default function ControllerScreen() {
  const { groupId, code, expiresAt: initialExpiresAt, activePatternId } = useLocalSearchParams<{
    groupId: string;
    code: string;
    expiresAt: string;
    activePatternId?: string;
  }>();
  const socket = useSocket();
  const navigation = useNavigation();
  const router = useRouter();

  const [participantCount, setParticipantCount] = useState(0);
  // Initialize with activePatternId from route params (when resuming a group with active pattern)
  const [activePattern, setActivePattern] = useState<string | null>(activePatternId || null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [expiresAt, setExpiresAt] = useState(initialExpiresAt);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showTestTools, setShowTestTools] = useState(false);
  const [mockCount, setMockCount] = useState(0);
  const [patternMode, setPatternMode] = useState<PatternMode>('grid');
  const [ringDirection, setRingDirection] = useState<RingDirection>('clockwise');
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1); // 0.5 = fast, 1 = normal, 2 = slow

  // Check if we should show onboarding
  useEffect(() => {
    shouldShowControllerOnboarding().then((shouldShow) => {
      setShowOnboarding(shouldShow);
    });
  }, []);

  // Show exit confirmation before leaving
  const showExitConfirmation = useCallback(() => {
    Alert.alert(
      'Leave Group?',
      'You are the controller of this group. If you leave, participants will still be able to see the patterns, but you won\'t be able to control them until you resume.',
      [
        { text: 'Stay', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () => {
            router.back();
          },
        },
      ]
    );
    return true;
  }, [router]);

  // Set up custom header back button
  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={showExitConfirmation} style={{ paddingHorizontal: 8 }}>
          <Text style={{ color: '#fff', fontSize: 16 }}>← Back</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, showExitConfirmation]);

  // Handle Android hardware back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', showExitConfirmation);
    return () => backHandler.remove();
  }, [showExitConfirmation]);

  // Handle reconnection - resume the group
  const handleReconnected = useCallback(async () => {
    const deviceId = await AsyncStorage.getItem('deviceId');
    if (deviceId && groupId) {
      console.log('Reconnected - resuming group:', groupId);
      socket.resumeGroup({
        deviceId,
        groupId,
      });
    }
  }, [groupId, socket]);

  // Update state when group is resumed after reconnection
  useEffect(() => {
    socket.onGroupResumed(({ participantCount: count, expiresAt: newExpiresAt, activePattern: pattern }) => {
      setParticipantCount(count);
      setExpiresAt(newExpiresAt);
      // Restore active pattern state so stop button appears
      if (pattern) {
        setActivePattern(pattern.patternId);
      }
    });
  }, [socket]);

  const deepLinkUrl = `${DEEP_LINK_BASE_URL}?code=${code}`;

  const formatExpiration = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `Expires in ${diffDays}d ${diffHours % 24}h`;
    } else if (diffHours > 0) {
      return `Expires in ${diffHours}h`;
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      if (diffMinutes > 0) {
        return `Expires in ${diffMinutes}m`;
      }
      return 'Expiring soon';
    }
  };

  useEffect(() => {
    socket.onParticipantCount(({ count }) => {
      setParticipantCount(count);
    });

    socket.onPatternStart((execution) => {
      setActivePattern(execution.patternId);
    });

    socket.onPatternStop(() => {
      setActivePattern(null);
    });

    socket.onMockParticipantsSpawned(({ count, totalParticipants }) => {
      setMockCount((prev) => prev + count);
      setParticipantCount(totalParticipants);
    });

    socket.onMockParticipantsCleared(({ clearedCount, totalParticipants }) => {
      setMockCount(0);
      setParticipantCount(totalParticipants);
    });
  }, [socket]);

  const getPatternConfig = useCallback((patternId: PatternType) => {
    const pattern = PATTERN_CATALOG.find((p) => p.id === patternId);
    const baseSpeed = pattern?.defaultConfig.speed;
    const adjustedSpeed = baseSpeed ? Math.round(baseSpeed * speedMultiplier) : undefined;

    return {
      mode: patternMode,
      ringDirection: ringDirection,
      speed: adjustedSpeed,
    };
  }, [patternMode, ringDirection, speedMultiplier]);

  const handleTriggerPattern = (patternId: PatternType) => {
    socket.triggerPattern({
      patternId,
      config: getPatternConfig(patternId),
    });
    setActivePattern(patternId);
  };

  // Update pattern in real-time when settings change
  useEffect(() => {
    if (activePattern) {
      socket.updatePattern({
        config: getPatternConfig(activePattern as PatternType),
      });
    }
  }, [patternMode, ringDirection, speedMultiplier, activePattern, getPatternConfig, socket]);

  const handleStopPattern = () => {
    socket.stopPattern();
    setActivePattern(null);
  };

  const handleShareCode = async () => {
    try {
      await Share.share({
        message: `Join my Stadium Lights group! Use code: ${code}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleSpawnMock = (count: number) => {
    socket.spawnMockParticipants(count);
  };

  const handleClearMock = () => {
    socket.clearMockParticipants();
  };

  return (
    <View style={styles.container}>
      <ConnectionStatusOverlay onReconnected={handleReconnected} />
      <View style={styles.header}>
        <View style={styles.codeContainer}>
          <Text style={styles.codeLabel}>Group Code</Text>
          <Text style={styles.code}>{code}</Text>
          {expiresAt && (
            <Text style={styles.expirationText}>{formatExpiration(expiresAt)}</Text>
          )}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.shareButton} onPress={handleShareCode}>
              <Text style={styles.shareButtonText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.qrButton} onPress={() => setShowQRModal(true)}>
              <Text style={styles.shareButtonText}>QR Code</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <Text style={styles.statsLabel}>Participants</Text>
          <Text style={styles.statsValue}>{participantCount}</Text>
        </View>
      </View>

      {/*
        * TEST TOOLS (Development Only)
        *
        * Mock Participants - What they DO:
        * - Simulate users joining the group with random GPS coordinates
        * - Increase the participant count display
        * - Populate zone distribution statistics
        * - Test the zone assignment algorithm
        *
        * What they DON'T do:
        * - Affect pattern animations (patterns use the zone grid, not participant locations)
        * - Change visualizer output (patterns look identical with 0 or 3000 participants)
        *
        * Future potential uses:
        * - Density-based patterns (e.g., only flash zones with 10+ participants)
        * - Load testing server performance with many concurrent connections
        * - Testing zone boundary edge cases
        */}
      {__DEV__ && (
        <>
          <TouchableOpacity
            style={styles.testToolsHeader}
            onPress={() => setShowTestTools(!showTestTools)}
          >
            <Text style={styles.testToolsTitle}>Test Tools</Text>
            <Text style={styles.testToolsToggle}>{showTestTools ? '[-]' : '[+]'}</Text>
          </TouchableOpacity>

          {showTestTools && (
            <View style={styles.testToolsContainer}>
              <Text style={styles.testToolsLabel}>
                Mock Participants: {mockCount}
              </Text>
              <View style={styles.testToolsButtons}>
                <TouchableOpacity
                  style={styles.mockButton}
                  onPress={() => handleSpawnMock(10)}
                >
                  <Text style={styles.mockButtonText}>+10</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.mockButton}
                  onPress={() => handleSpawnMock(50)}
                >
                  <Text style={styles.mockButtonText}>+50</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.mockButton}
                  onPress={() => handleSpawnMock(100)}
                >
                  <Text style={styles.mockButtonText}>+100</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.mockButton, styles.clearButton]}
                  onPress={handleClearMock}
                >
                  <Text style={styles.mockButtonText}>Clear</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.visualizerHint}>
                Open /visualizer in browser to see patterns animate
              </Text>
            </View>
          )}
        </>
      )}

      <View style={styles.modeContainer}>
        <Text style={styles.modeLabel}>Mode:</Text>
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeButton, patternMode === 'grid' && styles.modeButtonActive]}
            onPress={() => setPatternMode('grid')}
          >
            <Text style={[styles.modeButtonText, patternMode === 'grid' && styles.modeButtonTextActive]}>
              Grid
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, patternMode === 'ring' && styles.modeButtonActive]}
            onPress={() => setPatternMode('ring')}
          >
            <Text style={[styles.modeButtonText, patternMode === 'ring' && styles.modeButtonTextActive]}>
              Ring
            </Text>
          </TouchableOpacity>
        </View>

        {patternMode === 'ring' && (
          <View style={styles.directionToggle}>
            <TouchableOpacity
              style={[styles.directionButton, ringDirection === 'clockwise' && styles.directionButtonActive]}
              onPress={() => setRingDirection('clockwise')}
            >
              <Text style={[styles.directionButtonText, ringDirection === 'clockwise' && styles.directionButtonTextActive]}>
                Clockwise
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.directionButton, ringDirection === 'counterclockwise' && styles.directionButtonActive]}
              onPress={() => setRingDirection('counterclockwise')}
            >
              <Text style={[styles.directionButtonText, ringDirection === 'counterclockwise' && styles.directionButtonTextActive]}>
                Counter
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.modeContainer}>
        <Text style={styles.modeLabel}>Speed:</Text>
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeButton, speedMultiplier === 0.5 && styles.speedButtonFast]}
            onPress={() => setSpeedMultiplier(0.5)}
          >
            <Text style={[styles.modeButtonText, speedMultiplier === 0.5 && styles.modeButtonTextActive]}>
              Fast
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, speedMultiplier === 1 && styles.modeButtonActive]}
            onPress={() => setSpeedMultiplier(1)}
          >
            <Text style={[styles.modeButtonText, speedMultiplier === 1 && styles.modeButtonTextActive]}>
              Normal
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, speedMultiplier === 2 && styles.speedButtonSlow]}
            onPress={() => setSpeedMultiplier(2)}
          >
            <Text style={[styles.modeButtonText, speedMultiplier === 2 && styles.modeButtonTextActive]}>
              Slow
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Patterns</Text>

      <ScrollView style={styles.patternList} contentContainerStyle={styles.patternGrid}>
        {PATTERN_CATALOG.map((pattern) => (
          <TouchableOpacity
            key={pattern.id}
            style={[
              styles.patternCard,
              activePattern === pattern.id && styles.patternCardActive,
            ]}
            onPress={() => handleTriggerPattern(pattern.id)}
          >
            <Text style={styles.patternName}>{pattern.name}</Text>
            <Text style={styles.patternDescription}>{pattern.description}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {activePattern && (
        <View style={styles.stopContainer}>
          <TouchableOpacity style={styles.stopButton} onPress={handleStopPattern}>
            <Text style={styles.stopButtonText}>Stop Pattern</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal
        visible={showQRModal}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={styles.qrModalContainer}>
          <View style={styles.qrCodeWrapper}>
            <QRCode
              value={deepLinkUrl}
              size={screenWidth * 0.8}
              backgroundColor="#fff"
              color="#000"
            />
          </View>
          <Text style={styles.qrCodeText}>{code}</Text>
          <Text style={styles.qrInstructions}>Scan to join the group</Text>
          <TouchableOpacity
            style={styles.closeQRButton}
            onPress={() => setShowQRModal(false)}
          >
            <Text style={styles.closeQRButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <ControllerOnboarding
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
  },
  header: {
    flexDirection: 'row',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d44',
  },
  codeContainer: {
    flex: 1,
  },
  codeLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },
  code: {
    color: '#4a90d9',
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 4,
  },
  expirationText: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  shareButton: {
    backgroundColor: '#2d2d44',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  qrButton: {
    backgroundColor: '#4a90d9',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  statsContainer: {
    alignItems: 'flex-end',
  },
  statsLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },
  statsValue: {
    color: '#28a745',
    fontSize: 32,
    fontWeight: 'bold',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    padding: 20,
    paddingBottom: 12,
  },
  patternList: {
    flex: 1,
  },
  patternGrid: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  patternCard: {
    backgroundColor: '#2d2d44',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  patternCardActive: {
    backgroundColor: '#4a90d9',
  },
  patternName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  patternDescription: {
    color: '#aaa',
    fontSize: 14,
  },
  stopContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: '#1a1a2e',
    borderTopWidth: 1,
    borderTopColor: '#2d2d44',
  },
  stopButton: {
    backgroundColor: '#dc3545',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  qrModalContainer: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  qrCodeWrapper: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
  },
  qrCodeText: {
    color: '#4a90d9',
    fontSize: 48,
    fontWeight: 'bold',
    letterSpacing: 8,
    marginTop: 32,
  },
  qrInstructions: {
    color: '#888',
    fontSize: 18,
    marginTop: 12,
  },
  closeQRButton: {
    marginTop: 40,
    backgroundColor: '#2d2d44',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 8,
  },
  closeQRButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  testToolsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#2d2d44',
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 8,
  },
  testToolsTitle: {
    color: '#f0ad4e',
    fontSize: 14,
    fontWeight: '600',
  },
  testToolsToggle: {
    color: '#f0ad4e',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  testToolsContainer: {
    backgroundColor: '#252538',
    marginHorizontal: 20,
    padding: 16,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  testToolsLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 12,
  },
  testToolsButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  mockButton: {
    backgroundColor: '#3d5a80',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  clearButton: {
    backgroundColor: '#dc3545',
  },
  mockButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  visualizerHint: {
    color: '#666',
    fontSize: 11,
    marginTop: 12,
    fontStyle: 'italic',
  },
  modeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexWrap: 'wrap',
    gap: 12,
  },
  modeLabel: {
    color: '#888',
    fontSize: 14,
    marginRight: 8,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#2d2d44',
    borderRadius: 8,
    overflow: 'hidden',
  },
  modeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  modeButtonActive: {
    backgroundColor: '#4a90d9',
  },
  modeButtonText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  modeButtonTextActive: {
    color: '#fff',
  },
  directionToggle: {
    flexDirection: 'row',
    backgroundColor: '#2d2d44',
    borderRadius: 8,
    overflow: 'hidden',
  },
  directionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  directionButtonActive: {
    backgroundColor: '#28a745',
  },
  directionButtonText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
  },
  directionButtonTextActive: {
    color: '#fff',
  },
  speedButtonFast: {
    backgroundColor: '#e85d04',
  },
  speedButtonSlow: {
    backgroundColor: '#7209b7',
  },
});
