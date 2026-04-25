import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useFonts, PlayfairDisplay_400Regular_Italic } from '@expo-google-fonts/playfair-display';
import { NavigationContainer } from '@react-navigation/native';
import { useRitualState, type RitualScreen } from './src/state/ritual-state';
import { ritualTokens } from './src/theme/tokens';
import { ScreenIndicator } from './src/components/ScreenIndicator';
import { RitualNavigator } from './src/navigation/RitualNavigator';
import { useState } from 'react';

const { colors } = ritualTokens;

export default function App() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular_Italic,
  });
  const ritual = useRitualState();
  const [activeScreen, setActiveScreen] = useState<RitualScreen>('home');

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.shell}>
        <View style={styles.wordmarkRow}>
          <Text style={styles.wordmarkSerif}>S</Text>
          <Text style={styles.wordmarkSans}>ay·</Text>
          <Text style={styles.wordmarkSerif}>W</Text>
          <Text style={styles.wordmarkSans}>etin</Text>
        </View>
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
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 18,
  },
  wordmarkSerif: {
    color: colors.text,
    fontSize: 30,
    lineHeight: 32,
    fontFamily: 'PlayfairDisplay_400Regular_Italic',
  },
  wordmarkSans: {
    color: colors.violetSoft,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '600',
  },
});
