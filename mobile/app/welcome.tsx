import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-qicash-bg">
      <StatusBar style="dark" backgroundColor="#fbf9f5" />
      <View className="flex-1 items-center px-8 pt-12">
        <View className='text-left'>
        <Text className="text-5xl font-bold text-[#1b3021]">
          Welcome to{'\n'}QiCash
        </Text>

        <Text className="mt-4 text-center text-3xl leading-6 text-[#4a4f47]">
          Private. Simple.{'\n'}
          Everyday payments{'\n'}
          made for campus life.
        </Text>
        </View>

        <View className="mt-8 flex-1 items-center justify-center">
          <Image
            source={require('../assets/images/welcome-illustration.png')}
            style={{ width: 410, height: 410 }}
            contentFit="contain"
            accessibilityLabel="Students illustration"
          />
        </View>
      </View>

      <View className="px-8 pb-10">
        <Pressable
          onPress={() => router.push('/login')}
          className="h-[56px] items-center justify-center rounded-[20px] bg-[#203926]"
        >
          <Text className="text-[17px] font-semibold text-white">
            Get Started
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
