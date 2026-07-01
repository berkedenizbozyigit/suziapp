import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { getIsAnonymous } from '../lib/auth';
import { shouldPromptUpgrade } from '../lib/authGate';
import { supabase } from '../lib/supabase';
import { UpgradeSheet } from './UpgradeSheet';

const DISMISS_KEY = 'suzi.upgrade.dismissedAt';

type AuthContextValue = {
  /** null = not yet known; true = anonymous; false = permanent account. */
  isAnonymous: boolean | null;
  /**
   * Try to show the upgrade nudge. Respects the dismiss cooldown unless
   * `force` is set (an explicit user action, e.g. Profile → "Create account").
   * No-ops if the user is already permanent.
   */
  promptUpgrade: (opts?: { force?: boolean }) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAnonymous, setIsAnonymous] = useState<boolean | null>(null);
  const [visible, setVisible] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setIsAnonymous(await getIsAnonymous());
    } catch {
      // Keep the previous value on a transient error.
    }
  }, []);

  useEffect(() => {
    void refresh();
    // Re-read on any auth change (anon bootstrap completing, upgrade finishing).
    const { data } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });
    return () => data.subscription.unsubscribe();
  }, [refresh]);

  const promptUpgrade = useCallback(
    async (opts?: { force?: boolean }) => {
      if (isAnonymous !== true) return; // already permanent, or not yet known
      if (!opts?.force) {
        const raw = await AsyncStorage.getItem(DISMISS_KEY);
        const lastDismissedAt = raw ? Number(raw) : null;
        if (!shouldPromptUpgrade({ isAnonymous: true, lastDismissedAt, now: Date.now() })) return;
      }
      setVisible(true);
    },
    [isAnonymous],
  );

  const handleDismiss = useCallback(async () => {
    await AsyncStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  }, []);

  const handleUpgraded = useCallback(async () => {
    setVisible(false);
    await refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ isAnonymous, promptUpgrade }}>
      {children}
      <UpgradeSheet visible={visible} onDismiss={handleDismiss} onUpgraded={handleUpgraded} />
    </AuthContext.Provider>
  );
}
