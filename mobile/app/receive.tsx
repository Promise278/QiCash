import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, Pressable, Share, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { SegmentedTabs } from '../components/qi/SegmentedTabs';
import { useWallet } from '../context/WalletContext';
import { getShortAddress } from '../lib/wallet';

type Mode = 'myqr' | 'request';

export default function ReceiveScreen() {
  const [tab, setTab] = useState<Mode>('myqr');
  const [amount, setAmount] = useState('');
  const [label, setLabel] = useState('');
  const { wallet } = useWallet();
  const router = useRouter();

  const quaiAddress = wallet?.address || '0x0000000000000000000000000000000000000000';
  const shortAddr = getShortAddress(quaiAddress);

  const qrValue = quaiAddress;

  const handleShare = useCallback(async () => {
    const amountText = amount ? ` Amount: ${amount} QUAI` : '';
    const labelText = label ? ` (${label})` : '';
    const message = `Pay me with QUAI!${labelText}${amountText}\nAddress: ${quaiAddress}\nNetwork: Quai Mainnet`;
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(message);
      } else {
        await Share.share({ message });
      }
    } catch {}
  }, [quaiAddress, amount, label]);

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
          <Text className="text-[14px] font-semibold text-qicash-ink">Receive</Text>
          <View className="h-10 w-10" />
        </View>

        <View className="mt-2">
          <SegmentedTabs<Mode>
            tabs={[
              { key: 'myqr', label: 'My QR' },
              { key: 'request', label: 'Request' },
            ]}
            active={tab}
            onChange={setTab}
            variant="pill"
          />
        </View>

        {tab === 'request' && (
          <View className="mt-5 gap-3">
            <View>
              <Text className="mb-1.5 text-[11px] font-medium text-qicash-muted">
                Amount (QUAI)
              </Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                keyboardType="decimal-pad"
                className="h-[44px] rounded-xl bg-white px-4 text-[15px] text-qicash-ink shadow-sm"
                placeholderTextColor="#b0b3ac"
              />
            </View>
            <View>
              <Text className="mb-1.5 text-[11px] font-medium text-qicash-muted">
                Label (optional)
              </Text>
              <TextInput
                value={label}
                onChangeText={setLabel}
                placeholder="e.g. Lunch, Printing, Water"
                className="h-[44px] rounded-xl bg-white px-4 text-[15px] text-qicash-ink shadow-sm"
                placeholderTextColor="#b0b3ac"
              />
            </View>
          </View>
        )}

        <View className="mt-6 items-center">
          <View className="h-[220px] w-[220px] items-center justify-center rounded-2xl bg-white p-3 shadow-sm">
            <QRCode
              value={qrValue}
              size={190}
              color="#1f472e"
              backgroundColor="#ffffff"
              logo={require('../assets/images/qicash-logo.png')}
              logoSize={20}
              logoMargin={4}
              logoBorderRadius={6}
              quietZone={10}
            />
          </View>
        </View>

        <Text className="mt-4 text-center text-[12px] leading-5 text-[#343b34]">
          {tab === 'myqr'
            ? 'Let others scan this code to pay you.'
            : amount
            ? `Show this QR to receive ${amount} QUAI${label ? ` for ${label}` : ''}`
            : 'Set an amount above, then show this QR to receive payment.'}
        </Text>

        <View className="mt-3 items-center">
          <Text className="text-[10px] text-[#6b6e64]">Your QUAI address</Text>
          <Text className="mt-1 font-mono text-[11px] text-qicash-ink">{shortAddr}</Text>
        </View>

        <View className="mt-3 items-center">
          <View className="flex-row items-center gap-1 rounded-pill bg-qicash-tile px-3 py-1.5">
            <MaterialIcons name="link" size={12} color="#1f472e" />
            <Text className="text-[9px] text-qicash-green">
              Compatible with BlipPay &amp; all Quai wallets
            </Text>
          </View>
        </View>

        <View className="mt-auto pb-8 gap-2">
          <Pressable
            onPress={handleShare}
            className="mx-auto h-[42px] w-full flex-row items-center justify-center gap-2 rounded-pill bg-qicash-green"
          >
            <MaterialIcons name="ios-share" size={16} color="#ffffff" />
            <Text className="text-[12px] font-semibold text-white">Share Payment Link</Text>
          </Pressable>
          <Pressable
            onPress={handleShare}
            className="mx-auto h-[42px] w-full flex-row items-center justify-center gap-2 rounded-pill bg-[#f1f0ea]"
          >
            <MaterialIcons name="content-copy" size={16} color="#26372b" />
            <Text className="text-[12px] font-semibold text-[#26372b]">Copy Address</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
