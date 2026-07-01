import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Text } from '../components/ui';
import { composeSuziReply, queryForSuziMessage, type ThreadTurn } from '../lib/askSuzi';
import { fetchThread, sendMessage } from '../lib/messages';
import type { RootStackParamList } from '../navigation/types';
import { colors, fonts, radii, space } from '../theme/tokens';
import type { Message } from '../types/db';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Status = 'loading' | 'error' | 'ready';

const SUGGESTIONS = ['Summer linen dress', 'Tailored work blazer', 'White leather sneakers'];

/** Ask Suzi — a persisted chat (global thread) where each message becomes a
 *  swipeable search. No LLM backend: Suzi acknowledges and hands you a deck. */
export function AskSuziScreen() {
  const navigation = useNavigation<Nav>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setErrorMsg(null);
    try {
      setMessages(await fetchThread(null));
      setStatus('ready');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Couldn't load your chat.");
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || sending) return;
      setInput('');
      setSending(true);
      setBanner(null);
      try {
        const userMsg = await sendMessage('user', text, null);
        const suziMsg = await sendMessage('suzi', composeSuziReply(text).text, null);
        setMessages((prev) => [...prev, userMsg, suziMsg]);
      } catch (e) {
        setInput(text); // restore so the user can retry
        setBanner(e instanceof Error ? e.message : "Couldn't send. Try again.");
      } finally {
        setSending(false);
      }
    },
    [sending],
  );

  const turns: ThreadTurn[] = messages.map((m) => ({ role: m.role, content: m.content }));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text variant="title">Ask Suzi</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        {status === 'loading' ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.red} />
          </View>
        ) : status === 'error' ? (
          <View style={styles.center}>
            <Text variant="titleSm">Something went wrong</Text>
            <Text variant="bodySm" color={colors.textMuted} align="center">
              {errorMsg}
            </Text>
            <Button label="Try again" onPress={() => void load()} />
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={styles.thread}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Intro bubble (not persisted) */}
            <Bubble role="suzi">Hi, I'm Suzi. Tell me what you're shopping for and I'll find it.</Bubble>

            {messages.length === 0 ? (
              <View style={styles.chips}>
                {SUGGESTIONS.map((s) => (
                  <Pressable key={s} style={styles.chip} onPress={() => void send(s)} accessibilityRole="button">
                    <Text variant="bodySm" color={colors.red}>
                      {s}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {messages.map((m, i) => {
              const query = queryForSuziMessage(turns, i);
              return (
                <View key={m.id}>
                  <Bubble role={m.role}>{m.content ?? ''}</Bubble>
                  {query ? (
                    <Pressable
                      style={styles.swipeCta}
                      onPress={() => navigation.navigate('Swipe', { query })}
                      accessibilityRole="button"
                    >
                      <Ionicons name="albums-outline" size={16} color={colors.white} />
                      <Text variant="bodySm" color={colors.white}>
                        Swipe these
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </ScrollView>
        )}

        {banner ? (
          <Text variant="bodySm" color={colors.red} style={styles.banner}>
            {banner}
          </Text>
        ) : null}

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Tell Suzi what you need…"
            placeholderTextColor={colors.textFaint}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => void send(input)}
            returnKeyType="send"
            editable={!sending}
          />
          <Pressable
            style={[styles.send, sending ? styles.sendDisabled : null]}
            onPress={() => void send(input)}
            disabled={sending}
            accessibilityRole="button"
            accessibilityLabel="Send"
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Ionicons name="arrow-up" size={20} color={colors.white} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Bubble({ role, children }: { role: 'user' | 'suzi'; children: React.ReactNode }) {
  const isUser = role === 'user';
  return (
    <View style={[styles.bubble, isUser ? styles.userBubble : styles.suziBubble]}>
      <Text variant="body" color={isUser ? colors.white : colors.ink}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  flex: { flex: 1 },
  header: { paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, paddingHorizontal: space.xxl },
  thread: { paddingHorizontal: space.lg, paddingBottom: space.lg, gap: space.sm },
  bubble: { maxWidth: '82%', paddingVertical: space.sm, paddingHorizontal: space.md, borderRadius: radii.lg },
  userBubble: { alignSelf: 'flex-end', backgroundColor: colors.ink, borderBottomRightRadius: radii.sm },
  suziBubble: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderBottomLeftRadius: radii.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.xs },
  chip: {
    paddingVertical: space.xs,
    paddingHorizontal: space.md,
    borderRadius: radii.pill,
    backgroundColor: colors.redSoft,
  },
  swipeCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    alignSelf: 'flex-start',
    marginTop: space.xs,
    paddingVertical: space.xs,
    paddingHorizontal: space.md,
    borderRadius: radii.pill,
    backgroundColor: colors.red,
  },
  banner: { paddingHorizontal: space.lg, paddingBottom: space.xs },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.paper,
  },
  input: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingHorizontal: space.lg,
    height: 48,
  },
  send: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.6 },
});
