import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { ListenScreen } from '../screens/ListenScreen';
import { MatchingScreen } from '../screens/MatchingScreen';
import { ResultScreen } from '../screens/ResultScreen';
import type { RitualController, RitualScreen } from '../state/ritual-state';

export type RitualStackParamList = {
  Home: undefined;
  Listen: undefined;
  Matching: undefined;
  Result: undefined;
};

type RitualNavigatorProps = {
  ritual: RitualController;
  onScreenChange: (screen: RitualScreen) => void;
};

const Stack = createNativeStackNavigator<RitualStackParamList>();

function mapRouteToScreen(routeName: keyof RitualStackParamList): RitualScreen {
  if (routeName === 'Home') return 'home';
  if (routeName === 'Listen') return 'listen';
  if (routeName === 'Matching') return 'matching';
  return 'result';
}

export function RitualNavigator({ ritual, onScreenChange }: RitualNavigatorProps) {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
        animation: 'slide_from_right',
        animationDuration: 280,
      }}
      screenListeners={{
        state: (event) => {
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
        children={({ navigation }) => (
          <HomeScreen
            onNext={() => {
              ritual.startListening();
              navigation.navigate('Listen');
            }}
          />
        )}
      />
      <Stack.Screen
        name="Listen"
        children={({ navigation }) => (
          <ListenScreen
            onNext={() => {
              ritual.moveToMatching();
              navigation.navigate('Matching');
            }}
          />
        )}
      />
      <Stack.Screen
        name="Matching"
        children={({ navigation }) => (
          <MatchingScreen
            onNext={() => {
              ritual.revealResult();
              navigation.navigate('Result');
            }}
          />
        )}
      />
      <Stack.Screen
        name="Result"
        children={({ navigation }) => (
          <ResultScreen
            track={ritual.track}
            onReset={() => {
              ritual.reset();
              navigation.navigate('Home');
            }}
          />
        )}
      />
    </Stack.Navigator>
  );
}
