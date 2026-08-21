import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { BalanceCard } from '../../components/qi/BalanceCard';
import { Avatar } from '../../components/qi/Avatar';
import { useAuth } from '../../context/MagicAuthProvider';
import { useWallet } from '../../context/WalletContext';
import * as Linking from 'expo-linking';
import { BLIP_URL, EXPLORER_URL, getShortAddress } from '../../lib/wallet';

const actions = [
  { label: 'Scan to Pay', icon: 'qr-code-scanner' as const, route: '/explore' as const },
  { label: 'Receive', icon: 'south-west' as const, route: '/receive' as const },
  { label: 'Send', icon: 'north-east' as const, route: '/send' as const },
  { label: 'Buy QUAI', icon: 'account-balance-wallet' as const, external: BLIP_URL },
] as const;

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { wallet, quaiBalance, totalFiat, refreshBalance, refreshTransactions, transactions, shortAddress } = useWallet();
  const [refreshing, setRefreshing] = useState(false);
  const [balanceHidden, setBalanceHidden] = useState(false);
  const router = useRouter();
  const firstName = (user?.email?.split('@')[0] ?? 'Promise')
    .replace(/^./, (l) => l.toUpperCase());

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshBalance(), refreshTransactions()]);
    setRefreshing(false);
  }, [refreshBalance, refreshTransactions]);

  useEffect(() => {
    refreshBalance();
    refreshTransactions();
  }, []);

  const copyAddress = async (addr: string) => {
    await Clipboard.setStringAsync(addr);
    Alert.alert('Copied', 'QUAI address copied');
  };

  const recentTxs = transactions.slice(0, 5);

  return (
    <View className="flex-1 bg-qicash-bg">
      <StatusBar style="dark" backgroundColor="#fbf9f5" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-5 pt-16 pb-32"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1f472e" />}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-[13px] text-[#4a4f47]">Good morning,</Text>
            <View className="mt-0.5 flex-row items-center">
              <Text className="text-[22px] font-bold text-[#1b3021]">
                {firstName}
              </Text>
            </View>
          </View>
          <View className="flex-row items-center gap-3">
            <Pressable hitSlop={8}>
              <MaterialIcons name="notifications-none" size={24} color="#1f472e" />
            </Pressable>
            <Pressable onPress={() => router.push('/(tabs)/profile')}>
              <Avatar size={40} variant="warm" bordered />
            </Pressable>
          </View>
        </View>

        <View className="mt-5">
          <BalanceCard
            balance={`${quaiBalance} QUAI`}
            fiat={totalFiat}
            hidden={balanceHidden}
            onToggleHidden={() => setBalanceHidden(!balanceHidden)}
          />
        </View>

        <Pressable
          onPress={onRefresh}
          className="mt-3 flex-row items-center justify-center gap-2 rounded-[12px] bg-qicash-tile py-2.5"
        >
          <MaterialIcons name="refresh" size={16} color="#1f472e" />
          <Text className="text-[11px] font-semibold text-[#1f472e]">Refresh Balance</Text>
        </Pressable>

        {shortAddress ? (
          <View className="mt-3">
            <Pressable
              className="flex-row items-center justify-between rounded-[10px] bg-qicash-tile px-4 py-3"
              onPress={() => wallet && copyAddress(wallet.address)}
            >
              <View className="flex-1">
                <Text className="text-[9px] text-qicash-muted">QUAI Wallet</Text>
                <Text className="mt-0.5 text-[11px] font-medium text-[#1b3021]" numberOfLines={1}>
                  {balanceHidden ? '••••••••••••' : shortAddress}
                </Text>
              </View>
              <MaterialIcons name="content-copy" size={16} color="#415947" />
            </Pressable>
          </View>
        ) : null}

        <View className="mt-5 flex-row justify-between px-0.5">
          {actions.map((action) => (
            <Pressable
              key={action.label}
              onPress={() => {
                if ('external' in action) {
                  Linking.openURL(action.external).catch(() => {});
                } else {
                  router.push(action.route);
                }
              }}
              className="items-center"
              style={{ width: 72 }}
            >
              <View className="h-[52px] w-[56px] items-center justify-center rounded-[12px] bg-qicash-tile shadow-sm">
                <MaterialIcons name={action.icon} size={24} color="#1f472e" />
              </View>
              <Text
                numberOfLines={2}
                className="mt-1.5 text-center text-[10px] leading-[13px] text-[#333b32]"
              >
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View className="mt-8">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-[14px] font-semibold text-[#1b3021]">
              Recent Transactions
            </Text>
            <Pressable onPress={() => router.push('/history')}>
              <Text className="text-[11px] font-medium text-[#243f2b]">
                See all
              </Text>
            </Pressable>
          </View>

          {recentTxs.length === 0 ? (
            <View className="items-center rounded-[14px] bg-qicash-tile py-10">
              <MaterialIcons name="receipt-long" size={40} color="#d0ccbf" />
              <Text className="mt-3 text-[13px] font-medium text-[#9a9c92]">
                No transactions yet
              </Text>
              <Text className="mt-1 text-[11px] text-[#b0b0a6]">
                Your payment history will show up here
              </Text>
            </View>
          ) : (
            recentTxs.map((tx) => {
              const isReceived = tx.type === 'received';
              const otherAddr = isReceived ? tx.from : tx.to;
              return (
                <Pressable
                  key={tx.hash}
                  onPress={() =>
                    Linking.openURL(`${EXPLORER_URL}/tx/${tx.hash}`).catch(() => {})
                  }
                  className="mb-2.5 flex-row items-center justify-between rounded-[10px] bg-qicash-tile px-3 py-2.5"
                >
                  <View className="flex-row items-center gap-2.5">
                    <View className="h-8 w-8 items-center justify-center rounded-[7px] bg-[#eef1e8]">
                      <MaterialIcons
                        name={isReceived ? 'arrow-downward' : 'arrow-upward'}
                        size={15}
                        color={isReceived ? '#2b7a44' : '#1f472e'}
                      />
                    </View>
                    <View>
                      <Text className="text-[11px] font-medium text-qicash-ink">
                        {isReceived ? `From ${getShortAddress(otherAddr)}` : `To ${getShortAddress(otherAddr)}`}
                      </Text>
                      <Text className="mt-0.5 text-[8px] text-[#777c74]">
                        {formatTime(tx.timestamp)}
                      </Text>
                    </View>
                  </View>
                  <Text
                    className={`text-[10px] font-semibold ${
                      isReceived ? 'text-qicash-success' : 'text-qicash-ink'
                    }`}
                  >
                    {isReceived ? '+' : '-'}
                    {tx.value} QUAI
                  </Text>
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}
