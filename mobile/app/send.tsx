import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWallet } from '../context/WalletContext';
import { isQuaiAddress } from '../lib/wallet';

function FieldCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mt-3 rounded-[10px] bg-[#fffdfa] px-3 pb-2 pt-3 shadow-sm">
      <Text className="mb-2 text-[9px] text-[#5c655d]">{label}</Text>
      {children}
    </View>
  );
}

export default function SendScreen() {
  const params = useLocalSearchParams<{
    recipient?: string;
    amount?: string;
  }>();
  const [amount, setAmount] = useState(params.amount || '');
  const [recipient, setRecipient] = useState(params.recipient || '');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const { wallet, sendPayment, quaiBalance } = useWallet();
  const router = useRouter();

  const isValidRecipient = recipient ? isQuaiAddress(recipient) : false;
  const parsedAmount = amount ? parseFloat(amount) : 0;
  const isValidAmount = parsedAmount > 0;
  const hasEnoughBalance = parsedAmount <= parseFloat(quaiBalance);
  const canSend = isValidRecipient && isValidAmount && hasEnoughBalance && !loading;

  const handleSend = async () => {
    if (!canSend || !wallet) return;
    setLoading(true);
    try {
      const result = await sendPayment(recipient, parsedAmount);
      router.push({
        pathname: '/modal',
        params: {
          hash: result.hash,
          amount: parsedAmount.toString(),
          recipient,
          note,
        },
      });
    } catch (err: any) {
      Alert.alert(
        'Transaction Failed',
        err?.message || 'Could not send transaction. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-qicash-bg">
      <StatusBar style="dark" backgroundColor="#fbf9f5" />
      <View className="flex-1 px-5">
        <View className="flex-row items-center justify-between py-2">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center"
            hitSlop={8}
          >
            <MaterialIcons name="arrow-back-ios-new" size={19} color="#1c2920" />
          </Pressable>
          <Text className="text-[14px] font-semibold text-qicash-ink">
            Send QUAI
          </Text>
          <View className="h-10 w-10" />
        </View>

        {!isValidRecipient && recipient.length > 0 && (
          <View className="mt-2 rounded-[8px] bg-red-50 px-3 py-2">
            <Text className="text-[10px] text-red-600">
              Invalid address. Must be a valid Quai address (0x + 40 hex chars).
            </Text>
          </View>
        )}

        {isValidAmount && !hasEnoughBalance && (
          <View className="mt-2 rounded-[8px] bg-red-50 px-3 py-2">
            <Text className="text-[10px] text-red-600">
              Insufficient balance. You have {quaiBalance} QUAI.
            </Text>
          </View>
        )}

        <FieldCard label="Enter amount">
          <View className="flex-row items-center rounded-[8px] bg-[#f7f5ef] px-3">
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor="#9a9c92"
              keyboardType="decimal-pad"
              className="h-[47px] flex-1 text-[20px] font-bold text-qicash-ink"
            />
            <View className="rounded-pill bg-qicash-green px-3 py-1.5">
              <Text className="text-[10px] font-bold text-white">QUAI</Text>
            </View>
          </View>
        </FieldCard>

        <FieldCard label="Recipient (Quai / BlipPay address)">
          <View className="flex-row items-center rounded-[8px] bg-[#f7f5ef] px-3">
            <TextInput
              value={recipient}
              onChangeText={setRecipient}
              placeholder="0x7a3F...9c21"
              placeholderTextColor="#9a9c92"
              autoCapitalize="none"
              autoCorrect={false}
              className="h-[47px] flex-1 text-[12px] text-qicash-ink"
            />
            <MaterialIcons
              name={isValidRecipient ? 'check-circle' : 'person-add'}
              size={20}
              color={isValidRecipient ? '#2b7a44' : '#6b6e64'}
            />
          </View>
          <Text className="mt-1 text-[8px] text-[#6b6e64]">
            Works with BlipPay, Pelagus, and all Quai wallet addresses
          </Text>
        </FieldCard>

        <FieldCard label="Note (optional)">
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Add a note"
            placeholderTextColor="#9a9c92"
            className="h-[47px] rounded-[8px] bg-[#f7f5ef] px-3 text-[12px] text-qicash-ink"
          />
        </FieldCard>

        <View className="mt-auto pb-8">
          <Pressable
            onPress={handleSend}
            disabled={!canSend}
            className={`h-[46px] items-center justify-center rounded-pill ${
              canSend ? 'bg-qicash-green' : 'bg-qicash-sage/40'
            }`}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-[12px] font-semibold text-white">
                Review &amp; Send
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
