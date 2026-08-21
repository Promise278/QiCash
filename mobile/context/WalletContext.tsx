import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  QiCashWallet,
  Transaction,
  loadWallet,
  deleteWallet,
  getShortAddress,
  getBalanceRaw,
  getQuaiPrice,
  sendQuai,
  getTransactionHistory,
} from '../lib/wallet';
import { useAuth } from './MagicAuthProvider';

type WalletState = {
  wallet: QiCashWallet | null;
  quaiBalance: string;
  totalFiat: string;
  quaiPrice: number;
  isLoading: boolean;
  shortAddress: string;
  transactions: Transaction[];
  refreshBalance: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  sendPayment: (to: string, amountQuai: number) => Promise<{ hash: string }>;
  clearWallet: () => Promise<void>;
};

const WalletContext = createContext<WalletState>({
  wallet: null,
  quaiBalance: '0.00',
  totalFiat: '$0.00',
  quaiPrice: 0,
  isLoading: true,
  shortAddress: '',
  transactions: [],
  refreshBalance: async () => {},
  refreshTransactions: async () => {},
  sendPayment: async () => ({ hash: '' }),
  clearWallet: async () => {},
});

export function useWallet() {
  return useContext(WalletContext);
}

function formatQuai(wei: bigint): string {
  const whole = wei / 10n ** 18n;
  const frac = (wei % 10n ** 18n) / 10n ** 16n;
  return `${whole.toString()}.${frac.toString().padStart(2, '0')}`;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [wallet, setWallet] = useState<QiCashWallet | null>(null);
  const [quaiBalance, setQuaiBalance] = useState('0.00');
  const [totalFiat, setTotalFiat] = useState('$0.00');
  const [quaiPrice, setQuaiPrice] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const { walletCreatedAt } = useAuth();

  const fetchBalances = useCallback(async (w: QiCashWallet) => {
    try {
      const [quaiWei, price] = await Promise.all([
        getBalanceRaw(w.address),
        getQuaiPrice(),
      ]);
      const qStr = formatQuai(quaiWei);
      setQuaiBalance(qStr);
      setQuaiPrice(price);
      setTotalFiat(price > 0 ? `$${(parseFloat(qStr) * price).toFixed(2)}` : '$0.00');
    } catch {
      setQuaiBalance('0.00');
      setTotalFiat('$0.00');
    }
  }, []);

  const fetchTransactions = useCallback(async (w: QiCashWallet) => {
    try {
      const txs = await getTransactionHistory(w.address);
      setTransactions(txs);
    } catch {
      setTransactions([]);
    }
  }, []);

  const refreshBalance = useCallback(async () => {
    if (wallet) await fetchBalances(wallet);
  }, [wallet, fetchBalances]);

  const refreshTransactions = useCallback(async () => {
    if (wallet) await fetchTransactions(wallet);
  }, [wallet, fetchTransactions]);

  const sendPayment = useCallback(
    async (to: string, amountQuai: number) => {
      if (!wallet) throw new Error('No wallet');
      const result = await sendQuai(wallet.privateKey, to, amountQuai);
      await fetchBalances(wallet);
      await fetchTransactions(wallet);
      return result;
    },
    [wallet, fetchBalances, fetchTransactions]
  );

  useEffect(() => {
    (async () => {
      const existing = await loadWallet();
      if (existing) {
        setWallet(existing);
        await fetchBalances(existing);
        await fetchTransactions(existing);
      }
      setIsLoading(false);
    })();
  }, [fetchBalances, fetchTransactions]);

  useEffect(() => {
    if (walletCreatedAt > 0) {
      (async () => {
        const existing = await loadWallet();
        if (existing) {
          setWallet(existing);
          await fetchBalances(existing);
          await fetchTransactions(existing);
        }
      })();
    }
  }, [walletCreatedAt, fetchBalances, fetchTransactions]);

  useEffect(() => {
    if (!wallet) return;
    const interval = setInterval(() => {
      fetchBalances(wallet);
    }, 10000);
    return () => clearInterval(interval);
  }, [wallet, fetchBalances]);

  const clearWallet = useCallback(async () => {
    await deleteWallet();
    setWallet(null);
    setQuaiBalance('0.00');
    setTotalFiat('$0.00');
    setTransactions([]);
  }, []);

  return (
    <WalletContext.Provider
      value={{
        wallet,
        quaiBalance,
        totalFiat,
        quaiPrice,
        isLoading,
        shortAddress: wallet ? getShortAddress(wallet.address) : '',
        transactions,
        refreshBalance,
        refreshTransactions,
        sendPayment,
        clearWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}
