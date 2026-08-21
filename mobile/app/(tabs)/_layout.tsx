import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { colors } from '../../constants/colors';

export default function TabLayout() {
  return (
    <>
      <StatusBar style="dark" backgroundColor="#fbf9f5" />
      <Tabs
        screenOptions={{
          headerShown: false,
          animation: 'shift',
          tabBarActiveTintColor: '#1f472e',
          tabBarInactiveTintColor: '#8a9188',
          tabBarStyle: {
            backgroundColor: colors.bg,
            borderTopColor: '#e8e4db',
            borderTopWidth: 1,
            height: 85,
            paddingBottom: 16,
            paddingTop: 8,
            elevation: 10,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          },
          tabBarIconStyle: {
            marginBottom: 2,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="home" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: 'Pay',
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="qr-code-scanner" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="scan"
          options={{
            title: '',
            tabBarLabel: () => null,
            tabBarIcon: () => (
              <View style={{
                marginTop: -18,
                height: 54,
                width: 54,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 27,
                backgroundColor: '#1f472e',
                shadowColor: '#000',
                shadowOpacity: 0.15,
                shadowOffset: { width: 0, height: 2 },
                shadowRadius: 6,
                elevation: 5,
              }}>
                <MaterialIcons name="qr-code-2" size={26} color="#ffffff" />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="wallet"
          options={{
            title: 'Wallet',
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="account-balance-wallet" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="person" size={24} color={color} />
            ),
          }}
        />
      </Tabs>
    </>
  );
}
