import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ServiceProvider } from '../src/context/ServiceProvider';
import { FlashlightProvider } from '../src/components/FlashlightProvider';

export default function RootLayout() {
  return (
    <FlashlightProvider>
    <ServiceProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#1a1a2e',
          },
          headerTintColor: '#fff',
          headerTitle: '',
          contentStyle: {
            backgroundColor: '#1a1a2e',
          },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen
          name="controller"
          options={{
            gestureEnabled: false,
            headerBackVisible: false,
          }}
        />
        <Stack.Screen name="participant" />
        <Stack.Screen name="my-groups" />
      </Stack>
    </ServiceProvider>
    </FlashlightProvider>
  );
}
