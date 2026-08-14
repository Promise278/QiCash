import { MaterialIcons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

const qrPattern = [
  [1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0],
  [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0],
  [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0],
  [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0],
  [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0],
  [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0],
  [1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0],
  [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0],
  [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0],
  [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0],
  [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0],
  [1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
] as const;

export default function ExploreScreen() {
  return (
    <View className="flex-1 bg-[#f3efe7] px-5 py-4">
      <View className="mb-4 flex-row items-center justify-between">
        <MaterialIcons name="arrow-back" size={18} color="#1a1a1a" />
        <Text className="text-[17px] font-semibold text-[#1d312c]">Scan to Pay</Text>
        <MaterialIcons name="flash-on" size={18} color="#1a1a1a" />
      </View>

      <View className="flex-1 items-center justify-center rounded-[28px] bg-[#d9d0c7] p-6">
        <View className="relative h-[280px] w-[260px] items-center justify-center rounded-[18px] border-[4px] border-[#273b36] bg-[#d9d0c7]">
          {qrPattern.map((row, rowIndex) =>
            row.map((cell, colIndex) => (
              <View
                key={`${rowIndex}-${colIndex}`}
                className={cell ? 'bg-[#1b1b1b]' : 'bg-transparent'}
                style={{
                  position: 'absolute',
                  width: 10,
                  height: 10,
                  left: 10 + colIndex * 12,
                  top: 10 + rowIndex * 12,
                  borderRadius: 2,
                }}
              />
            ))
          )}

          <View className="absolute left-[18px] top-[18px] h-[54px] w-[54px] rounded-[12px] border-[5px] border-[#273b36]" />
          <View className="absolute bottom-[18px] left-[18px] h-[54px] w-[54px] rounded-[12px] border-[5px] border-[#273b36]" />
          <View className="absolute bottom-[18px] right-[18px] h-[54px] w-[54px] rounded-[12px] border-[5px] border-[#273b36]" />
        </View>
      </View>

      <Text className="mt-5 text-center text-[12px] text-[#4d5d58]">
        Point your camera at the vendor's QR code
      </Text>
    </View>
  );
}
