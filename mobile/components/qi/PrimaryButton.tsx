import { Pressable, Text, View, ActivityIndicator, ViewStyle } from 'react-native';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'soft' | 'outline';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  iconLeft?: React.ReactNode;
};

export function PrimaryButton({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  style,
  iconLeft,
}: Props) {
  const isPrimary = variant === 'primary';
  const isSoft = variant === 'soft';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          opacity: pressed ? 0.92 : 1,
        },
        style,
      ]}
      className={`h-[46px] flex-row items-center justify-center rounded-pill px-6 ${
        isPrimary
          ? 'bg-qicash-green'
          : isSoft
            ? 'bg-qicash-pill'
            : 'border border-qicash-line bg-white'
      }`}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#fff' : '#1f472e'} />
      ) : (
        <View className="flex-row items-center gap-2">
          {iconLeft}
          <Text
            className={`text-[12px] font-semibold ${
              isPrimary ? 'text-white' : 'text-qicash-ink'
            }`}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
