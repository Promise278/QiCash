import { MaterialIcons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

type Props = {
  title: string;
  subtitle: string;
  amount: string;
  type: 'sent' | 'received';
  icon?: keyof typeof MaterialIcons.glyphMap;
};

export function TransactionRow({ title, subtitle, amount, type, icon }: Props) {
  const iconName =
    icon ?? (type === 'received' ? 'arrow-downward' : 'storefront');
  return (
    <View className="mb-2.5 flex-row items-center justify-between py-1">
      <View className="flex-row items-center gap-2.5">
        <View className="h-8 w-8 items-center justify-center rounded-[7px] bg-[#eef1e8]">
          <MaterialIcons name={iconName} size={15} color="#1f472e" />
        </View>
        <View>
          <Text className="text-[11px] font-semibold text-qicash-ink">{title}</Text>
          <Text className="mt-0.5 text-[8px] text-[#72776e]">{subtitle}</Text>
        </View>
      </View>
      <Text
        className={`text-[10px] font-semibold ${
          type === 'received' ? 'text-qicash-success' : 'text-qicash-ink'
        }`}
      >
        {amount}
      </Text>
    </View>
  );
}
