import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useRef } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';
import './global.css';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { MagicAuthProvider, useAuth } from '../context/MagicAuthProvider';
import { WalletProvider } from '../context/WalletContext';
import { getMagic } from '../context/magic';

function MagicRelayer() {
  const magic = getMagic();
  if (!magic) return null;
  const Relayer = magic.Relayer;
  return <Relayer />;
}

function RootNavigator() {
  const { isLoggedIn, isLoading, isCreatingWallet } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const initialNavDone = useRef(false);

  useEffect(() => {
    if (isLoading) return;
    if (initialNavDone.current) return;

    const currentRoute = segments[0];

    if (!isLoggedIn) {
      if (currentRoute !== 'login' && currentRoute !== 'welcome') {
        initialNavDone.current = true;
        router.replace('/login');
      }
    } else {
      if (!isCreatingWallet) {
        if (currentRoute === undefined || currentRoute === 'login' || currentRoute === 'welcome') {
          initialNavDone.current = true;
          router.replace('/(tabs)');
        }
      }
    }
  }, [isLoggedIn, isLoading, isCreatingWallet, segments]);

  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="welcome" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="modal" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="receive" />
        <Stack.Screen name="send" />
        <Stack.Screen name="history" />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <MagicAuthProvider>
        <WalletProvider>
          <MagicRelayer />
          <RootNavigator />
        </WalletProvider>
      </MagicAuthProvider>
    </SafeAreaProvider>
  );
}
