import { MaterialIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { parsePaymentUri } from '../../lib/wallet';

export default function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const handleBarCodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (scanned) return;
      setScanned(true);

      const parsed = parsePaymentUri(data);
      if (parsed?.address) {
        router.push({
          pathname: '/send',
          params: {
            recipient: parsed.address,
            amount: parsed.amount?.toString() || '',
            label: parsed.label || '',
          },
        });
      } else {
        Alert.alert(
          'Invalid QR Code',
          'This QR code is not a valid Quai payment code. Please scan a QiCash or BlipPay QR code.',
          [{ text: 'Scan Again', onPress: () => setScanned(false) }]
        );
      }
    },
    [scanned, router]
  );

  if (!permission) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-qicash-bg">
        <StatusBar style="dark" backgroundColor="#fbf9f5" />
        <ActivityIndicator size="large" color="#1f472e" />
        <Text className="mt-4 text-[13px] text-qicash-muted">Loading camera...</Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 bg-qicash-bg">
        <StatusBar style="dark" backgroundColor="#fbf9f5" />
        <View className="flex-row items-center justify-between bg-qicash-bg px-5 py-2">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center"
            hitSlop={8}
          >
            <MaterialIcons name="arrow-back-ios-new" size={19} color="#1c2920" />
          </Pressable>
          <Text className="text-[14px] font-semibold text-qicash-ink">Scan to Pay</Text>
          <View className="h-10 w-10" />
        </View>

        <View className="flex-1 items-center justify-center px-8">
          <View className="h-[80px] w-[80px] items-center justify-center rounded-full bg-[#f0ede5]">
            <MaterialIcons name="photo-camera" size={36} color="#1f472e" />
          </View>
          <Text className="mt-6 text-center text-[16px] font-semibold text-qicash-ink">
            Camera Access Required
          </Text>
          <Text className="mt-2 text-center text-[13px] leading-5 text-qicash-muted">
            QiCash needs access to your camera to scan QR codes for payments.
          </Text>
          <Pressable
            onPress={requestPermission}
            className="mt-6 h-[44px] w-[200px] items-center justify-center rounded-pill bg-qicash-green"
          >
            <Text className="text-[13px] font-semibold text-white">Allow Camera</Text>
          </Pressable>
          <Pressable
            onPress={() => router.back()}
            className="mt-3 h-[44px] w-[200px] items-center justify-center rounded-pill bg-[#f0ede5]"
          >
            <Text className="text-[13px] font-semibold text-qicash-ink">Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar style="light" backgroundColor="#000" />

      <View className="flex-row items-center justify-between bg-black/80 px-5 py-2">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center"
          hitSlop={8}
        >
          <MaterialIcons name="arrow-back-ios-new" size={19} color="#ffffff" />
        </Pressable>
        <Text className="text-[14px] font-semibold text-white">Scan to Pay</Text>
        <View className="h-10 w-10" />
      </View>

      <View className="flex-1">
        <CameraView
          style={{ flex: 1 }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        />

        <View className="absolute inset-0 items-center justify-center">
          <View className="h-[250px] w-[250px]">
            <View className="absolute -left-1 -top-1 h-10 w-10 rounded-tl-[14px] border-l-[3px] border-t-[3px] border-white" />
            <View className="absolute -right-1 -top-1 h-10 w-10 rounded-tr-[14px] border-r-[3px] border-t-[3px] border-white" />
            <View className="absolute -bottom-1 -left-1 h-10 w-10 rounded-bl-[14px] border-b-[3px] border-l-[3px] border-white" />
            <View className="absolute -bottom-1 -right-1 h-10 w-10 rounded-br-[14px] border-b-[3px] border-r-[3px] border-white" />
          </View>
        </View>

        <View className="absolute bottom-0 left-0 right-0 items-center bg-black/60 pb-8 pt-4">
          <Text className="text-center text-[13px] text-white">
            Point camera at a QiCash or BlipPay QR code
          </Text>
          <Text className="mt-1 text-center text-[11px] text-white/60">
            Compatible with all Quai Network wallets
          </Text>

          <View className="mt-4 flex-row gap-3">
            <Pressable
              onPress={() => setScanned(false)}
              className="h-[40px] items-center justify-center rounded-pill bg-white/20 px-6"
            >
              <Text className="text-[12px] font-semibold text-white">Scan Again</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/receive')}
              className="h-[40px] items-center justify-center rounded-pill bg-qicash-green px-6"
            >
              <Text className="text-[12px] font-semibold text-white">My QR</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
