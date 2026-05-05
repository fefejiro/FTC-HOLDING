import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { useFonts } from 'expo-font';
import { PlayfairDisplay_400Regular_Italic } from '@expo-google-fonts/playfair-display';
import { NavigationContainer } from '@react-navigation/native';
import { useRitualState, type RitualScreen } from './src/state/ritual-state';
import { ritualTokens } from './src/theme/tokens';
import { RitualNavigator } from './src/navigation/RitualNavigator';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

const { colors } = ritualTokens;

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_400Regular_Italic,
  });
  const ritual = useRitualState();
  const [, setActiveScreen] = useState<RitualScreen>('home');

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.shell}>
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
    backgroundColor: colors.bg,
  },
});
