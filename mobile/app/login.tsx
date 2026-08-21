import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/MagicAuthProvider';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }
    setError('');
    setLoading(true);
    try {
      // Magic handles OTP entry via its native UI (magic.Relayer).
      // loginWithEmailOTP sends OTP, shows Magic's OTP input overlay,
      // and resolves AFTER the user successfully enters the code.
      await login(email.trim());
      // If we reach here, authentication succeeded.
      // RootNavigator will redirect to (tabs) when isLoggedIn flips true.
    } catch (e: any) {
      // Only show error if it's not a user cancellation
      if (e?.message && !e?.message?.includes('canceled')) {
        setError(e?.message || 'Failed to send login code');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-qicash-bg">
      <StatusBar style="dark" backgroundColor="#fbf9f5" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 px-6 pt-4">
          <Pressable
            onPress={() => router.back()}
            className="mb-6 h-10 w-10 items-center justify-center"
          >
            <MaterialIcons name="arrow-back" size={24} color="#191d15" />
          </Pressable>

          <Text className="text-[26px] font-bold text-[#191d15]">
            Log in to QiCash
          </Text>
          <Text className="mt-2 text-[15px] text-[#5f6358]">
            Enter your campus email. We&apos;ll send a one-time passcode.
          </Text>

          <View className="mt-10">
            <Text className="mb-2 text-[13px] font-medium text-[#191d15]">
              Email address
            </Text>
            <TextInput
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setError('');
              }}
              placeholder="user@gmail.com"
              placeholderTextColor="#9a9c92"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              className="h-[56px] rounded-[16px] border border-[#e4ded2] bg-[#fbf7f1] px-4 text-[16px] text-[#191d15]"
            />
          </View>

          {error ? (
            <Text className="mt-3 text-[13px] text-red-600">{error}</Text>
          ) : null}

          <View className="mt-auto pb-10">
            <Pressable
              onPress={handleLogin}
              disabled={loading}
              className="h-[56px] items-center justify-center rounded-[20px] bg-[#203926]"
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-[17px] font-semibold text-white">
                  Sign in
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
