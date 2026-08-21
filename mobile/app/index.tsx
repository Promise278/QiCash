import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LandingScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-qicash-bg">
      <StatusBar style="dark" backgroundColor="#fbf9f5" />
      <View className="flex-1 overflow-hidden">
        <View className="absolute -bottom-14 -left-24 h-[210px] w-[520px] rounded-t-[220px] border-[2px] border-[#d3d9b7]" />
        <View className="absolute -bottom-28 -left-14 h-[236px] w-[510px] rounded-t-[230px] border-[2px] border-[#c1cba8]" />
        <View className="absolute -bottom-40 -left-28 h-[248px] w-[560px] rounded-t-[260px] border-[2px] border-[#d9dfbf]" />

        <View className="flex-1 items-center justify-center px-8 mb-14">
          <View className="h-[250px] w-[250px] overflow-hidden">
            <Image
              source={require('../assets/images/qicashonboard.png')}
              style={{ height: 280, width: 280 }}
              contentFit="contain"
              accessibilityLabel="QiCash logo"
            />
          </View>
          <Text className="mt-2 text-center text-3xl text-[#3d4a40]">
            Privacy-First{'\n'}
            Campus Payments{'\n'}
            on Quai Network
          </Text>
        </View>

        <View className="px-8 mb-16">
          <Pressable
            onPress={() => router.push('/welcome')}
            className="h-[56px] items-center justify-center rounded-[20px] bg-[#203926]"
          >
            <Text className="text-[17px] font-semibold text-white">
              Get Started
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
