import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { TutorsScreen } from '../screens/TutorsScreen';
import { BookingsScreen } from '../screens/BookingsScreen';
import { LessonRoomScreen } from '../screens/LessonRoomScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { SubscriptionScreen } from '../screens/SubscriptionScreen';

export type RootStackParamList = {
  Home: undefined;
  Tutors: undefined;
  Bookings: undefined;
  LessonRoom: { roomName: string; token?: string };
  Profile: undefined;
  Subscription: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Tutors" component={TutorsScreen} options={{ title: 'Find a Tutor' }} />
        <Stack.Screen name="Bookings" component={BookingsScreen} options={{ title: 'My Bookings' }} />
        <Stack.Screen name="LessonRoom" component={LessonRoomScreen} options={{ title: 'Lesson Room' }} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'My Profile' }} />
        <Stack.Screen name="Subscription" component={SubscriptionScreen} options={{ title: 'Subscription' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}