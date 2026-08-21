import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sparkle } from '../components/qi/Avatar';
import { useWallet } from '../context/WalletContext';
import { getShortAddress, EXPLORER_URL } from '../lib/wallet';
import * as Linking from 'expo-linking';

export default function PaymentSuccessScreen() {
  const params = useLocalSearchParams<{
    hash?: string;
    amount?: string;
    recipient?: string;
    note?: string;
  }>();
  const router = useRouter();
  const { quaiPrice } = useWallet();

  const txHash = params.hash || '';
  const amount = params.amount || '0';
  const recipient = params.recipient || '';
  const note = params.note || '';
  const shortHash = txHash ? `${txHash.slice(0, 10)}...${txHash.slice(-6)}` : '';
  const shortRecipient = getShortAddress(recipient);
  const fiatValue =
    quaiPrice > 0 ? `$${(parseFloat(amount) * quaiPrice).toFixed(2)}` : '';

  return (
    <SafeAreaView className="flex-1 bg-qicash-bg">
      <StatusBar style="dark" backgroundColor="#fbf9f5" />
      <View className="flex-1 px-5 pt-6">
        <View className="flex-1 px-1">
          <View className="items-center pt-8">
            <View className="relative h-[90px] w-[140px] items-center justify-center">
              <Sparkle
                size={18}
                color="#668063"
                style={{ position: 'absolute', left: 6, top: 14 }}
              />
              <Sparkle
                size={22}
                color="#1f472e"
                style={{ position: 'absolute', right: 6, top: 4 }}
              />
              <Sparkle
                size={15}
                color="#668063"
                style={{ position: 'absolute', right: 16, bottom: 0 }}
              />
              <View className="h-[63px] w-[63px] items-center justify-center rounded-full bg-qicash-green shadow-sm">
                <MaterialIcons name="check" size={39} color="#ffffff" />
              </View>
            </View>
          </View>

          <Text className="mt-4 text-center text-[18px] font-bold text-qicash-ink">
            Payment Sent
          </Text>
          <Text className="mt-2 text-center text-[11px] leading-5 text-[#4b544b]">
            Your transaction has been submitted{'\n'}to the Quai network.
          </Text>

          <View className="mt-6 rounded-[12px] bg-[#fffdfa] p-4 shadow-sm">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2.5">
                <View className="h-7 w-7 items-center justify-center rounded-[6px] bg-[#eef1e8]">
                  <MaterialIcons name="send" size={14} color="#1f472e" />
                </View>
                <View>
                  <Text className="text-[11px] font-semibold text-qicash-ink">
                    Sent to {shortRecipient}
                  </Text>
                  {note ? (
                    <Text className="mt-0.5 text-[8px] text-[#757a72]">{note}</Text>
                  ) : null}
                </View>
              </View>
              <Text className="text-[11px] font-semibold text-qicash-ink">
                -{amount} QUAI
              </Text>
            </View>
            {fiatValue ? (
              <Text className="mt-1 text-right text-[9px] text-[#757a72]">
                ~{fiatValue}
              </Text>
            ) : null}
            {txHash ? (
              <Pressable
                onPress={() =>
                  Linking.openURL(`${EXPLORER_URL}/tx/${txHash}`).catch(() => {})
                }
                className="mt-4 border-t border-[#f0ede7] pt-3"
              >
                <Text className="text-center text-[9px] text-[#6d726a]">
                  TxID: {shortHash}
                </Text>
                <Text className="mt-1 text-center text-[8px] text-qicash-green">
                  View on Quaiscan
                </Text>
              </Pressable>
            ) : null}
          </View>

          <View className="mt-auto pb-3">
            <Pressable
              onPress={() => router.replace('/(tabs)')}
              className="h-[46px] items-center justify-center rounded-pill bg-qicash-green"
            >
              <Text className="text-[12px] font-semibold text-white">Done</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                router.replace('/(tabs)');
                router.push('/history');
              }}
              className="mt-2 h-[35px] items-center justify-center"
            >
              <Text className="text-[10px] font-semibold text-qicash-ink">
                View History
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
