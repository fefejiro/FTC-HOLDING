
import { memo } from 'react';
import { View } from 'react-native';
import Svg, { Path, Ellipse, Line, Circle } from 'react-native-svg';

type TalkingDrumMarkProps = {
  size?: number;
};

/**
 * SayWetin Talking Drum Mark — clear hourglass drum, gold/ivory on purple, vector, no raster.
 */
export const TalkingDrumMark = memo(function TalkingDrumMark({ size = 110 }: TalkingDrumMarkProps) {
  // Colors: deep purple bg, gold outline, ivory drum, lavender highlight
  const gold = '#D9BE86';
  const ivory = '#F6EFFD';
  const lavender = '#BFA6F7';
  const dark = '#2B1747';
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 110 110" fill="none">
        {/* Strap */}
        <Path d="M20 20 Q55 0 90 20" stroke={lavender} strokeWidth={4} fill="none" />
        {/* Drum heads (top and bottom) */}
        <Circle cx="55" cy="32" r="18" fill={gold} stroke={dark} strokeWidth={2.5} />
        <Circle cx="55" cy="78" r="18" fill={gold} stroke={dark} strokeWidth={2.5} />
        {/* Hourglass drum body */}
        <Path d="M37 32 Q55 55 37 78" stroke={dark} strokeWidth={5} fill="none" />
        <Path d="M73 32 Q55 55 73 78" stroke={dark} strokeWidth={5} fill="none" />
        {/* Drum body fill */}
        <Path d="M37 32 Q55 55 37 78 Q55 70 73 78 Q55 55 73 32 Q55 40 37 32 Z" fill={ivory} opacity={0.92} />
        {/* Tension cords (side laces) */}
        <Line x1="41" y1="38" x2="69" y2="72" stroke={lavender} strokeWidth={2.2} />
        <Line x1="69" y1="38" x2="41" y2="72" stroke={lavender} strokeWidth={2.2} />
        <Line x1="55" y1="38" x2="55" y2="72" stroke={lavender} strokeWidth={1.7} />
        {/* Subtle highlight */}
        <Ellipse cx="55" cy="55" rx="10" ry="3" fill={lavender} fillOpacity={0.18} />
        {/* Glow (optional, subtle) */}
        <Ellipse cx="55" cy="55" rx="44" ry="44" fill={gold} fillOpacity={0.06} />
      </Svg>
    </View>
  );
});


