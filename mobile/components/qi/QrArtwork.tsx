import { Text, View } from 'react-native';

const qrPattern = [
  [1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,0],
  [1,0,0,0,0,0,1,0,1,0,0,0,0,0,1,0],
  [1,0,1,1,1,0,1,0,1,0,1,1,1,0,1,0],
  [1,0,1,1,1,0,1,0,1,0,1,1,1,0,1,0],
  [1,0,1,1,1,0,1,0,1,0,1,1,1,0,1,0],
  [1,0,0,0,0,0,1,0,1,0,0,0,0,0,1,0],
  [1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,0],
  [0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [1,0,0,0,0,0,1,0,1,0,0,0,0,0,1,0],
  [1,0,1,1,1,0,1,0,1,0,1,1,1,0,1,0],
  [1,0,1,1,1,0,1,0,1,0,1,1,1,0,1,0],
  [1,0,1,1,1,0,1,0,1,0,1,1,1,0,1,0],
  [1,0,0,0,0,0,1,0,1,0,0,0,0,0,1,0],
  [1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
] as const;

type Props = {
  size?: number;
  cell?: number;
  showBrackets?: boolean;
};

export function QrArtwork({ size = 160, cell = 9, showBrackets = true }: Props) {
  const offset = 4;
  return (
    <View
      style={{ width: size, height: size }}
      className="items-center justify-center"
    >
      {showBrackets && (
        <>
          <View className="absolute -left-1 -top-1 h-8 w-8 rounded-tl-[10px] border-l-[4px] border-t-[4px] border-[#e1e7d6]" />
          <View className="absolute -right-1 -top-1 h-8 w-8 rounded-tr-[10px] border-r-[4px] border-t-[4px] border-[#e1e7d6]" />
          <View className="absolute -bottom-1 -left-1 h-8 w-8 rounded-bl-[10px] border-b-[4px] border-l-[4px] border-[#e1e7d6]" />
          <View className="absolute -bottom-1 -right-1 h-8 w-8 rounded-br-[10px] border-b-[4px] border-r-[4px] border-[#e1e7d6]" />
        </>
      )}
      <View style={{ width: size - 8, height: size - 8 }} className="relative">
        {qrPattern.map((row, ri) =>
          row.map((cellValue, ci) => (
            <View
              key={`${ri}-${ci}`}
              className={cellValue ? 'bg-black' : 'bg-transparent'}
              style={{
                position: 'absolute',
                width: cell,
                height: cell,
                left: offset + ci * (cell + 0.6),
                top: offset + ri * (cell + 0.6),
                borderRadius: 1.4,
              }}
            />
          ))
        )}
        <View className="absolute left-1/2 top-1/2 h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-qicash-green">
          <Text className="text-[18px] font-bold text-white">Q</Text>
        </View>
      </View>
    </View>
  );
}
