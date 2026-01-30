import React, { createContext, useContext, useMemo, useEffect, ReactNode } from 'react';
import { FlashlightService } from '../services/FlashlightService';
import { LocationService } from '../services/LocationService';
import { SocketService } from '../services/SocketService';
import { TimeSyncService } from '../services/TimeSyncService';
import { BrightnessService } from '../services/BrightnessService';
import { PatternExecutor } from '../patterns/PatternExecutor';
import { IFlashlightController } from '../interfaces/IFlashlightController';
import { ILocationProvider } from '../interfaces/ILocationProvider';
import { ISocketClient } from '../interfaces/ISocketClient';
import { IPatternExecutor } from '@stadium-lights/shared';

interface Services {
  flashlight: IFlashlightController;
  location: ILocationProvider;
  socket: ISocketClient;
  timeSync: TimeSyncService;
  brightness: BrightnessService;
  patternExecutor: IPatternExecutor;
}

const ServiceContext = createContext<Services | null>(null);

interface ServiceProviderProps {
  children: ReactNode;
}

export function ServiceProvider({ children }: ServiceProviderProps) {
  const services = useMemo(() => {
    const flashlight = new FlashlightService();
    const location = new LocationService();
    const socket = new SocketService();
    const timeSync = new TimeSyncService();
    const brightness = new BrightnessService();
    const patternExecutor = new PatternExecutor(flashlight, timeSync, brightness);

    return {
      flashlight,
      location,
      socket,
      timeSync,
      brightness,
      patternExecutor,
    };
  }, []);

  // Initialize brightness service (requires permission)
  useEffect(() => {
    services.brightness.initialize().catch(console.error);
  }, [services.brightness]);

  return (
    <ServiceContext.Provider value={services}>{children}</ServiceContext.Provider>
  );
}

export function useServices(): Services {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error('useServices must be used within a ServiceProvider');
  }
  return context;
}

// Convenience hooks for individual services
export function useFlashlight(): IFlashlightController {
  return useServices().flashlight;
}

export function useLocation(): ILocationProvider {
  return useServices().location;
}

export function useSocket(): ISocketClient {
  return useServices().socket;
}

export function useTimeSync(): TimeSyncService {
  return useServices().timeSync;
}

export function usePatternExecutor(): IPatternExecutor {
  return useServices().patternExecutor;
}
