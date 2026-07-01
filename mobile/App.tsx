// react-native-gesture-handler MUST be the first import in the entry component
// so its native handlers register before anything renders.
import 'react-native-gesture-handler';

import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { Text } from './components/ui';
import { ensureSession } from './lib/auth';
import { Tabs } from './navigation/Tabs';
import { FolderDetailScreen } from './screens/FolderDetailScreen';
import { SwipeScreen } from './screens/SwipeScreen';
import type { RootStackParamList } from './navigation/types';
import { colors } from './theme/tokens';
import { useSuziFonts } from './theme/useSuziFonts';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const fontsLoaded = useSuziFonts();
  const [authError, setAuthError] = useState<string | null>(null);

  // Bootstrap a session at launch so RLS (auth.uid()) lets saves work. If
  // anonymous sign-in is disabled, surface the message as a banner.
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

  // Hold a cream splash until the brand typefaces are ready (avoids a flash of
  // the system font on first paint).
  if (!fontsLoaded) {
    return <View style={[styles.root, styles.splash]} />;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Tabs" component={Tabs} />
            <Stack.Screen
              name="FolderDetail"
              component={FolderDetailScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="Swipe"
              component={SwipeScreen}
              options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
            />
          </Stack.Navigator>
        </NavigationContainer>

        {authError ? (
          <View style={styles.banner} pointerEvents="none">
            <Text variant="bodySm" color={colors.white}>
              {authError}
            </Text>
          </View>
        ) : null}
      </SafeAreaProvider>
      <StatusBar style="dark" />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  splash: { backgroundColor: colors.cream },
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.redDark,
    paddingTop: 56,
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
});
