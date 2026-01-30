import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSocket } from '../src/context/ServiceProvider';
import { GroupSummary } from '@stadium-lights/shared';

const MAX_GROUPS = 3;

export default function MyGroupsScreen() {
  const router = useRouter();
  const socket = useSocket();

  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  // Get device ID
  useEffect(() => {
    AsyncStorage.getItem('deviceId').then((id) => {
      setDeviceId(id);
    });
  }, []);

  // Request groups when device ID is available
  useEffect(() => {
    if (!deviceId || !socket.isConnected()) return;

    socket.getMyGroups({ deviceId });
  }, [deviceId, socket]);

  // Listen for groups response
  useEffect(() => {
    socket.onMyGroups(({ groups: receivedGroups }) => {
      setGroups(receivedGroups);
      setIsLoading(false);
    });

    socket.onGroupResumed(({ groupId, code, participantCount, expiresAt, activePattern }) => {
      router.replace({
        pathname: '/controller',
        params: {
          groupId,
          code,
          expiresAt,
          activePatternId: activePattern?.patternId || '',
        },
      });
    });

    socket.onGroupReleased(({ groupId }) => {
      // Remove the released group from the list
      setGroups((prev) => prev.filter((g) => g.groupId !== groupId));
    });

    socket.onError(() => {
      setIsLoading(false);
    });
  }, [socket, router]);

  const handleResumeGroup = (group: GroupSummary) => {
    if (!deviceId) return;
    socket.resumeGroup({ deviceId, groupId: group.groupId });
  };

  const handleReleaseGroup = (group: GroupSummary) => {
    if (!deviceId) return;

    Alert.alert(
      'Release Group',
      `Are you sure you want to release "${group.code}"? This will end the session for all participants and free up the code.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Release',
          style: 'destructive',
          onPress: () => {
            socket.releaseGroup({ deviceId, groupId: group.groupId });
          },
        },
      ]
    );
  };

  const formatExpiration = (expiresAt: string) => {
    const date = new Date(expiresAt);
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
      return `Expires in ${diffMinutes}m`;
    }
  };

  const renderGroup = ({ item }: { item: GroupSummary }) => (
    <View style={styles.groupCard}>
      <TouchableOpacity
        style={styles.groupContent}
        onPress={() => handleResumeGroup(item)}
      >
        <View style={styles.groupHeader}>
          <Text style={styles.groupCode}>{item.code}</Text>
          <Text style={styles.participantCount}>{item.participantCount} participants</Text>
        </View>
        <Text style={styles.expirationText}>{formatExpiration(item.expiresAt)}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.releaseButton}
        onPress={() => handleReleaseGroup(item)}
      >
        <Text style={styles.releaseButtonText}>Release</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4a90d9" />
        <Text style={styles.loadingText}>Loading your groups...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Groups</Text>
      <Text style={styles.subtitle}>
        {groups.length} of {MAX_GROUPS} groups used
      </Text>

      {groups.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No active groups</Text>
          <Text style={styles.emptySubtext}>
            Groups you create will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          renderItem={renderGroup}
          keyExtractor={(item) => item.groupId}
          contentContainerStyle={styles.listContent}
        />
      )}

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 24,
  },
  loadingText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#888',
    fontSize: 18,
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
  },
  listContent: {
    paddingBottom: 80,
  },
  groupCard: {
    backgroundColor: '#2d2d44',
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  groupContent: {
    flex: 1,
    padding: 16,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  groupCode: {
    color: '#4a90d9',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  participantCount: {
    color: '#28a745',
    fontSize: 14,
  },
  expirationText: {
    color: '#888',
    fontSize: 12,
  },
  releaseButton: {
    backgroundColor: '#dc3545',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  releaseButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  backButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#2d2d44',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
