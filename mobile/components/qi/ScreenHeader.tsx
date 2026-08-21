import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

type Props = {
  title: string;
  rightIcon?: keyof typeof MaterialIcons.glyphMap;
  rightColor?: string;
  onRightPress?: () => void;
  showBack?: boolean;
};

export function ScreenHeader({
  title,
  rightIcon,
  rightColor = '#1f472e',
  onRightPress,
  showBack = true,
}: Props) {
  const router = useRouter();
  return (
    <View className="flex-row items-center justify-between px-5 py-2">
      {showBack ? (
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center"
          hitSlop={8}
        >
          <MaterialIcons name="arrow-back-ios-new" size={19} color="#1c2920" />
        </Pressable>
      ) : (
        <View className="h-10 w-10" />
      )}
      <Text className="text-[14px] font-semibold text-qicash-ink">{title}</Text>
      {rightIcon ? (
        <Pressable
          onPress={onRightPress}
          className="h-10 w-10 items-center justify-center"
          hitSlop={8}
        >
          <MaterialIcons name={rightIcon} size={20} color={rightColor} />
        </Pressable>
      ) : (
        <View className="h-10 w-10" />
      )}
    </View>
  );
}
