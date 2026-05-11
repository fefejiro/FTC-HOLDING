import { StyleSheet, View } from 'react-native';
import { DrumListenButton } from './DrumListenButton';

type ListenPhase = 'idle' | 'listening' | 'matching';

type OrbListenerProps = {
  phase: ListenPhase;
  onPress?: () => void;
};

export function OrbListener({ phase, onPress }: OrbListenerProps) {
  return (
    <View style={styles.wrap}>
      <DrumListenButton phase={phase} onPress={onPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
