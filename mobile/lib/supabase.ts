// react-native-url-polyfill must be imported before @supabase/supabase-js so
// that URL/URLSearchParams exist in the Hermes runtime (RN has no native URL).
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import type { Database } from '../types/db';

// Only EXPO_PUBLIC_* vars are inlined into the client bundle by Expo. Never put
// service-role or other secrets here — the publishable (anon) key is safe to ship.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase config. Add EXPO_PUBLIC_SUPABASE_URL and ' +
      'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY to mobile/.env (see .env.example).'
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    // Persist the session in AsyncStorage so the anonymous user (and any future
    // real login) survives app restarts.
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // No URL-based session detection on native — that's a web-OAuth concern.
    detectSessionInUrl: false,
  },
});
