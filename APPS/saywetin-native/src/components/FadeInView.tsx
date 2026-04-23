import { useEffect, useRef } from 'react';
import { Animated, type ViewStyle } from 'react-native';

type FadeInViewProps = {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  style?: ViewStyle;
};

export function FadeInView({ children, duration = 320, delay = 60, style }: FadeInViewProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration,
      delay,
      useNativeDriver: true,
    }).start();
  }, [opacity, duration, delay]);

  return (
    <Animated.View style={[{ flex: 1, opacity }, style]}>
      {children}
    </Animated.View>
  );
}
