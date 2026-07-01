import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { startEmailUpgrade, verifyEmailUpgrade } from '../lib/auth';
import { isValidEmail } from '../lib/authGate';
import { colors, fonts, radii, space } from '../theme/tokens';
import { Button, Text } from './ui';

type Props = {
  visible: boolean;
  /** User tapped "Not now" / backdrop. */
  onDismiss: () => void;
  /** Upgrade verified — the session is now permanent. */
  onUpgraded: () => void;
};

type Step = 'email' | 'code';

/** Soft account-upgrade sheet: attach an email to the anonymous user via a
 *  6-digit code. Same user id, so nothing they've saved is lost. */
export function UpgradeSheet({ visible, onDismiss, onUpgraded }: Props) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setStep('email');
    setEmail('');
    setCode('');
    setBusy(false);
    setError(null);
  };

  const dismiss = () => {
    reset();
    onDismiss();
  };

  const sendCode = async () => {
    if (busy) return;
    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await startEmailUpgrade(email);
      setStep('code');
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send the code. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (busy) return;
    if (code.trim().length < 6) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await verifyEmailUpgrade(email, code);
      reset();
      onUpgraded();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That code didn't work. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={dismiss}>
      <Pressable style={styles.backdrop} onPress={dismiss} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetWrap}
      >
        <View style={styles.sheet}>
          <View style={styles.grip} />
          <View style={styles.iconWrap}>
            <Ionicons name="heart" size={24} color={colors.red} />
          </View>

          {step === 'email' ? (
            <>
              <Text variant="titleSm" align="center">
                Keep your picks
              </Text>
              <Text variant="bodySm" color={colors.textMuted} align="center" style={styles.sub}>
                Add your email so your saves, folders, and alerts follow you to any device. No password.
              </Text>
              <TextInput
                style={styles.input}
                placeholder="you@email.com"
                placeholderTextColor={colors.textFaint}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                returnKeyType="send"
                onSubmitEditing={() => void sendCode()}
                editable={!busy}
              />
              {error ? (
                <Text variant="bodySm" color={colors.red} align="center">
                  {error}
                </Text>
              ) : null}
              <Button label="Email me a code" full loading={busy} onPress={() => void sendCode()} />
            </>
          ) : (
            <>
              <Text variant="titleSm" align="center">
                Enter your code
              </Text>
              <Text variant="bodySm" color={colors.textMuted} align="center" style={styles.sub}>
                We sent a 6-digit code to {email}.
              </Text>
              <TextInput
                style={[styles.input, styles.codeInput]}
                placeholder="123456"
                placeholderTextColor={colors.textFaint}
                value={code}
                onChangeText={(t) => setCode(t.replace(/[^0-9]/g, '').slice(0, 6))}
                keyboardType="number-pad"
                returnKeyType="done"
                onSubmitEditing={() => void verify()}
                editable={!busy}
                maxLength={6}
              />
              {error ? (
                <Text variant="bodySm" color={colors.red} align="center">
                  {error}
                </Text>
              ) : null}
              <Button label="Verify & save" full loading={busy} onPress={() => void verify()} />
              <Pressable onPress={() => setStep('email')} disabled={busy} accessibilityRole="button">
                <Text variant="bodySm" color={colors.textMuted} align="center" style={styles.link}>
                  Use a different email
                </Text>
              </Pressable>
            </>
          )}

          <Pressable onPress={dismiss} disabled={busy} accessibilityRole="button">
            <Text variant="bodySm" color={colors.textFaint} align="center" style={styles.notNow}>
              Not now
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(14,14,14,0.45)',
  },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    paddingBottom: space.xxxl,
    gap: space.md,
  },
  grip: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: space.sm,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    backgroundColor: colors.redSoft,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  sub: { marginBottom: space.xs },
  input: {
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: space.lg,
    height: 52,
  },
  codeInput: { textAlign: 'center', letterSpacing: 8, fontFamily: fonts.sansBold, fontSize: 22 },
  link: { marginTop: space.xs },
  notNow: { marginTop: space.xs },
});
