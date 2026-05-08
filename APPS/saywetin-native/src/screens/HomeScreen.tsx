import { ListenScreen } from './ListenScreen';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RitualStackParamList } from '../navigation/RitualNavigator';
import type { RitualController } from '../state/ritual-state';

type HomeScreenProps = {
  ritual: RitualController;
};

export function HomeScreen({ ritual }: HomeScreenProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RitualStackParamList>>();

  return (
    <ListenScreen
      onRecognized={(track) => {
        ritual.setRecognizedTrack(track);
        ritual.revealResult();
        navigation.navigate('Result');
      }}
    />
  );
}
