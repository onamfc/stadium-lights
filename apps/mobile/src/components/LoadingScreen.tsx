import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Generate random positions for the lights
const generateLights = (count: number) => {
  const lights = [];
  for (let i = 0; i < count; i++) {
    lights.push({
      id: i,
      x: Math.random() * screenWidth,
      y: Math.random() * screenHeight,
      size: 4 + Math.random() * 8,
      delay: Math.random() * 2000,
      duration: 1500 + Math.random() * 2000,
    });
  }
  return lights;
};

const LIGHTS = generateLights(20);

interface AnimatedLightProps {
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
}

function AnimatedLight({ x, y, size, delay, duration }: AnimatedLightProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      Animated.sequence([
        Animated.delay(delay),
        Animated.loop(
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: 0.4 + Math.random() * 0.3,
              duration: duration,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0.05,
              duration: duration,
              useNativeDriver: true,
            }),
          ])
        ),
      ]).start();
    };

    animate();
  }, [opacity, delay, duration]);

  return (
    <Animated.View
      style={[
        styles.light,
        {
          left: x - size / 2,
          top: y - size / 2,
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity,
        },
      ]}
    />
  );
}

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  const textOpacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(textOpacity, {
          toValue: 0.5,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [textOpacity]);

  return (
    <View style={styles.container}>
      {LIGHTS.map((light) => (
        <AnimatedLight
          key={light.id}
          x={light.x}
          y={light.y}
          size={light.size}
          delay={light.delay}
          duration={light.duration}
        />
      ))}

      <View style={styles.content}>
        <Text style={styles.title}>Stadium Lights</Text>
        <Animated.Text style={[styles.message, { opacity: textOpacity }]}>
          {message}
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  light: {
    position: 'absolute',
    backgroundColor: '#4a90d9',
    shadowColor: '#4a90d9',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: '#888',
  },
});
