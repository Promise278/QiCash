import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getMagic } from './magic';
import { createWallet, loadWallet, deleteWallet, QiCashWallet } from '../lib/wallet';

type AuthState = {
  isLoggedIn: boolean;
  isLoading: boolean;
  user: { email: string; publicAddress: string } | null;
  wallet: QiCashWallet | null;
  isCreatingWallet: boolean;
  walletCreatedAt: number;
  login: (email: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  isLoggedIn: false,
  isLoading: true,
  user: null,
  wallet: null,
  isCreatingWallet: false,
  walletCreatedAt: 0,
  login: async () => {},
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function MagicAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthState['user']>(null);
  const [wallet, setWallet] = useState<QiCashWallet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const [walletCreatedAt, setWalletCreatedAt] = useState(0);

  const checkAuth = useCallback(async () => {
    const magic = getMagic();
    if (!magic) {
      setIsLoading(false);
      return;
    }

    try {
      const isLoggedIn = await magic.user.isLoggedIn();
      if (isLoggedIn) {
        const metadata = await magic.user.getInfo();
        const email = metadata.email ?? '';
        setUser({
          email,
          publicAddress: metadata.wallets?.ethereum?.publicAddress ?? '',
        });

        const existingWallet = await loadWallet();
        if (existingWallet) {
          setWallet(existingWallet);
        } else {
          setIsCreatingWallet(true);
          const w = await createWallet(email);
          setWallet(w);
          setWalletCreatedAt(Date.now());
          setIsCreatingWallet(false);
        }
      }
    } catch {
      // Not logged in or error checking
    } finally {
      setIsLoading(false);
      setIsCreatingWallet(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email: string) => {
    const magic = getMagic();
    if (!magic) {
      throw new Error('Authentication is available once the app has loaded.');
    }

    try {
      await magic.auth.loginWithEmailOTP({ email });
      const metadata = await magic.user.getInfo();
      setUser({
        email: metadata.email ?? '',
        publicAddress: metadata.wallets?.ethereum?.publicAddress ?? '',
      });

      setIsCreatingWallet(true);
      const w = await createWallet(email);
      setWallet(w);
      setWalletCreatedAt(Date.now());
      setIsCreatingWallet(false);
    } catch (e) {
      setIsCreatingWallet(false);
      console.error('Login failed', e);
      throw e;
    }
  };

  const logout = async () => {
    const magic = getMagic();
    if (magic) {
      try {
        await magic.user.logout();
      } catch {}
    }
    setUser(null);
    setWallet(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn: !!user,
        isLoading,
        user,
        wallet,
        isCreatingWallet,
        walletCreatedAt,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
