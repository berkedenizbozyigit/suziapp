// react-native-gesture-handler MUST be the first import in the entry component
// so its native handlers register before anything renders.
import 'react-native-gesture-handler';

import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { ensureSession } from './lib/auth';
import { DiscoverScreen } from './screens/DiscoverScreen';
import { SavedScreen } from './screens/SavedScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  const [authError, setAuthError] = useState<string | null>(null);

  // Bootstrap a session at launch so RLS (auth.uid()) lets saves work. If
  // anonymous sign-in is disabled, ensureSession returns a clear message which
  // we surface as a banner (and log to the console).
  useEffect(() => {
    let active = true;
    void (async () => {
      const result = await ensureSession();
      if (active && !result.ok) setAuthError(result.message);
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Tab.Navigator screenOptions={{ headerShown: false }}>
            <Tab.Screen name="Discover" component={DiscoverScreen} />
            <Tab.Screen name="Saved" component={SavedScreen} />
          </Tab.Navigator>
        </NavigationContainer>

        {authError ? (
          <View style={styles.banner} pointerEvents="none">
            <Text style={styles.bannerText}>{authError}</Text>
          </View>
        ) : null}
      </SafeAreaProvider>
      <StatusBar style="dark" />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#b00020',
    paddingTop: 56,
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  bannerText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
