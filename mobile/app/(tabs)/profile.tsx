import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Avatar } from '../../components/qi/Avatar';
import { useAuth } from '../../context/MagicAuthProvider';
import { useWallet } from '../../context/WalletContext';
import { BLIP_URL, EXPLORER_URL } from '../../lib/wallet';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { shortAddress } = useWallet();
  const displayName = user?.email
    ? `${user.email.split('@')[0].replace(/^./, (l) => l.toUpperCase())} Obi`
    : 'Promise Obi';
  const address = shortAddress || '0x0000...0000';

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  return (
    <View className="flex-1 bg-qicash-bg">
      <StatusBar style="light" backgroundColor="#1f472e" />
      <View className="h-[138px] overflow-hidden bg-qicash-green px-5 pt-3">
        <View className="absolute -right-10 -bottom-24 h-[220px] w-[380px] rounded-full border border-[#4f715a] opacity-40" />
        <View className="absolute -right-10 -bottom-32 h-[240px] w-[430px] rounded-full border border-[#4f715a] opacity-40" />
        <MaterialIcons name="arrow-back-ios-new" size={19} color="#ffffff" />
        <View className="mt-5 flex-row items-center gap-3">
          <Avatar size={51} variant="warm" bordered />
          <View>
            <Text className="text-[15px] font-semibold text-white">
              {displayName}
            </Text>
            <Text className="mt-0.5 text-[10px] text-[#deeadf]">{address}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="-mt-3 min-h-full rounded-t-[22px] bg-[#fffdfa] px-5 pt-3 pb-24"
      >
        {/* Wallet Info */}
        <View className="mb-4 rounded-[12px] bg-qicash-tile p-4 mt-6">
          <Text className="mb-2 text-[11px] font-semibold text-qicash-ink">
            Wallet Address
          </Text>
          <View className="gap-1.5">
            <View className="flex-row items-center justify-between">
              <Text className="text-[9px] text-qicash-muted">QUAI</Text>
              <Text className="font-mono text-[10px] text-qicash-ink">{shortAddress}</Text>
            </View>
          </View>
          <View className="mt-2 flex-row items-center gap-1 rounded-pill bg-qicash-green/10 px-2 py-1">
            <MaterialIcons name="verified" size={12} color="#1f472e" />
            <Text className="text-[8px] text-qicash-green">
              BlipPay compatible — same Quai HD wallet format
            </Text>
          </View>
        </View>

        {/* BlipPay Integration Section */}
        <View className="mb-4 rounded-[12px] bg-qicash-tile p-4">
          <Text className="mb-2 text-[11px] font-semibold text-qicash-ink">
            BlipPay Integration
          </Text>
          <Text className="mb-3 text-[9px] leading-4 text-qicash-muted">
            QiCash uses the same Quai Network wallet format as BlipPay. Your wallet
            works across both apps. Use BlipPay to buy QUAI with a card, swap tokens,
            or spend QUAI anywhere Mastercard is accepted.
          </Text>

          <Pressable
            onPress={() => openLink(BLIP_URL)}
            className="mb-2 flex-row items-center gap-3 rounded-[10px] bg-white p-3 shadow-sm"
          >
            <View className="h-[36px] w-[36px] items-center justify-center rounded-[8px] bg-qicash-green">
              <MaterialIcons name="open-in-new" size={18} color="#fff" />
            </View>
            <View className="flex-1">
              <Text className="text-[11px] font-semibold text-qicash-ink">Open BlipPay</Text>
              <Text className="text-[9px] text-qicash-muted">
                Buy QUAI with card, swap, spend at merchants
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={18} color="#6b6e64" />
          </Pressable>
        </View>

        {/* Network Info */}
        <View className="mb-4 rounded-[12px] bg-qicash-tile p-4">
          <Text className="mb-2 text-[11px] font-semibold text-qicash-ink">
            Network
          </Text>
          <View className="gap-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-[9px] text-qicash-muted">Chain</Text>
              <View className="flex-row items-center gap-1">
                <View className="h-2 w-2 rounded-full bg-green-500" />
                <Text className="text-[10px] text-qicash-ink">Quai Mainnet</Text>
              </View>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-[9px] text-qicash-muted">Chain ID</Text>
              <Text className="text-[10px] text-qicash-ink">9</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-[9px] text-qicash-muted">Explorer</Text>
              <Pressable onPress={() => openLink(EXPLORER_URL)}>
                <Text className="text-[10px] text-qicash-green underline">
                  Quaiscan
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Standard menu items */}
        <View className="mb-4 rounded-[12px] bg-qicash-tile p-4">
          <Text className="mb-2 text-[11px] font-semibold text-qicash-ink">
            Account
          </Text>
          <View className="gap-0.5">
            {[
              { label: 'Personal Information', icon: 'person-outline' as const },
              { label: 'Security', icon: 'lock-outline' as const },
              { label: 'Connected Accounts', icon: 'link' as const },
              { label: 'Help & Support', icon: 'help-outline' as const },
              { label: 'About QiCash', icon: 'info-outline' as const },
            ].map((item) => (
              <Pressable
                key={item.label}
                className="flex-row items-center gap-3 rounded-[8px] px-2 py-2.5"
              >
                <MaterialIcons name={item.icon} size={18} color="#6b6e64" />
                <Text className="flex-1 text-[11px] text-qicash-ink">{item.label}</Text>
                <MaterialIcons name="chevron-right" size={16} color="#6b6e64" />
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable
          onPress={() => router.push("/login")}
          className="h-[46px] items-center justify-center rounded-pill bg-qicash-green"
        >
          <Text className="text-[12px] font-semibold text-white">Log Out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
