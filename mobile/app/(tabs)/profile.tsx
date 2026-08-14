import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, View } from 'react-native';

export default function ProfileScreen() {
  return (
    <View className="flex-1 bg-[#f3efe7] px-5 py-4">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-6">
        <View className="rounded-[24px] bg-[#234e45] p-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-[11px] uppercase tracking-[0.25em] text-[#dfeee6]">Profile</Text>
              <Text className="mt-3 text-[24px] font-semibold text-white">Promise Obi</Text>
              <Text className="mt-1 text-[11px] text-[#dfeee6]">0x7a3F...9c21</Text>
            </View>
            <View className="h-14 w-14 rounded-full bg-[#d0a77d]" />
          </View>
        </View>

        <View className="mt-5 rounded-[20px] bg-[#f7f3ee] p-3">
          {['Personal Information', 'Security', 'Connected Accounts', 'Help & Support', 'About QiPay'].map((label, idx) => (
            <View key={label} className="mt-2 flex-row items-center justify-between rounded-[14px] border border-[#e7dfd4] bg-[#fffaf4] px-3 py-3">
              <View className="flex-row items-center gap-2">
                <View className="h-8 w-8 items-center justify-center rounded-[9px] bg-[#e5d4ba]">
                  <MaterialIcons name={idx === 0 ? 'person' : idx === 1 ? 'lock' : idx === 2 ? 'link' : idx === 3 ? 'help-outline' : 'info'} size={16} color="#234d42" />
                </View>
                <Text className="text-[12px] font-semibold text-[#1d312c]">{label}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={18} color="#5d736d" />
            </View>
          ))}
        </View>

        <View className="mt-5 rounded-[18px] bg-[#f8f4ef] p-4">
          <Text className="text-[12px] font-semibold text-[#1d312c]">Need help?</Text>
          <Text className="mt-1 text-[10px] text-[#5d736d]">Reach support anytime if you have questions about your account or payments.</Text>
        </View>

        <View className="mt-6 rounded-[16px] bg-[#234e45] px-4 py-3">
          <Text className="text-center text-[12px] font-semibold text-white">Log Out</Text>
        </View>
      </ScrollView>
    </View>
  );
}