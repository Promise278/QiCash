import { MaterialIcons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import './global.css';

export default function ModalScreen() {
  return (
    <View className="flex-1 bg-[#f4ede4] px-5 py-8">
      <View className="rounded-[36px] bg-white p-6 shadow-lg shadow-[#b29076]/15">
        <View className="items-center justify-center rounded-full bg-[#7c553a]/10 p-4">
          <MaterialIcons name="check-circle" size={54} color="#7c553a" />
        </View>
        <Text className="mt-6 text-center text-3xl font-semibold text-[#241914]">
          Payment Successful
        </Text>
        <Text className="mt-3 text-center text-sm leading-6 text-[#7b6a60]">
          Your payment was sent successfully.
        </Text>

        <View className="mt-6 rounded-3xl bg-[#fff6ed] p-5">
          <Text className="text-base font-semibold text-[#241914]">Food Court</Text>
          <Text className="mt-1 text-sm text-[#7b6a60]">Today, 10:21 AM</Text>
          <Text className="mt-3 text-xl font-semibold text-[#7c553a]">-12.50 QI</Text>
          <Text className="mt-3 text-sm text-[#7b6a60]">TxId: 7f3a...9c21</Text>
        </View>

        <Pressable className="mt-6 rounded-3xl bg-[#7c553a] px-4 py-4">
          <Link href="/" asChild>
            <Text className="text-center text-sm font-semibold text-white">Done</Text>
          </Link>
        </Pressable>

        <Link href="/wallet" asChild>
          <Pressable className="mt-3 rounded-3xl border border-[#d9c8b5] bg-white px-4 py-4">
            <Text className="text-center text-sm font-semibold text-[#7c553a]">View Receipt</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}
