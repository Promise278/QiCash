import { MaterialIcons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

type Props = {
  size?: number;
  bordered?: boolean;
  variant?: 'warm' | 'soft';
};

export function Avatar({ size = 36, bordered = false, variant = 'warm' }: Props) {
  const bg = variant === 'warm' ? '#75472f' : '#d8d4ca';
  const fg = variant === 'warm' ? '#f1d2b1' : '#7c6a55';
  return (
    <View
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
        borderRadius: size / 2,
        borderWidth: bordered ? 2 : 0,
        borderColor: '#ffffff',
      }}
      className="items-center justify-center"
    >
      <MaterialIcons name="person" size={size * 0.55} color={fg} />
    </View>
  );
}

export function Sparkle({ size = 16, color = '#1f472e', style }: { size?: number; color?: string; style?: any }) {
  return (
    <Text style={[{ fontSize: size, color }, style]}>✦</Text>
  );
}
