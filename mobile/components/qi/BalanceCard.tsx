import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

type Props = {
  balance: string;
  fiat: string;
  label?: string;
  hidden?: boolean;
  onToggleHidden?: () => void;
};

export function BalanceCard({ balance, fiat, label = 'Total Balance', hidden = false, onToggleHidden }: Props) {
  return (
    <View className="relative h-48 overflow-hidden rounded-[15px] bg-qicash-green p-6 pt-10">
      <View className="absolute -right-6 -bottom-20 h-[190px] w-[260px] rounded-full border border-[#63816d] opacity-30" />
      <View className="absolute right-0 -bottom-24 h-[205px] w-[300px] rounded-full border border-[#63816d] opacity-30" />
      <View className="flex-row items-center justify-between">
        <Text className="text-2xl text-[#e9ece1]">{label}</Text>
        {onToggleHidden && (
          <Pressable hitSlop={8} onPress={onToggleHidden}>
            <MaterialIcons
              name={hidden ? 'visibility-off' : 'visibility'}
              size={18}
              color="#e8f0e9"
            />
          </Pressable>
        )}
      </View>
      <Text className="mt-1 text-5xl font-bold tracking-[-.5px] text-white">
        {hidden ? '••••••' : balance}
      </Text>
      <Text className="mt-0.5 text-lg text-[#e9ece1]">
        {hidden ? '' : fiat}
      </Text>
    </View>
  );
}
