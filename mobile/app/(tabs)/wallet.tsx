import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, View } from 'react-native';

export default function WalletScreen() {
  return (
    <View className="flex-1 bg-[#f3efe7] px-5 py-4">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-6">
        <View className="rounded-[24px] bg-[#234e45] p-4">
          <Text className="text-[11px] uppercase tracking-[0.25em] text-[#dfeee6]">My Wallet</Text>
          <Text className="mt-4 text-[32px] font-bold text-white">128.45 QI</Text>
          <Text className="mt-1 text-[13px] text-[#dfeee6]">≈ $28.63</Text>
          <View className="mt-5 rounded-[18px] bg-[#f7efe7] p-3">
            <Text className="text-[11px] font-medium text-[#3a3a3a]">Wallet Address</Text>
            <Text className="mt-1 text-[12px] text-[#5e665d]">0x7a3F...9c21</Text>
          </View>
        </View>

        <View className="mt-5 rounded-[20px] bg-[#f7f3ee] p-3">
          <Text className="text-[13px] font-semibold text-[#1d312c]">Manage funds</Text>
          <View className="mt-3 gap-3">
            {['Top Up', 'Withdraw'].map((label, idx) => (
              <View key={label} className="flex-row items-center justify-between rounded-[16px] border border-[#e7dfd4] bg-[#fffaf4] px-3 py-3">
                <View className="flex-row items-center gap-2">
                  <View className="h-9 w-9 items-center justify-center rounded-[10px] bg-[#e6d5be]">
                    <MaterialIcons name={idx === 0 ? 'add' : 'arrow-downward'} size={18} color="#234d42" />
                  </View>
                  <Text className="text-[12px] font-semibold text-[#1d312c]">{label}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={18} color="#5d736d" />
              </View>
            ))}
          </View>
        </View>

        <View className="mt-5 rounded-[20px] bg-[#f7f3ee] p-3">
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-[13px] font-semibold text-[#1d312c]">History</Text>
            <Text className="text-[11px] text-[#5d736d]">All</Text>
          </View>
          {[
            ['Food Court', '-12.50 QI', 'Today · 10:21 AM'],
            ['Bookshop', '-8.20 QI', 'Today · 9:02 AM'],
            ['Water Vendor', '-1.30 QI', 'Yesterday · 4:45 PM'],
            ['Received from John', '+20.00 QI', 'Yesterday · 11:11 AM'],
          ].map(([title, amount, time]) => (
            <View key={title} className="mt-2 flex-row items-center justify-between rounded-[14px] border border-[#e7dfd4] bg-[#fffaf4] px-3 py-2.5">
              <View>
                <Text className="text-[12px] font-semibold text-[#1d312c]">{title}</Text>
                <Text className="text-[10px] text-[#60736d]">{time}</Text>
              </View>
              <Text className="text-[12px] font-semibold text-[#234d42]">{amount}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
