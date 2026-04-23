import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useRitualState, type RitualScreen } from './src/state/ritual-state';
import { ritualTokens } from './src/theme/tokens';
import { ScreenIndicator } from './src/components/ScreenIndicator';
import { RitualNavigator } from './src/navigation/RitualNavigator';
import { useState } from 'react';

const { colors } = ritualTokens;

export default function App() {
  const ritual = useRitualState();
  const [activeScreen, setActiveScreen] = useState<RitualScreen>('home');

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.shell}>
        <Text style={styles.brand}>SayWetin Native</Text>
        <ScreenIndicator screen={activeScreen} />
        <NavigationContainer>
          <RitualNavigator ritual={ritual} onScreenChange={setActiveScreen} />
        </NavigationContainer>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  shell: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: colors.bg,
  },
  brand: {
    color: colors.violetSoft,
    fontSize: 14,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    marginBottom: 18,
  },
});
