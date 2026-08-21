import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function ScanTab() {
  const router = useRouter();

  useEffect(() => {
    // The center tab opens the Scan-to-Pay screen as a modal-like flow.
    router.replace('/explore');
  }, [router]);

  return null;
}
