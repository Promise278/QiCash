import { Pressable, Text, View } from 'react-native';

export type TabItem<T extends string> = { key: T; label: string };

type Props<T extends string> = {
  tabs: TabItem<T>[];
  active: T;
  onChange: (key: T) => void;
  variant?: 'pill' | 'segmented';
};

export function SegmentedTabs<T extends string>({
  tabs,
  active,
  onChange,
  variant = 'segmented',
}: Props<T>) {
  if (variant === 'pill') {
    return (
      <View className="flex-row rounded-pill bg-qicash-pill p-1">
        {tabs.map((tab) => {
          const isActive = active === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => onChange(tab.key)}
              className={`flex-1 items-center rounded-pill py-1.5 ${
                isActive ? 'bg-qicash-green' : ''
              }`}
            >
              <Text
                className={`text-[10px] font-semibold ${
                  isActive ? 'text-white' : 'text-qicash-ink'
                }`}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }
  return (
    <View className="flex-row justify-between">
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            className={`rounded-pill px-4 py-1.5 ${
              isActive ? 'bg-qicash-green' : ''
            }`}
          >
            <Text
              className={`text-[10px] font-semibold ${
                isActive ? 'text-white' : 'text-[#383f39]'
              }`}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
