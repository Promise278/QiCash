import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as Clipboard from 'expo-clipboard';
import { Pressable, RefreshControl, ScrollView, Text, View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWallet } from '../../context/WalletContext';

export default function WalletScreen() {
  const { wallet, quaiBalance, totalFiat, shortAddress, refreshBalance } = useWallet();
  const [balanceHidden, setBalanceHidden] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshBalance();
    setRefreshing(false);
  };

  const copyAddress = async (addr: string) => {
    await Clipboard.setStringAsync(addr);
    Alert.alert('Copied', 'QUAI address copied');
  };

  return (
    <SafeAreaView className="flex-1 bg-qicash-bg">
      <StatusBar style="dark" backgroundColor="#fbf9f5" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-5 pt-4 pb-24"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1f472e" />}
      >
        <View className="flex-row items-center justify-between">
          <Text className="text-[15px] font-semibold text-[#1b3021]">
            My Wallet
          </Text>
          <Pressable hitSlop={8} onPress={onRefresh}>
            <MaterialIcons name="refresh" size={19} color="#1f472e" />
          </Pressable>
        </View>

        {/* Total balance */}
        <View className="mt-4 rounded-[15px] bg-qicash-green p-6">
          <View className="flex-row items-center justify-between">
            <Text className="text-2xl text-[#e9ece1]">Total Balance</Text>
            <Pressable hitSlop={8} onPress={() => setBalanceHidden(!balanceHidden)}>
              <MaterialIcons
                name={balanceHidden ? 'visibility-off' : 'visibility'}
                size={18}
                color="#e8f0e9"
              />
            </Pressable>
          </View>
          <Text className="mt-1 text-4xl font-bold text-white">
            {balanceHidden ? '••••••' : `${quaiBalance} QUAI`}
          </Text>
        </View>

        {/* USD equivalent */}
        <View className="mt-4 rounded-[14px] bg-qicash-tile p-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <View className="h-[36px] w-[36px] items-center justify-center rounded-[10px] bg-[#e8f5e9]">
                <MaterialIcons name="account-balance" size={20} color="#1f472e" />
              </View>
              <View>
                <Text className="text-[11px] text-qicash-muted">USD Value</Text>
                <Text className="text-[18px] font-bold text-[#1b3021]">
                  {balanceHidden ? '••••' : totalFiat}
                </Text>
              </View>
            </View>
            <Pressable
              hitSlop={8}
              onPress={() => wallet && copyAddress(wallet.address)}
            >
              <MaterialIcons name="content-copy" size={17} color="#415947" />
            </Pressable>
          </View>
          {shortAddress ? (
            <Text className="mt-2 font-mono text-[9px] text-qicash-muted" numberOfLines={1}>
              {balanceHidden ? '••••••••••••••••' : shortAddress}
            </Text>
          ) : null}
        </View>

        {/* Actions */}
        <View className="mt-4 overflow-hidden rounded-[11px] bg-[#fffdfa]">
          {[
            { label: 'Top Up', icon: 'add-circle-outline' as const },
            { label: 'Withdraw', icon: 'remove-circle-outline' as const },
          ].map((action) => (
            <Pressable
              key={action.label}
              className="h-[52px] flex-row items-center justify-between border-b border-qicash-line px-3"
            >
              <View className="flex-row items-center gap-3">
                <MaterialIcons name={action.icon} size={20} color="#1f472e" />
                <Text className="text-[11px] font-semibold text-[#29352b]">
                  {action.label}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color="#667067" />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
