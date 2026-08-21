import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SegmentedTabs, TabItem } from '../components/qi/SegmentedTabs';
import { useWallet } from '../context/WalletContext';
import { getShortAddress, EXPLORER_URL } from '../lib/wallet';
import * as Linking from 'expo-linking';

type FilterTab = 'all' | 'sent' | 'received';

const tabs: TabItem<FilterTab>[] = [
  { key: 'all', label: 'All' },
  { key: 'sent', label: 'Sent' },
  { key: 'received', label: 'Received' },
];

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000 && d.getDate() === now.getDate()) return 'Today';
  if (diff < 172800000) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function HistoryScreen() {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const router = useRouter();
  const { transactions } = useWallet();

  const filtered =
    activeTab === 'all'
      ? transactions
      : transactions.filter((t) => t.type === activeTab);

  const grouped = filtered.reduce<Record<string, typeof transactions>>(
    (acc, tx) => {
      const date = formatDate(tx.timestamp);
      if (!acc[date]) acc[date] = [];
      acc[date].push(tx);
      return acc;
    },
    {}
  );

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
            History
          </Text>
          <View className="h-10 w-10" />
        </View>

        <View className="mt-2">
          <SegmentedTabs<FilterTab>
            tabs={tabs}
            active={activeTab}
            onChange={setActiveTab}
          />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="pt-4 pb-8"
        >
          {transactions.length === 0 ? (
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
            Object.entries(grouped).map(([date, txs]) => (
              <View key={date} className="mb-3">
                <Text className="mb-2 text-[10px] font-medium text-[#6e746d]">
                  {date}
                </Text>
                {txs.map((tx) => {
                  const isReceived = tx.type === 'received';
                  const otherAddr = isReceived ? tx.from : tx.to;
                  const shortOther = getShortAddress(otherAddr);
                  const icon = isReceived ? 'arrow-downward' : 'arrow-upward';

                  return (
                    <Pressable
                      key={tx.hash}
                      onPress={() =>
                        Linking.openURL(`${EXPLORER_URL}/tx/${tx.hash}`).catch(
                          () => {}
                        )
                      }
                      className="mb-2.5 flex-row items-center justify-between py-1"
                    >
                      <View className="flex-row items-center gap-2.5">
                        <View className="h-8 w-8 items-center justify-center rounded-[7px] bg-[#eef1e8]">
                          <MaterialIcons
                            name={icon as any}
                            size={15}
                            color={isReceived ? '#2b7a44' : '#1f472e'}
                          />
                        </View>
                        <View>
                          <Text className="text-[11px] font-medium text-qicash-ink">
                            {isReceived ? `From ${shortOther}` : `To ${shortOther}`}
                          </Text>
                          <Text className="mt-0.5 text-[8px] text-[#777c74]">
                            {formatTime(tx.timestamp)}
                            {tx.status === 'failed' ? ' · Failed' : ''}
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
                })}
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
