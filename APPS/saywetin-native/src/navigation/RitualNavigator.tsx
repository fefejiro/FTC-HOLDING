import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { fetchSyncedLyrics } from '../api/live-lyrics';
import { HomeScreen } from '../screens/HomeScreen';
import { ListenScreen } from '../screens/ListenScreen';
import { ResultScreen } from '../screens/ResultScreen';
import { LiveLyricsScreen } from '../screens/LiveLyricsScreen';
import { ShareModeScreen } from '../screens/ShareModeScreen';
import { VibeSearchScreen } from '../screens/VibeSearchScreen';
import type { RitualController, RitualScreen } from '../state/ritual-state';

// Matching is no longer a separate navigation route. It lives as an internal
// sub-state inside ListenScreen. The public ritual flow is: Listen -> Result.
export type RitualStackParamList = {
  Home: undefined;
  Listen: undefined;
  Result: undefined;
  LiveLyrics: undefined;
  ShareMode: undefined;
  VibeSearch: undefined;
};

type RitualNavigatorProps = {
  ritual: RitualController;
  onScreenChange: (screen: RitualScreen) => void;
};

type NavigatorStateEvent = {
  data: {
    state: {
      index: number;
      routes: Array<{ name: string }>;
    };
  };
};

const Stack = createNativeStackNavigator<RitualStackParamList>();

function mapRouteToScreen(routeName: keyof RitualStackParamList): RitualScreen {
  if (routeName === 'Home') return 'home';
  if (routeName === 'Listen') return 'listen';
  return 'result';
}

export function RitualNavigator({ ritual, onScreenChange }: RitualNavigatorProps) {
  return (
    <Stack.Navigator
      initialRouteName="Listen"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
        animation: 'slide_from_right',
        animationDuration: 280,
      }}
      screenListeners={{
        state: (event: NavigatorStateEvent) => {
          const routes = event.data.state.routes;
          const index = event.data.state.index;
          const currentRoute = routes[index];
          if (currentRoute) {
            onScreenChange(mapRouteToScreen(currentRoute.name as keyof RitualStackParamList));
          }
        },
      }}
    >
      <Stack.Screen
        name="Home"
        children={() => <HomeScreen ritual={ritual} />}
      />
      <Stack.Screen
        name="Listen"
        children={({ navigation }) => (
          <ListenScreen
            onRecognized={(track) => {
              ritual.setRecognizedTrack(track);
              ritual.revealResult();
              navigation.navigate('Result');
            }}
          />
        )}
      />
      {/* Result uses a fade reveal instead of a slide so the match lands as one
          confident moment rather than a panel sliding in from the side. */}
      <Stack.Screen
        name="Result"
        options={{ animation: 'fade', animationDuration: 320 }}
        children={({ navigation }) => (
          <ResultScreen
            track={ritual.track}
            onFollowLiveLyrics={async () => {
              navigation.navigate('LiveLyrics');

              // Warm the shared ritual state in the background without blocking navigation.
              if ((ritual.track.syncedLyrics?.length ?? 0) === 0) {
                const fetched = await fetchSyncedLyrics(ritual.track.id);
                if (fetched && fetched.lines.length > 0) {
                  ritual.setRecognizedTrack({
                    ...ritual.track,
                    syncedLyrics: fetched.lines,
                    lyricsAnchorOffsetMs: Math.max(0, fetched.songOffsetMs || ritual.track.lyricsAnchorOffsetMs || 0),
                    displaySongOffsetMs: Math.max(0, fetched.timing.displaySongOffsetMs ?? fetched.songOffsetMs ?? ritual.track.displaySongOffsetMs ?? 0),
                    matchedSongOffsetMs: Math.max(0, fetched.timing.matchedSongOffsetMs ?? ritual.track.matchedSongOffsetMs ?? 0),
                    listenStartedAtMs: fetched.timing.listenStartedAtMs ?? ritual.track.listenStartedAtMs,
                    listenEndedAtMs: fetched.timing.listenEndedAtMs ?? ritual.track.listenEndedAtMs,
                    audioSampleMidpointAtMs: fetched.timing.audioSampleMidpointAtMs ?? ritual.track.audioSampleMidpointAtMs,
                    recognitionEndedAtMs: fetched.timing.recognitionEndedAtMs ?? ritual.track.recognitionEndedAtMs,
                    resultShownAtMs: fetched.timing.resultShownAtMs ?? ritual.track.resultShownAtMs,
                  });
                }
              }
            }}
            onReset={() => {
              ritual.resetRecognitionSession();
              navigation.navigate('Listen');
            }}
          />
        )}
      />
      <Stack.Screen
        name="LiveLyrics"
        options={{
          animation: 'fade_from_bottom',
          animationDuration: 340,
          presentation: 'fullScreenModal',
        }}
        children={({ navigation }) => (
          <LiveLyricsScreen
            track={ritual.track}
            onBack={() => {
              navigation.goBack();
            }}
          />
        )}
      />
      <Stack.Screen
        name="ShareMode"
        options={{
          animation: 'slide_from_bottom',
          animationDuration: 260,
          presentation: 'modal',
        }}
        children={({ navigation }) => (
          <ShareModeScreen
            onClose={() => {
              navigation.goBack();
            }}
          />
        )}
      />
      <Stack.Screen
        name="VibeSearch"
        options={{
          animation: 'slide_from_bottom',
          animationDuration: 260,
          presentation: 'modal',
        }}
        children={({ navigation }) => (
          <VibeSearchScreen
            onClose={() => {
              navigation.goBack();
            }}
          />
        )}
      />
    </Stack.Navigator>
  );
}
