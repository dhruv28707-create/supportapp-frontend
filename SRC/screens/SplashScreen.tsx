import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';

// Guard against missing logo asset — require.resolve would throw at bundle time.
// We use a try/catch so the splash falls back to a text logo instead of crashing.
let logoSource: { uri: string } | Exclude<ReturnType<typeof require>, null> | null = null;

try {
  logoSource = require('../../assets/bootsplash/logo.png');
} catch {
  // Fallback: render a text logo instead.
  logoSource = { uri: '' };
}

const { width, height } = Dimensions.get('window');

type AshParticle = {
  size: number;
  startX: number;
  endX: number;
  startY: number;
  endY: number;
  delay: number;
  duration: number;
  opacity: Animated.Value;
  progress: Animated.Value;
};

const buildAshParticles = (): AshParticle[] =>
  Array.from({ length: 34 }, (_, index) => {
    const column = index % 10;
    const row = Math.floor(index / 10);
    const startX = column * (width / 9) + (index % 2 === 0 ? -8 : 8);

    return {
      size: 3 + (index % 4),
      startX,
      endX: startX + (index % 3 - 1) * 28,
      startY: -40 - row * 28,
      endY: height * 0.42 + (index % 5) * 18,
      delay: index * 34,
      duration: 1450 + (index % 6) * 130,
      opacity: new Animated.Value(0),
      progress: new Animated.Value(0),
    };
  });

interface Props {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: Props) {
  const ashParticles = useRef(buildAshParticles()).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.82)).current;
  const logoTranslateY = useRef(new Animated.Value(16)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const hasLogo = logoSource !== null && logoSource !== undefined;
    const splashDuration = hasLogo ? 3400 : 1800;
    const ashFall = ashParticles.map(particle =>
      Animated.parallel([
        Animated.sequence([
          Animated.delay(particle.delay),
          Animated.timing(particle.opacity, {
            toValue: 0.78,
            duration: 180,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(particle.opacity, {
            toValue: 0,
            duration: particle.duration - 180,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(particle.progress, {
          toValue: 1,
          delay: particle.delay,
          duration: particle.duration,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    Animated.parallel([
      Animated.stagger(16, ashFall),
      Animated.sequence([
        Animated.delay(hasLogo ? 720 : 400),
        Animated.parallel([
          Animated.timing(logoOpacity, {
            toValue: 1,
            duration: 760,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(logoTranslateY, {
            toValue: 0,
            duration: 760,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(logoScale, {
              toValue: 1.18,
              duration: 420,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(logoScale, {
              toValue: 1,
              duration: 360,
              easing: Easing.inOut(Easing.cubic),
              useNativeDriver: true,
            }),
          ]),
        ]),
        Animated.delay(hasLogo ? 780 : 400),
        Animated.timing(screenOpacity, {
          toValue: 0,
          duration: 520,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start(({ finished }) => {
      if (finished) {
        onFinish();
      }
    });

    // Safety net: if the animation somehow doesn't finish (e.g. native driver
    // issue on a specific device), still advance after a hard timeout.
    const safetyTimer = setTimeout(() => onFinish(), splashDuration + 500);
    return () => clearTimeout(safetyTimer);
  }, [
    ashParticles,
    logoOpacity,
    logoScale,
    logoTranslateY,
    onFinish,
    screenOpacity,
  ]);

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      {ashParticles.map((particle, index) => {
        const translateX = particle.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [particle.startX, particle.endX],
        });
        const translateY = particle.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [particle.startY, particle.endY],
        });
        const scale = particle.progress.interpolate({
          inputRange: [0, 0.35, 1],
          outputRange: [0.7, 1, 0.55],
        });

        return (
          <Animated.View
            key={`${particle.startX}-${index}`}
            style={[
              styles.ashParticle,
              {
                width: particle.size,
                height: particle.size,
                borderRadius: particle.size / 2,
                opacity: particle.opacity,
                transform: [{ translateX }, { translateY }, { scale }],
              },
            ]}
          />
        );
      })}

      <Animated.View
        style={[
          styles.logoWrap,
          {
            opacity: logoOpacity,
            transform: [{ translateY: logoTranslateY }, { scale: logoScale }],
          },
        ]}>
        logoSource ? (
          <Image
            source={logoSource}
            style={styles.logo}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.fallbackLogo}>
            <Text style={styles.fallbackLogoText}>SafeSpace</Text>
            <Text style={styles.fallbackTagline}>You are not alone</Text>
          </View>
        )
      </Animated.View>
    </Animated.View>
  );
}

  const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ashParticle: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#F5D9B8',
  },
  logoWrap: {
    width: width * 0.72,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  fallbackLogo: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackLogoText: {
    fontSize: 38,
    fontWeight: '800',
    color: '#F5D9B8',
    letterSpacing: 1,
  },
  fallbackTagline: {
    fontSize: 14,
    color: '#C8702A',
    marginTop: 6,
    letterSpacing: 0.3,
  },
});
