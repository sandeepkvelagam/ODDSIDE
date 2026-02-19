import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  ImageBackground,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";
import { useLanguage } from "../context/LanguageContext";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, ANIMATION } from "../styles/liquidGlass";
import { GlassInput, GlassButton, KvittLogo } from "../components/ui";
import { Ionicons } from "@expo/vector-icons";

// Poker suit SVG pattern background
const SUIT_PATTERN = `data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Ctext x='50%25' y='50%25' font-size='16' fill='%23ffffff' text-anchor='middle' dominant-baseline='middle'%3E%E2%99%A0%3C/text%3E%3C/svg%3E`;

export default function LoginScreen() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(1)).current;

  const switchMode = (toSignUp: boolean) => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
    
    setTimeout(() => {
      setIsSignUp(toSignUp);
      setError(null);
    }, 150);
  };

  async function handleAuth() {
    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              name: email.split("@")[0],
            },
          },
        });
        if (error) throw error;
        Alert.alert(
          "Account Created",
          "Please check your email to confirm your account, then sign in."
        );
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      let message = err.message || "An unexpected error occurred";
      
      if (message.includes("Invalid login credentials")) {
        message = "Invalid email or password. Please try again.";
      } else if (message.includes("Email not confirmed")) {
        message = "Please confirm your email address before signing in.";
      } else if (message.includes("User already registered")) {
        message = "An account with this email already exists. Please sign in.";
      }
      
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) throw error;
      setResetSent(true);
    } catch (err: any) {
      setError(err.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  }

  // Forgot Password View
  if (showForgot) {
    return (
      <View style={styles.container}>
        {/* Background Pattern */}
        <View style={styles.patternOverlay} />
        
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            style={styles.keyboardView}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Back Button */}
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => {
                  setShowForgot(false);
                  setResetSent(false);
                  setError(null);
                }}
              >
                <Ionicons name="chevron-back" size={18} color={COLORS.text.primary} />
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>

              {/* Icon */}
              <View style={styles.iconContainer}>
                <Text style={styles.iconEmoji}>✉️</Text>
              </View>

              {/* Title */}
              <Text style={styles.title}>Reset Your Password</Text>
              <Text style={styles.subtitle}>
                Enter your email and we'll send you a link to reset your password.
              </Text>

              {/* Error */}
              {error && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={16} color={COLORS.status.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {resetSent ? (
                <View style={styles.successContainer}>
                  <Text style={styles.successText}>✓ Reset link sent!</Text>
                  <Text style={styles.successSubtext}>
                    Check your email for the password reset link.
                  </Text>
                </View>
              ) : (
                <View style={styles.form}>
                  <GlassInput
                    label="Email"
                    placeholder="you@example.com"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      setError(null);
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    editable={!loading}
                  />

                  <GlassButton
                    variant="ghost"
                    size="large"
                    fullWidth
                    onPress={handleForgotPassword}
                    loading={loading}
                    style={styles.submitButton}
                    textStyle={{ color: COLORS.text.inverse }}
                  >
                    Send Reset Link
                  </GlassButton>
                </View>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    );
  }

  // Main Login View
  return (
    <View style={styles.container}>
      {/* Background Pattern */}
      <View style={styles.patternOverlay} />
      
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={[styles.formContainer, { opacity: fadeAnim }]}>
              {/* Logo */}
              <View style={styles.logoContainer}>
                <KvittLogo size="large" showTagline />
              </View>

              {/* Title */}
              <Text style={styles.title}>
                {isSignUp ? "Create Account" : "Welcome back"}
              </Text>
              <Text style={styles.subtitle}>
                {isSignUp
                  ? "Sign up to start tracking your poker games"
                  : "Sign in to your Kvitt account"}
              </Text>

              {/* Error */}
              {error && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={16} color={COLORS.status.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Form */}
              <View style={styles.form}>
                <GlassInput
                  label="Email"
                  placeholder="you@example.com"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setError(null);
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  editable={!loading}
                  error={error?.includes("email") ? "" : undefined}
                />

                <GlassInput
                  label="Password"
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setError(null);
                  }}
                  secureTextEntry={!showPassword}
                  textContentType={isSignUp ? "newPassword" : "password"}
                  editable={!loading}
                  rightIcon={
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={COLORS.text.muted}
                    />
                  }
                  onRightIconPress={() => setShowPassword(!showPassword)}
                />

                {!isSignUp && (
                  <TouchableOpacity
                    style={styles.forgotButton}
                    onPress={() => setShowForgot(true)}
                  >
                    <Text style={styles.forgotText}>Forgot password?</Text>
                  </TouchableOpacity>
                )}

                <GlassButton
                  variant="ghost"
                  size="large"
                  fullWidth
                  onPress={handleAuth}
                  loading={loading}
                  style={styles.submitButton}
                  textStyle={{ color: COLORS.text.inverse }}
                  testID="auth-submit-btn"
                >
                  {isSignUp ? "Create Account" : "Sign In"}
                </GlassButton>
              </View>

              {/* Switch Mode */}
              <TouchableOpacity
                style={styles.switchButton}
                onPress={() => switchMode(!isSignUp)}
                disabled={loading}
              >
                <Text style={styles.switchText}>
                  {isSignUp
                    ? "Already have an account? "
                    : "Don't have an account? "}
                  <Text style={styles.switchTextAccent}>
                    {isSignUp ? "Sign In" : "Sign Up"}
                  </Text>
                </Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                By signing in, you agree to our Terms and Privacy Policy.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.deepBlack,
  },
  patternOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.05,
    // Recreating the poker suit pattern effect
    // In production, use an actual SVG/Image
    backgroundColor: COLORS.deepBlack,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.container,
    justifyContent: "center",
  },
  formContainer: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: SPACING.xxl,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: SPACING.lg,
    marginTop: SPACING.xxl,
  },
  iconEmoji: {
    fontSize: 48,
  },
  title: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.sizes.heading2,
    fontWeight: TYPOGRAPHY.weights.bold,
    textAlign: "center",
    marginBottom: SPACING.sm,
  },
  subtitle: {
    color: COLORS.text.muted,
    fontSize: TYPOGRAPHY.sizes.body,
    textAlign: "center",
    marginBottom: SPACING.xxl,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  errorText: {
    color: COLORS.status.danger,
    fontSize: TYPOGRAPHY.sizes.bodySmall,
    flex: 1,
  },
  successContainer: {
    alignItems: "center",
    paddingVertical: SPACING.xxl,
  },
  successText: {
    color: COLORS.status.success,
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: TYPOGRAPHY.weights.semiBold,
    marginBottom: SPACING.sm,
  },
  successSubtext: {
    color: COLORS.text.muted,
    fontSize: TYPOGRAPHY.sizes.bodySmall,
    textAlign: "center",
  },
  form: {
    gap: SPACING.lg,
  },
  forgotButton: {
    alignSelf: "center",
    paddingVertical: SPACING.xs,
  },
  forgotText: {
    color: COLORS.text.muted,
    fontSize: TYPOGRAPHY.sizes.bodySmall,
  },
  submitButton: {
    backgroundColor: "#FFFFFF",
    marginTop: SPACING.sm,
  },
  switchButton: {
    alignItems: "center",
    paddingVertical: SPACING.lg,
    marginTop: SPACING.md,
  },
  switchText: {
    color: COLORS.text.muted,
    fontSize: TYPOGRAPHY.sizes.bodySmall,
  },
  switchTextAccent: {
    color: COLORS.orange,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.charcoal,
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    alignSelf: "flex-start",
    marginBottom: SPACING.lg,
    gap: SPACING.xs,
  },
  backButtonText: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.sizes.bodySmall,
  },
  footer: {
    marginTop: SPACING.xxl,
    paddingTop: SPACING.xl,
  },
  footerText: {
    color: COLORS.text.muted,
    fontSize: TYPOGRAPHY.sizes.caption,
    textAlign: "center",
  },
});
