import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

type Props = {
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  onPress?: () => void;
};

export function MenuRow({ label, icon, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className="h-[53px] flex-row items-center justify-between border-b border-qicash-line"
    >
      <View className="flex-row items-center gap-4">
        <MaterialIcons name={icon} size={18} color="#263a2b" />
        <Text className="text-[11px] font-medium text-qicash-inkSoft">{label}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={19} color="#596159" />
    </Pressable>
  );
}
