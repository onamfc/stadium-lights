import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { useSocket, useLocation } from '../src/context/ServiceProvider';
import { LoadingScreen } from '../src/components/LoadingScreen';

// Generate a UUID using expo-crypto
async function generateDeviceId(): Promise<string> {
  return await Crypto.randomUUID();
}
import { StadiumBounds, validateCode } from '@stadium-lights/shared';

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL || 'http://localhost:3000';

export default function HomeScreen() {
  const router = useRouter();
  const socket = useSocket();
  const location = useLocation();

  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [groupCode, setGroupCode] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);

  // Initialize device ID
  useEffect(() => {
    const initDeviceId = async () => {
      try {
        console.log('Initializing device ID...');
        let id = await AsyncStorage.getItem('deviceId');
        console.log('AsyncStorage returned:', id);
        if (!id) {
          id = await generateDeviceId();
          console.log('Generated new device ID:', id);
          await AsyncStorage.setItem('deviceId', id);
        }
        console.log('Device ID initialized:', id);
        setDeviceId(id);
      } catch (error) {
        console.error('Failed to initialize device ID:', error);
        // Fallback: generate an ID without persisting
        const fallbackId = `device-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        console.log('Using fallback device ID:', fallbackId);
        setDeviceId(fallbackId);
      }
    };
    initDeviceId();
  }, []);

  // Handle deep links
  const handleDeepLink = useCallback((url: string) => {
    console.log('Received deep link:', url);
    try {
      const parsed = Linking.parse(url);
      const code = parsed.queryParams?.code;
      if (code && typeof code === 'string') {
        console.log('Pre-filling group code from deep link:', code);
        setGroupCode(code.toUpperCase());
      }
    } catch (error) {
      console.error('Error parsing deep link:', error);
    }
  }, []);

  useEffect(() => {
    // Check if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // Listen for deep links while app is open
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, [handleDeepLink]);

  // Connect to server (only if not already connected)
  useEffect(() => {
    const connect = async () => {
      if (socket.isConnected()) {
        setIsConnecting(false);
        return;
      }
      try {
        await socket.connect(SERVER_URL);
        setIsConnecting(false);
      } catch (error) {
        console.error('Failed to connect:', error);
        Alert.alert('Connection Error', 'Failed to connect to server');
        setIsConnecting(false);
      }
    };
    connect();
    // Don't disconnect on unmount - socket is shared across screens
  }, [socket]);

  // Set up socket listeners
  useEffect(() => {
    socket.onGroupCreated(({ groupId, code, expiresAt }) => {
      setIsLoading(false);
      router.push({
        pathname: '/controller',
        params: { groupId, code, expiresAt },
      });
    });

    socket.onGroupJoined(async ({ groupId, zoneId, participantCount, activePattern }) => {
      setIsLoading(false);
      // Store the code for reconnection purposes
      if (groupCode) {
        await AsyncStorage.setItem(`group_code_${groupId}`, groupCode);
      }
      router.push({
        pathname: '/participant',
        params: {
          groupId,
          zoneId: zoneId || '',
          participantCount: String(participantCount),
          activePattern: activePattern ? JSON.stringify(activePattern) : '',
        },
      });
    });

    socket.onError(({ message }) => {
      setIsLoading(false);
      Alert.alert('Error', message);
    });
  }, [socket, router]);

  const handleCreateGroup = async () => {
    // Validate custom code if provided
    if (customCode.trim()) {
      const validation = validateCode(customCode);
      if (!validation.valid) {
        Alert.alert('Invalid Code', validation.error);
        return;
      }
    }

    setIsLoading(true);
    console.log('Creating group...');

    try {
      // Request location permissions
      console.log('Requesting location permissions...');
      const hasPermission = await location.requestPermissions();
      console.log('Location permission:', hasPermission);
      if (!hasPermission) {
        Alert.alert('Error', 'Location permission is required');
        setIsLoading(false);
        return;
      }

      // Get current position for stadium bounds
      console.log('Getting current position...');
      const coords = await location.getCurrentPosition();
      console.log('Got coords:', coords);

      // Create a default stadium bounds (500m x 300m area centered on current location)
      const latOffset = 0.0025; // ~250m
      const lngOffset = 0.0015; // ~150m

      const stadiumBounds: StadiumBounds = {
        topLeft: {
          latitude: coords.latitude + latOffset,
          longitude: coords.longitude - lngOffset,
        },
        topRight: {
          latitude: coords.latitude + latOffset,
          longitude: coords.longitude + lngOffset,
        },
        bottomLeft: {
          latitude: coords.latitude - latOffset,
          longitude: coords.longitude - lngOffset,
        },
        bottomRight: {
          latitude: coords.latitude - latOffset,
          longitude: coords.longitude + lngOffset,
        },
      };

      console.log('Sending create_group event...');
      console.log('Socket connected:', socket.isConnected());
      console.log('Device ID:', deviceId);
      socket.createGroup({
        deviceId: deviceId!,
        displayName: 'Controller',
        stadiumBounds,
        gridSize: { rows: 10, cols: 10 },
        customCode: customCode.trim() || undefined,
      });
      console.log('create_group event sent');
    } catch (error) {
      console.error('Error creating group:', error);
      Alert.alert('Error', 'Failed to create group');
      setIsLoading(false);
    }
  };

  const handleJoinGroup = async () => {
    // Validate code
    const validation = validateCode(groupCode);
    if (!validation.valid) {
      Alert.alert('Invalid Code', validation.error);
      return;
    }

    setIsLoading(true);

    socket.joinGroup({
      code: validation.sanitized!,
      deviceId: deviceId!,
      displayName: 'Participant',
    });
  };

  if (isConnecting || deviceId === null) {
    return (
      <LoadingScreen
        message={deviceId === null ? 'Initializing...' : 'Connecting to server...'}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Stadium Lights</Text>
      <Text style={styles.subtitle}>Sync your light with the crowd</Text>

      <TouchableOpacity
        style={styles.myGroupsLink}
        onPress={() => router.push('/my-groups')}
      >
        <Text style={styles.myGroupsLinkText}>My Groups</Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Create a Group</Text>
        <TextInput
          style={styles.input}
          placeholder="Custom code (optional, e.g. COLDPLAY2024)"
          placeholderTextColor="#666"
          value={customCode}
          onChangeText={(text) => setCustomCode(text.toUpperCase())}
          autoCapitalize="characters"
        />
        <TouchableOpacity
          style={[styles.button, styles.createButton]}
          onPress={handleCreateGroup}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Create Group</Text>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.orText}>OR</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Join a Group</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter group code"
          placeholderTextColor="#666"
          value={groupCode}
          onChangeText={(text) => setGroupCode(text.toUpperCase())}
          autoCapitalize="characters"
        />
        <TouchableOpacity
          style={[styles.button, styles.joinButton]}
          onPress={handleJoinGroup}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Join Group</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginBottom: 40,
  },
  input: {
    backgroundColor: '#2d2d44',
    borderRadius: 8,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    marginBottom: 12,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#4a90d9',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  createButton: {
    backgroundColor: '#4a90d9',
  },
  joinButton: {
    backgroundColor: '#28a745',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  orText: {
    color: '#666',
    textAlign: 'center',
    marginVertical: 16,
    fontSize: 14,
  },
  myGroupsLink: {
    alignSelf: 'center',
    marginBottom: 24,
  },
  myGroupsLinkText: {
    color: '#4a90d9',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
