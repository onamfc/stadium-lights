import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { useSocket } from '../context/ServiceProvider';

interface ConnectionStatusOverlayProps {
  onReconnected?: () => void;
}

export function ConnectionStatusOverlay({ onReconnected }: ConnectionStatusOverlayProps) {
  const socket = useSocket();
  const [isDisconnected, setIsDisconnected] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    const checkConnection = () => {
      setIsDisconnected(!socket.isConnected());
    };

    // Check initial state
    checkConnection();

    socket.onDisconnect(() => {
      setIsDisconnected(true);
      setReconnectAttempt(0);
    });

    socket.onReconnectAttempt(({ attemptNumber }) => {
      setReconnectAttempt(attemptNumber);
    });

    socket.onConnect(() => {
      setIsDisconnected(false);
      setReconnectAttempt(0);
      onReconnected?.();
    });

    socket.onReconnect(() => {
      setIsDisconnected(false);
      setReconnectAttempt(0);
      onReconnected?.();
    });
  }, [socket, onReconnected]);

  // Pulse animation for the reconnecting indicator
  useEffect(() => {
    if (isDisconnected) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.5,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [isDisconnected, pulseAnim]);

  if (!isDisconnected) {
    return null;
  }

  return (
    <View style={styles.overlay}>
      <View style={styles.content}>
        <Animated.View style={[styles.iconContainer, { opacity: pulseAnim }]}>
          <Text style={styles.icon}>📡</Text>
        </Animated.View>
        <Text style={styles.title}>Connection Lost</Text>
        <Text style={styles.subtitle}>
          {reconnectAttempt > 0
            ? `Reconnecting... (attempt ${reconnectAttempt})`
            : 'Attempting to reconnect...'}
        </Text>
        <Text style={styles.hint}>
          Make sure you have an internet connection
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 26, 46, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  content: {
    alignItems: 'center',
    padding: 32,
  },
  iconContainer: {
    marginBottom: 16,
  },
  icon: {
    fontSize: 64,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    color: '#888',
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  hint: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
});
