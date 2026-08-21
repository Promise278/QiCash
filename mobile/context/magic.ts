import { Magic } from '@magic-sdk/react-native-expo';
import { Platform } from 'react-native';

const MAGIC_API_KEY = process.env.EXPO_PUBLIC_MAGIC_API_KEY || 'pk_live_XXXXXXXXXXXXXXXXXXXXXXXX';

let magic: Magic | null = null;

/**
 * Avoid creating Magic while Expo Router is statically rendering the web app.
 * The SDK accesses `window` during construction, which is only available in a
 * browser (or the React Native client runtime).
 */
export function getMagic() {
  if (Platform.OS === 'web' && typeof window === 'undefined') {
    return null;
  }

  if (!magic) {
    magic = new Magic(MAGIC_API_KEY);
  }

  return magic;
}
