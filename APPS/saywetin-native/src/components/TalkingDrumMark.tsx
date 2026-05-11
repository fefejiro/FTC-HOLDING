import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

type TalkingDrumMarkProps = {
  size?: number;
  color?: string;
  accentColor?: string;
};

/**
 * Vector-like talking drum mark built from native shapes.
 * No raster background layer is used, so it stays clean over any orb treatment.
 */
export const TalkingDrumMark = memo(function TalkingDrumMark({
  size = 74,
  color = '#F6EFFD',
  accentColor = '#D6B77A',
}: TalkingDrumMarkProps) {
  const shellWidth = Math.round(size * 0.46);
  const shellHeight = Math.round(size * 0.62);
  const ropeWidth = Math.max(1, Math.round(size * 0.03));
  const ropeHeight = Math.round(size * 0.54);
  const capSize = Math.round(size * 0.3);

  return (
    <View style={[styles.root, { width: size, height: size }]}>
      <View
        style={[
          styles.shell,
          {
            width: shellWidth,
            height: shellHeight,
            borderColor: color,
            borderTopLeftRadius: Math.round(shellWidth * 0.6),
            borderTopRightRadius: Math.round(shellWidth * 0.6),
            borderBottomLeftRadius: Math.round(shellWidth * 0.42),
            borderBottomRightRadius: Math.round(shellWidth * 0.42),
          },
        ]}
      >
        <View style={[styles.centerBand, { backgroundColor: color }]} />
      </View>

      <View style={[styles.cap, { width: capSize, height: Math.round(capSize * 0.32), borderColor: accentColor }]} />
      <View
        style={[
          styles.cap,
          {
            width: capSize,
            height: Math.round(capSize * 0.32),
            borderColor: accentColor,
            top: size - Math.round(capSize * 0.56),
          },
        ]}
      />

      <View style={[styles.rope, { width: ropeWidth, height: ropeHeight, left: Math.round(size * 0.24), borderColor: accentColor }]} />
      <View style={[styles.rope, { width: ropeWidth, height: ropeHeight, right: Math.round(size * 0.24), borderColor: accentColor }]} />

      <View style={[styles.highlight, { width: Math.round(shellWidth * 0.34), height: Math.round(shellHeight * 0.18) }]} />
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    backgroundColor: 'transparent',
  },
  shell: {
    borderWidth: 2,
    backgroundColor: 'rgba(246,239,253,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBand: {
    width: '72%',
    height: 2,
    opacity: 0.75,
  },
  cap: {
    position: 'absolute',
    top: 0,
    borderWidth: 2,
    borderRadius: 999,
    backgroundColor: 'transparent',
  },
  rope: {
    position: 'absolute',
    top: '23%',
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: 'transparent',
    opacity: 0.85,
  },
  highlight: {
    position: 'absolute',
    top: '32%',
    left: '36%',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.32)',
    transform: [{ rotate: '-18deg' }],
  },
});
