import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet, AppState, AppStateStatus } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { setFlashlightImplementation } from '../services/FlashlightService';

interface FlashlightProviderProps {
  children: React.ReactNode;
}

export function FlashlightProvider({ children }: FlashlightProviderProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isOn, setIsOn] = useState(false);
  const [isCameraMounted, setIsCameraMounted] = useState(false);
  const appState = useRef(AppState.currentState);
  const isOnRef = useRef(isOn);

  // Keep ref in sync with state
  useEffect(() => {
    isOnRef.current = isOn;
  }, [isOn]);

  // Handle app state changes - unmount camera when app goes to background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/active/) && nextAppState.match(/inactive|background/)) {
        // App going to background - turn off torch and unmount camera
        setIsOn(false);
        setIsCameraMounted(false);
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const turnOn = useCallback(async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        console.warn('Camera permission not granted, cannot use flashlight');
        return;
      }
    }

    // Mount camera if not already mounted
    if (!isCameraMounted) {
      setIsCameraMounted(true);
      // Wait a bit for camera to initialize
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    setIsOn(true);
  }, [permission, isCameraMounted, requestPermission]);

  const turnOff = useCallback(async () => {
    setIsOn(false);
  }, []);

  const getIsOn = useCallback(() => {
    return isOnRef.current;
  }, []);

  // Register implementation with FlashlightService
  useEffect(() => {
    setFlashlightImplementation({
      turnOn,
      turnOff,
      isOn: getIsOn,
    });

    return () => {
      setFlashlightImplementation(null);
    };
  }, [turnOn, turnOff, getIsOn]);

  return (
    <>
      {children}
      {/* Hidden camera for torch control */}
      {isCameraMounted && permission?.granted && (
        <View style={styles.hiddenCamera} pointerEvents="none">
          <CameraView
            style={styles.camera}
            facing="back"
            enableTorch={isOn}
          />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  hiddenCamera: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    overflow: 'hidden',
    // Position off-screen
    top: -100,
    left: -100,
  },
  camera: {
    width: 1,
    height: 1,
  },
});
