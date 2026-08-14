import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, View } from 'react-native';
import '../global.css';

type ScreenVariant = 'welcome' | 'home' | 'scan' | 'success' | 'wallet' | 'profile';

const qrPattern = [
  [1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0],
  [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0],
  [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0],
  [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0],
  [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0],
  [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0],
  [1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0],
  [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0],
  [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0],
  [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0],
  [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0],
  [1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
] as const;

const screenVariants: ScreenVariant[] = ['welcome', 'home', 'scan', 'success', 'wallet', 'profile'];

function PhoneMockup({ variant }: { variant: ScreenVariant }) {
  if (variant === 'welcome') {
    return (
      <View className="h-[760px] w-[46%] min-w-[180px] overflow-hidden rounded-[34px] border border-[#e7ddd0] bg-[#f5f0ea] p-3 shadow-[0_18px_30px_rgba(33,28,24,0.08)]">
        <View className="flex-1 overflow-hidden rounded-[30px] bg-[#f2efe9] p-4">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#141414] opacity-80">9:41</Text>
            <View className="flex-row items-center gap-1">
              <View className="h-2.5 w-2.5 rounded-full bg-[#1c1c1c] opacity-80" />
              <View className="h-2.5 w-2.5 rounded-full bg-[#1c1c1c] opacity-60" />
              <View className="h-2.5 w-2.5 rounded-full bg-[#1c1c1c] opacity-40" />
            </View>
          </View>

          <View className="mt-3 items-center">
            <Text className="text-[17px] font-medium text-[#1c1c1c]">Welcome to</Text>
            <Text className="mt-1 text-[42px] font-bold leading-none tracking-[-2px] text-[#1e3b34]">QiPay</Text>
          </View>

          <View className="mt-5 items-center">
            <View className="h-[140px] w-[120px] items-center justify-center rounded-[48px] bg-[#dfe8e1]">
              <View className="relative h-20 w-20 rounded-full bg-[#a7c0b5]" />
              <View className="absolute -bottom-2 h-16 w-28 rounded-[24px] bg-[#e4eee8]" />
            </View>
          </View>

          <Text className="mt-5 text-center text-[15px] leading-6 text-[#1d312c]">{`Privacy-First\nCampus Payments\non Quai Network`}</Text>

          <View className="mt-7 items-center">
            <View className="h-[52px] w-[220px] items-center justify-center rounded-[18px] bg-[#1d4f45]">
              <Text className="text-[16px] font-semibold text-white">Get Started</Text>
            </View>
            <Text className="mt-4 text-[12px] text-[#5f6d67]">I already have an account</Text>
          </View>
        </View>
      </View>
    );
  }

  if (variant === 'home') {
    return (
      <View className="h-[760px] w-[46%] min-w-[180px] overflow-hidden rounded-[34px] border border-[#e7ddd0] bg-[#f5f0ea] p-3 shadow-[0_18px_30px_rgba(33,28,24,0.08)]">
        <View className="flex-1 overflow-hidden rounded-[30px] bg-[#f2efe9] p-4">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#141414] opacity-80">9:41</Text>
            <View className="flex-row items-center gap-1">
              <View className="h-2.5 w-2.5 rounded-full bg-[#1c1c1c] opacity-80" />
              <View className="h-2.5 w-2.5 rounded-full bg-[#1c1c1c] opacity-60" />
              <View className="h-2.5 w-2.5 rounded-full bg-[#1c1c1c] opacity-40" />
            </View>
          </View>

          <View className="flex-row items-center justify-between">
            <Text className="text-[18px] font-semibold text-[#1f2c29]">Good morning,</Text>
            <MaterialIcons name="account-circle" size={28} color="#2d4f45" />
          </View>
          <Text className="mt-1 text-[28px] font-bold leading-tight text-[#1f2c29]">Promise</Text>

          <View className="mt-5 rounded-[20px] bg-[#214e45] p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-[11px] uppercase tracking-[0.24em] text-[#dfeee6]">Your Balance</Text>
              <MaterialIcons name="visibility" size={18} color="#dfeee6" />
            </View>
            <Text className="mt-3 text-[36px] font-bold text-white">128.45 QI</Text>
            <Text className="mt-1 text-[13px] text-[#dfeee6]">≈ $28.63</Text>
          </View>

          <View className="mt-5 flex-row justify-between px-2">
            {['Scan to Pay', 'Receive', 'Send', 'History'].map((label, idx) => (
              <View key={label} className="items-center gap-2">
                <View className="h-10 w-10 items-center justify-center rounded-[12px] bg-[#e7e3df]">
                  <MaterialIcons name={idx === 0 ? 'qr-code-scanner' : idx === 1 ? 'south-west' : idx === 2 ? 'north-east' : 'history'} size={18} color="#1f2c29" />
                </View>
                <Text className="text-[11px] text-[#3a443f]">{label}</Text>
              </View>
            ))}
          </View>

          <View className="mt-6">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-[13px] font-semibold text-[#2d403b]">Recent Transactions</Text>
              <Text className="text-[12px] text-[#5a7169]">See all</Text>
            </View>

            {[
              ['Food Court', '-12.50 QI', 'Today, 10:21 AM'],
              ['Bookshop', '-8.20 QI', 'Today, 9:02 AM'],
              ['Water Vendor', '-1.30 QI', 'Yesterday, 4:45 PM'],
            ].map(([title, amount, time]) => (
              <View key={title} className="mt-2 flex-row items-center justify-between rounded-[14px] bg-[#f7f3ee] px-3 py-2.5">
                <View className="flex-row items-center gap-2">
                  <View className="h-8 w-8 items-center justify-center rounded-full bg-[#dfe8e1]">
                    <View className="h-3.5 w-3.5 rounded-full bg-[#395b52]" />
                  </View>
                  <View>
                    <Text className="text-[12px] font-semibold text-[#1d312c]">{title}</Text>
                    <Text className="text-[10px] text-[#61756f]">{time}</Text>
                  </View>
                </View>
                <Text className="text-[12px] font-semibold text-[#1d312c]">{amount}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  }

  if (variant === 'scan') {
    return (
      <View className="h-[760px] w-[46%] min-w-[180px] overflow-hidden rounded-[34px] border border-[#e7ddd0] bg-[#f5f0ea] p-3 shadow-[0_18px_30px_rgba(33,28,24,0.08)]">
        <View className="flex-1 overflow-hidden rounded-[30px] bg-[#f1eee9] p-4">
          <View className="mb-4 flex-row items-center justify-between">
            <MaterialIcons name="arrow-back" size={18} color="#1a1a1a" />
            <Text className="text-[17px] font-semibold text-[#1d312c]">Scan to Pay</Text>
            <MaterialIcons name="flash-on" size={18} color="#1a1a1a" />
          </View>

          <View className="mt-4 flex-1 items-center justify-center rounded-[24px] bg-[#d8d1c7] p-5">
            <View className="relative h-[260px] w-[240px] items-center justify-center rounded-[18px] border-[4px] border-[#1f302d] bg-[#d8d1c7]">
              {qrPattern.map((row, rowIndex) =>
                row.map((cell, colIndex) => (
                  <View
                    key={`${rowIndex}-${colIndex}`}
                    className={cell ? 'absolute bg-[#1b1b1b]' : 'absolute bg-transparent'}
                    style={{
                      width: 10,
                      height: 10,
                      left: 10 + colIndex * 12,
                      top: 10 + rowIndex * 12,
                      borderRadius: 2,
                    }}
                  />
                ))
              )}

              <View className="absolute left-[18px] top-[18px] h-[54px] w-[54px] rounded-[12px] border-[5px] border-[#1f302d]" />
              <View className="absolute bottom-[18px] left-[18px] h-[54px] w-[54px] rounded-[12px] border-[5px] border-[#1f302d]" />
              <View className="absolute bottom-[18px] right-[18px] h-[54px] w-[54px] rounded-[12px] border-[5px] border-[#1f302d]" />
            </View>
          </View>

          <Text className="mt-5 text-center text-[12px] text-[#4d5d58]">Point your camera at the vendor's QR code</Text>
        </View>
      </View>
    );
  }

  if (variant === 'success') {
    return (
      <View className="h-[760px] w-[46%] min-w-[180px] overflow-hidden rounded-[34px] border border-[#e7ddd0] bg-[#f5f0ea] p-3 shadow-[0_18px_30px_rgba(33,28,24,0.08)]">
        <View className="flex-1 overflow-hidden rounded-[30px] bg-[#f2efe9] p-4">
          <View className="mb-4 flex-row items-center justify-between">
            <MaterialIcons name="arrow-back" size={18} color="#1a1a1a" />
            <View className="h-8 w-8 items-center justify-center rounded-full bg-[#dfe8e1]">
              <MaterialIcons name="bolt" size={16} color="#1b3a32" />
            </View>
          </View>

          <View className="mt-12 items-center">
            <View className="mb-5 h-20 w-20 items-center justify-center rounded-full bg-[#dfe8e1]">
              <MaterialIcons name="check" size={40} color="#234a42" />
            </View>
            <Text className="text-[26px] font-semibold text-[#1d312c]">Payment Successful</Text>
            <Text className="mt-2 text-[13px] text-[#596c66]">Your payment was sent successfully.</Text>
          </View>

          <View className="mt-8 rounded-[18px] border border-[#dfe5df] bg-[#f8f5f1] p-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <View className="h-10 w-10 items-center justify-center rounded-[10px] bg-[#ebeee9]">
                  <MaterialIcons name="local-dining" size={18} color="#234a42" />
                </View>
                <Text className="text-[14px] font-semibold text-[#1d312c]">Food Court</Text>
              </View>
              <Text className="text-[14px] font-semibold text-[#1d312c]">-12.50 QI</Text>
            </View>
            <Text className="mt-3 text-[11px] text-[#597169]">Today, 10:21 AM</Text>
            <Text className="mt-2 text-[11px] text-[#597169]">TxID: 7f3a...9c21</Text>
          </View>

          <View className="mt-auto">
            <View className="h-[52px] items-center justify-center rounded-[18px] bg-[#1d4f45]">
              <Text className="text-[16px] font-semibold text-white">Done</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  if (variant === 'wallet') {
    return (
      <View className="h-[760px] w-[46%] min-w-[180px] overflow-hidden rounded-[34px] border border-[#e7ddd0] bg-[#f5f0ea] p-3 shadow-[0_18px_30px_rgba(33,28,24,0.08)]">
        <View className="flex-1 overflow-hidden rounded-[30px] bg-[#f1efe9] p-4">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#141414] opacity-80">9:41</Text>
            <View className="flex-row items-center gap-1">
              <View className="h-2.5 w-2.5 rounded-full bg-[#1c1c1c] opacity-80" />
              <View className="h-2.5 w-2.5 rounded-full bg-[#1c1c1c] opacity-60" />
              <View className="h-2.5 w-2.5 rounded-full bg-[#1c1c1c] opacity-40" />
            </View>
          </View>

          <View className="rounded-[22px] bg-[#234e45] p-4">
            <Text className="text-[11px] uppercase tracking-[0.25em] text-[#dfeee6]">My Wallet</Text>
            <Text className="mt-4 text-[32px] font-bold text-white">128.45 QI</Text>
            <Text className="mt-1 text-[13px] text-[#dfeee6]">≈ $28.63</Text>
            <View className="mt-5 rounded-[18px] bg-[#f7efe7] p-3">
              <Text className="text-[11px] font-medium text-[#3a3a3a]">Wallet Address</Text>
              <Text className="mt-1 text-[12px] text-[#5e665d]">0x7a3F...9c21</Text>
            </View>
          </View>

          <View className="mt-5 rounded-[20px] bg-[#f7f3ee] p-3">
            <Text className="text-[13px] font-semibold text-[#1d312c]">Manage funds</Text>
            <View className="mt-3 gap-3">
              {['Top Up', 'Withdraw'].map((label, idx) => (
                <View key={label} className="flex-row items-center justify-between rounded-[16px] border border-[#e7dfd4] bg-[#fffaf4] px-3 py-3">
                  <View className="flex-row items-center gap-2">
                    <View className="h-9 w-9 items-center justify-center rounded-[10px] bg-[#e6d5be]">
                      <MaterialIcons name={idx === 0 ? 'add' : 'arrow-downward'} size={18} color="#234d42" />
                    </View>
                    <Text className="text-[12px] font-semibold text-[#1d312c]">{label}</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={18} color="#5d736d" />
                </View>
              ))}
            </View>
          </View>

          <View className="mt-5 rounded-[20px] bg-[#f7f3ee] p-3">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-[13px] font-semibold text-[#1d312c]">History</Text>
              <Text className="text-[11px] text-[#5d736d]">All</Text>
            </View>
            {[
              ['Food Court', '-12.50 QI', 'Today · 10:21 AM'],
              ['Bookshop', '-8.20 QI', 'Today · 9:02 AM'],
              ['Water Vendor', '-1.30 QI', 'Yesterday · 4:45 PM'],
              ['Received from John', '+20.00 QI', 'Yesterday · 11:11 AM'],
            ].map(([title, amount, time]) => (
              <View key={title} className="mt-2 flex-row items-center justify-between rounded-[14px] border border-[#e7dfd4] bg-[#fffaf4] px-3 py-2.5">
                <View>
                  <Text className="text-[12px] font-semibold text-[#1d312c]">{title}</Text>
                  <Text className="text-[10px] text-[#60736d]">{time}</Text>
                </View>
                <Text className="text-[12px] font-semibold text-[#234d42]">{amount}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="h-[760px] w-[46%] min-w-[180px] overflow-hidden rounded-[34px] border border-[#e7ddd0] bg-[#f5f0ea] p-3 shadow-[0_18px_30px_rgba(33,28,24,0.08)]">
      <View className="flex-1 overflow-hidden rounded-[30px] bg-[#f1efe9] p-4">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#141414] opacity-80">9:41</Text>
          <View className="flex-row items-center gap-1">
            <View className="h-2.5 w-2.5 rounded-full bg-[#1c1c1c] opacity-80" />
            <View className="h-2.5 w-2.5 rounded-full bg-[#1c1c1c] opacity-60" />
            <View className="h-2.5 w-2.5 rounded-full bg-[#1c1c1c] opacity-40" />
          </View>
        </View>

        <View className="rounded-[22px] bg-[#234e45] p-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-[11px] uppercase tracking-[0.25em] text-[#dfeee6]">Profile</Text>
              <Text className="mt-3 text-[24px] font-semibold text-white">Promise Obi</Text>
              <Text className="mt-1 text-[11px] text-[#dfeee6]">0x7a3F...9c21</Text>
            </View>
            <View className="h-14 w-14 rounded-full bg-[#d0a77d]" />
          </View>
        </View>

        <View className="mt-5 rounded-[20px] bg-[#f7f3ee] p-3">
          {['Personal Information', 'Security', 'Connected Accounts', 'Help & Support', 'About QiPay'].map((label, idx) => (
            <View key={label} className="mt-2 flex-row items-center justify-between rounded-[14px] border border-[#e7dfd4] bg-[#fffaf4] px-3 py-3">
              <View className="flex-row items-center gap-2">
                <View className="h-8 w-8 items-center justify-center rounded-[9px] bg-[#e5d4ba]">
                  <MaterialIcons name={idx === 0 ? 'person' : idx === 1 ? 'lock' : idx === 2 ? 'link' : idx === 3 ? 'help-outline' : 'info'} size={16} color="#234d42" />
                </View>
                <Text className="text-[12px] font-semibold text-[#1d312c]">{label}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={18} color="#5d736d" />
            </View>
          ))}
        </View>

        <View className="mt-5 rounded-[18px] bg-[#f8f4ef] p-4">
          <Text className="text-[12px] font-semibold text-[#1d312c]">Need help?</Text>
          <Text className="mt-1 text-[10px] text-[#5d736d]">Reach support anytime if you have questions about your account or payments.</Text>
        </View>

        <View className="mt-6 rounded-[16px] bg-[#234e45] px-4 py-3">
          <Text className="text-center text-[12px] font-semibold text-white">Log Out</Text>
        </View>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  return (
    <View className="flex-1 bg-[#f3efe7]">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="px-2 pb-8 pt-4">
        <View className="flex-row flex-wrap justify-between gap-y-4">
          {screenVariants.map((variant) => (
            <PhoneMockup key={variant} variant={variant} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
