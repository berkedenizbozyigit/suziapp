import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '../components/ui';
import { colors, space } from '../theme/tokens';

/** Branded "not built yet" screen so empty tabs still feel like Suzi. */
function ComingSoon({ title, icon }: { title: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text variant="title">{title}</Text>
      </View>
      <View style={styles.center}>
        <Ionicons name={icon} size={40} color={colors.textFaint} />
        <Text variant="body" color={colors.textMuted} align="center">
          Coming soon
        </Text>
      </View>
    </SafeAreaView>
  );
}

export function AskSuziScreen() {
  return <ComingSoon title="Ask Suzi" icon="chatbubble-outline" />;
}
export function WindowShopScreen() {
  return <ComingSoon title="Window Shop" icon="grid-outline" />;
}
export function ProfileScreen() {
  return <ComingSoon title="Profile" icon="person-outline" />;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  header: { paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md },
});
