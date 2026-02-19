import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Animated,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Clipboard,
  Linking,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, ANIMATION } from "../styles/liquidGlass";
import { BottomSheetScreen } from "../components/BottomSheetScreen";
import { useTheme } from "../context/ThemeContext";
import { QRCodeDisplay } from "../components/ui/QRCodeDisplay";
import { QRCodeScanner } from "../components/ui/QRCodeScanner";
const { width: SCREEN_WIDTH } = Dimensions.get("window");

type WalletData = {
  wallet_id: string | null;
  user_id: string;
  balance_cents: number;
  balance: number;
  currency: string;
  status: string;
  has_pin: boolean;
  daily_transfer_limit_cents?: number;
  per_transaction_limit_cents?: number;
  daily_transferred_cents?: number;
};

type Transaction = {
  transaction_id: string;
  type: string;
  amount_cents: number;
  description: string;
  created_at: string;
  counterparty?: { name?: string; wallet_id?: string };
};

type SetupStep = "intro" | "creating" | "pin_setup" | "done";

const DEPOSIT_AMOUNTS = [
  { label: "$10", cents: 1000 },
  { label: "$25", cents: 2500 },
  { label: "$50", cents: 5000 },
  { label: "$100", cents: 10000 },
];

export function WalletScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { isDark, colors } = useTheme();

  // Theme-aware colors - use light theme colors when not in dark mode
  const tc = isDark ? {
    bg: COLORS.jetDark,
    surface: COLORS.jetSurface,
    textPrimary: COLORS.text.primary,
    textSecondary: COLORS.text.secondary,
    textMuted: COLORS.text.muted,
    glassBg: COLORS.glass.bg,
    glassBorder: COLORS.glass.border,
  } : {
    bg: colors.contentBg,
    surface: colors.surface,
    textPrimary: colors.textPrimary,
    textSecondary: colors.textSecondary,
    textMuted: colors.textMuted,
    glassBg: "rgba(0, 0, 0, 0.04)",
    glassBorder: "rgba(0, 0, 0, 0.08)",
  };

  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Setup flow
  const [setupStep, setSetupStep] = useState<SetupStep>("intro");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [settingUpPin, setSettingUpPin] = useState(false);

  // Send modal
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendStep, setSendStep] = useState<"search" | "scanner" | "amount" | "pin" | "done">("search");
  const [recipientSearch, setRecipientSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<any>(null);
  const [sendAmount, setSendAmount] = useState("");
  const [sendPin, setSendPin] = useState("");
  const [sendNote, setSendNote] = useState("");
  const [sending, setSending] = useState(false);

  // Receive modal
  const [showReceiveModal, setShowReceiveModal] = useState(false);

  // Deposit modal
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositStep, setDepositStep] = useState<"amount" | "processing" | "polling" | "success" | "failed">("amount");
  const [selectedDepositCents, setSelectedDepositCents] = useState<number>(2500);
  const [customDepositAmount, setCustomDepositAmount] = useState("");
  const [depositSessionId, setDepositSessionId] = useState<string | null>(null);
  const [initiatingDeposit, setInitiatingDeposit] = useState(false);
  const depositPollInterval = useRef<NodeJS.Timeout | null>(null);

  // Withdraw modal
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState<"bank_transfer" | "venmo">("bank_transfer");
  const [withdrawDestination, setWithdrawDestination] = useState("");
  const [withdrawPin, setWithdrawPin] = useState("");
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, ...ANIMATION.spring.bouncy }),
    ]).start();
  }, []);

  const fetchWallet = useCallback(async () => {
    try {
      const res = await api.get("/wallet");
      setWallet(res.data);
      if (res.data?.wallet_id) {
        const txRes = await api.get("/wallet/transactions?limit=15");
        setTransactions(txRes.data?.transactions || []);
      }
    } catch (e) {
      console.error("Failed to fetch wallet:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchWallet(); }, [fetchWallet]);

  // Cleanup deposit polling on unmount
  useEffect(() => {
    return () => {
      if (depositPollInterval.current) clearInterval(depositPollInterval.current);
    };
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchWallet();
    setRefreshing(false);
  }, [fetchWallet]);

  // Create wallet
  const handleCreateWallet = async () => {
    setSetupStep("creating");
    try {
      await api.post("/wallet/setup");
      await fetchWallet();
      setSetupStep("pin_setup");
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.detail || "Failed to create wallet");
      setSetupStep("intro");
    }
  };

  // Set PIN
  const handleSetPin = async () => {
    if (pin.length < 4 || pin.length > 6) {
      Alert.alert("Invalid PIN", "PIN must be 4-6 digits");
      return;
    }
    if (pin !== confirmPin) {
      Alert.alert("PIN Mismatch", "PINs do not match. Please try again.");
      setPin("");
      setConfirmPin("");
      return;
    }
    setSettingUpPin(true);
    try {
      await api.post("/wallet/pin/set", { pin });
      await fetchWallet();
      setSetupStep("done");
      setTimeout(() => setSetupStep("intro"), 2000);
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.detail || "Failed to set PIN");
    } finally {
      setSettingUpPin(false);
    }
  };

  // Search recipients
  const handleSearch = useCallback(async (q: string) => {
    setRecipientSearch(q);
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await api.get(`/wallet/search?q=${encodeURIComponent(q)}`);
      setSearchResults(res.data?.results || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  // Handle QR scan result
  const handleQRScanResult = (walletId: string) => {
    // Look up the wallet
    api.get(`/wallet/lookup/${walletId}`)
      .then((res) => {
        setSelectedRecipient(res.data);
        setSendStep("amount");
      })
      .catch(() => {
        // Fallback: set wallet_id manually
        setSelectedRecipient({ wallet_id: walletId, display_name: walletId });
        setSendStep("amount");
      });
  };

  // Execute transfer
  const handleSend = async () => {
    const amountCents = Math.round(parseFloat(sendAmount) * 100);
    if (!selectedRecipient || isNaN(amountCents) || amountCents <= 0) return;

    setSending(true);
    try {
      await api.post("/wallet/transfer", {
        to_wallet_id: selectedRecipient.wallet_id,
        amount_cents: amountCents,
        note: sendNote || undefined,
        pin: sendPin,
        idempotency_key: `${Date.now()}-${selectedRecipient.wallet_id}`,
        risk_acknowledged: amountCents > 10000,
      });
      setSendStep("done");
      await fetchWallet();
      setTimeout(() => {
        setShowSendModal(false);
        resetSendModal();
      }, 2500);
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      const msg = typeof detail === "object" ? detail?.message || "Transfer failed" : detail || "Please check your PIN and try again";
      Alert.alert("Transfer Failed", msg);
    } finally {
      setSending(false);
    }
  };

  const resetSendModal = () => {
    setSendStep("search");
    setRecipientSearch("");
    setSearchResults([]);
    setSelectedRecipient(null);
    setSendAmount("");
    setSendPin("");
    setSendNote("");
  };

  // Deposit flow
  const getEffectiveDepositCents = () => {
    if (customDepositAmount && parseFloat(customDepositAmount) > 0) {
      return Math.round(parseFloat(customDepositAmount) * 100);
    }
    return selectedDepositCents;
  };

  const handleInitiateDeposit = async () => {
    const amountCents = getEffectiveDepositCents();
    if (amountCents < 500 || amountCents > 100000) {
      Alert.alert("Invalid Amount", "Deposit must be between $5 and $1,000");
      return;
    }
    setInitiatingDeposit(true);
    setDepositStep("processing");
    try {
      // Get origin URL from REACT_APP_BACKEND_URL environment
      const originUrl = process.env.REACT_APP_BACKEND_URL || "https://kvitt.app";
      const res = await api.post("/wallet/deposit", {
        amount_cents: amountCents,
        origin_url: "kvitt://wallet",
      });
      const { checkout_url, session_id } = res.data;
      setDepositSessionId(session_id);

      // Open Stripe checkout in browser
      await Linking.openURL(checkout_url);
      setDepositStep("polling");

      // Start polling for status
      let attempts = 0;
      depositPollInterval.current = setInterval(async () => {
        attempts++;
        try {
          const statusRes = await api.get(`/wallet/deposit/status/${session_id}`);
          const status = statusRes.data?.status;
          if (status === "completed") {
            if (depositPollInterval.current) clearInterval(depositPollInterval.current);
            setDepositStep("success");
            await fetchWallet();
            setTimeout(() => {
              setShowDepositModal(false);
              setDepositStep("amount");
            }, 3000);
          } else if (status === "expired" || status === "cancelled") {
            if (depositPollInterval.current) clearInterval(depositPollInterval.current);
            setDepositStep("failed");
          }
        } catch {}

        if (attempts >= 30) {
          if (depositPollInterval.current) clearInterval(depositPollInterval.current);
          setDepositStep("amount");
        }
      }, 5000);
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.detail || "Failed to initiate deposit");
      setDepositStep("amount");
    } finally {
      setInitiatingDeposit(false);
    }
  };

  // Withdraw
  const handleWithdraw = async () => {
    const amountCents = Math.round(parseFloat(withdrawAmount) * 100);
    if (isNaN(amountCents) || amountCents < 500) {
      Alert.alert("Invalid Amount", "Minimum withdrawal is $5.00");
      return;
    }
    if (!withdrawDestination.trim()) {
      Alert.alert("Required", "Please enter your destination account details");
      return;
    }
    setSubmittingWithdraw(true);
    try {
      const res = await api.post("/wallet/withdraw", {
        amount_cents: amountCents,
        method: withdrawMethod,
        destination_details: withdrawDestination,
        pin: withdrawPin,
      });
      setShowWithdrawModal(false);
      setWithdrawAmount("");
      setWithdrawDestination("");
      setWithdrawPin("");
      Alert.alert("Withdrawal Submitted", res.data?.message || "Your withdrawal request has been submitted and will be processed within 1-2 business days.");
      await fetchWallet();
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.detail || "Failed to submit withdrawal");
    } finally {
      setSubmittingWithdraw(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "transfer_out": return "arrow-up-circle";
      case "transfer_in": return "arrow-down-circle";
      case "deposit": return "add-circle";
      case "settlement_credit": return "checkmark-circle";
      default: return "swap-horizontal";
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case "transfer_out": return COLORS.status.danger;
      case "transfer_in": return COLORS.status.success;
      case "deposit": return COLORS.trustBlue;
      case "settlement_credit": return COLORS.status.success;
      default: return COLORS.moonstone;
    }
  };

  // Wallet setup flow
  if (!loading && (!wallet?.wallet_id || wallet?.status === "needs_setup")) {
    return (
      <BottomSheetScreen>
        <View style={[styles.container, { backgroundColor: tc.bg }]}>
          <View style={styles.header}>
            <TouchableOpacity style={[styles.closeBtn, { backgroundColor: tc.glassBg, borderColor: tc.glassBorder }]} onPress={() => navigation.goBack()}>
              <Ionicons name="close" size={22} color={tc.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: tc.textPrimary }]}>Kvitt Wallet</Text>
            <View style={{ width: 48 }} />
          </View>

          {setupStep === "creating" ? (
            <View style={styles.centeredContent}>
              <ActivityIndicator size="large" color={COLORS.orange} />
              <Text style={styles.setupSubtitle}>Creating your wallet...</Text>
            </View>
          ) : setupStep === "pin_setup" ? (
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.setupContainer}>
              <View style={styles.setupIcon}>
                <Ionicons name="lock-closed" size={40} color={COLORS.orange} />
              </View>
              <Text style={styles.setupTitle}>Set Your PIN</Text>
              <Text style={styles.setupSubtitle}>Create a 4-6 digit PIN to authorize transfers</Text>
              <TextInput
                style={styles.pinInput}
                value={pin}
                onChangeText={setPin}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={6}
                placeholder="Enter PIN (4-6 digits)"
                placeholderTextColor={COLORS.text.muted}
              />
              <TextInput
                style={styles.pinInput}
                value={confirmPin}
                onChangeText={setConfirmPin}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={6}
                placeholder="Confirm PIN"
                placeholderTextColor={COLORS.text.muted}
              />
              <TouchableOpacity
                style={[styles.primaryButton, (!pin || pin !== confirmPin || settingUpPin) && styles.buttonDisabled]}
                onPress={handleSetPin}
                disabled={!pin || pin !== confirmPin || settingUpPin}
              >
                {settingUpPin ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryButtonText}>Set PIN</Text>}
              </TouchableOpacity>
            </KeyboardAvoidingView>
          ) : setupStep === "done" ? (
            <View style={styles.centeredContent}>
              <Ionicons name="checkmark-circle" size={64} color={COLORS.status.success} />
              <Text style={styles.setupTitle}>Wallet Ready!</Text>
              <Text style={styles.setupSubtitle}>You can now send and receive money</Text>
            </View>
          ) : (
            <View style={styles.setupContainer}>
              <View style={styles.setupIcon}>
                <Ionicons name="wallet" size={40} color={COLORS.orange} />
              </View>
              <Text style={styles.setupTitle}>Kvitt Wallet</Text>
              <Text style={styles.setupSubtitle}>
                Send and receive poker settlements instantly. Your wallet comes with a unique ID and QR code for peer-to-peer transfers.
              </Text>
              <View style={styles.featureList}>
                {[
                  { icon: "qr-code-outline", color: COLORS.trustBlue, text: "QR code for instant transfers" },
                  { icon: "card-outline", color: COLORS.orange, text: "Deposit via Stripe" },
                  { icon: "lock-closed", color: "#A855F7", text: "PIN-protected security" },
                  { icon: "receipt", color: COLORS.status.success, text: "Full transaction history" },
                ].map((f, i) => (
                  <View key={i} style={styles.featureItem}>
                    <View style={[styles.featureIcon, { backgroundColor: f.color + "20" }]}>
                      <Ionicons name={f.icon as any} size={20} color={f.color} />
                    </View>
                    <Text style={styles.featureText}>{f.text}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity style={styles.primaryButton} onPress={handleCreateWallet}>
                <Ionicons name="add-circle-outline" size={20} color="#fff" />
                <Text style={styles.primaryButtonText}>Create Wallet</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </BottomSheetScreen>
    );
  }

  return (
    <BottomSheetScreen>
      <View style={[styles.container, { backgroundColor: tc.bg }]}>
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <TouchableOpacity style={[styles.closeBtn, { backgroundColor: tc.glassBg, borderColor: tc.glassBorder }]} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={22} color={tc.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: tc.textPrimary }]}>Kvitt Wallet</Text>
          <TouchableOpacity
            style={styles.copyBtn}
            onPress={() => {
              if (wallet?.wallet_id) {
                Clipboard.setString(wallet.wallet_id);
                Alert.alert("Copied!", `Wallet ID copied to clipboard`);
              }
            }}
          >
            <Ionicons name="copy-outline" size={18} color={tc.textMuted} />
          </TouchableOpacity>
        </Animated.View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.orange} />}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.orange} />
            </View>
          ) : (
            <>
              {/* Balance Card */}
              <Animated.View style={[styles.balanceCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                <View style={styles.balanceCardInner}>
                  <View style={styles.walletIdRow}>
                    <Ionicons name="wallet-outline" size={14} color={COLORS.moonstone} />
                    <Text style={styles.walletIdText}>{wallet?.wallet_id || "—"}</Text>
                  </View>
                  <Text style={styles.balanceLabel}>AVAILABLE BALANCE</Text>
                  <Text style={styles.balanceValue}>
                    ${((wallet?.balance_cents || 0) / 100).toFixed(2)}
                  </Text>
                  {wallet?.daily_transfer_limit_cents && (
                    <Text style={styles.limitText}>
                      Daily limit: ${(wallet.daily_transfer_limit_cents / 100).toFixed(0)} · Used: ${((wallet.daily_transferred_cents || 0) / 100).toFixed(0)}
                    </Text>
                  )}
                </View>
              </Animated.View>

              {/* Action Buttons */}
              <Animated.View style={[styles.actionsRow, { opacity: fadeAnim }]}>
                <TouchableOpacity style={[styles.actionButton, { backgroundColor: COLORS.trustBlue }]} onPress={() => setShowReceiveModal(true)} activeOpacity={0.8}>
                  <Ionicons name="arrow-down-circle-outline" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Receive</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, { backgroundColor: COLORS.orange }]} onPress={() => { setShowSendModal(true); setSendStep("search"); }} activeOpacity={0.8}>
                  <Ionicons name="arrow-up-circle-outline" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Send</Text>
                </TouchableOpacity>
              </Animated.View>

              {/* Deposit + Withdraw */}
              <Animated.View style={[styles.actionsRow, { opacity: fadeAnim }]}>
                <TouchableOpacity style={[styles.actionButtonSmall, { backgroundColor: COLORS.glass.bg, borderColor: COLORS.status.success + "60", borderWidth: 1 }]} onPress={() => setShowDepositModal(true)} activeOpacity={0.8}>
                  <Ionicons name="card-outline" size={18} color={COLORS.status.success} />
                  <Text style={[styles.actionButtonText, { color: COLORS.status.success, fontSize: 13 }]}>Deposit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionButtonSmall, { backgroundColor: COLORS.glass.bg, borderColor: COLORS.text.muted + "40", borderWidth: 1 }]} onPress={() => setShowWithdrawModal(true)} activeOpacity={0.8}>
                  <Ionicons name="arrow-down-outline" size={18} color={COLORS.text.muted} />
                  <Text style={[styles.actionButtonText, { color: COLORS.text.muted, fontSize: 13 }]}>Withdraw</Text>
                </TouchableOpacity>
              </Animated.View>

              {/* PIN warning */}
              {!wallet?.has_pin && (
                <View style={styles.pinWarning}>
                  <Ionicons name="warning-outline" size={16} color={COLORS.status.warning} />
                  <Text style={styles.pinWarningText}>Set a PIN to enable transfers</Text>
                  <TouchableOpacity onPress={() => setSetupStep("pin_setup")}>
                    <Text style={[styles.pinWarningText, { color: COLORS.orange, fontWeight: "600" }]}>Set PIN</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Transactions */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>RECENT TRANSACTIONS</Text>
              </View>

              {transactions.length === 0 ? (
                <View style={styles.emptyTx}>
                  <Ionicons name="receipt-outline" size={40} color={COLORS.text.muted} />
                  <Text style={styles.emptyTxText}>No transactions yet</Text>
                  <Text style={styles.emptyTxSub}>Deposit or receive money to get started</Text>
                </View>
              ) : (
                <View style={styles.txList}>
                  {transactions.map((tx, idx) => {
                    const isOut = tx.type === "transfer_out";
                    const color = getTransactionColor(tx.type);
                    return (
                      <View key={tx.transaction_id || idx} style={[styles.txItem, idx < transactions.length - 1 && styles.txItemBorder]}>
                        <View style={[styles.txIcon, { backgroundColor: color + "20" }]}>
                          <Ionicons name={getTransactionIcon(tx.type) as any} size={20} color={color} />
                        </View>
                        <View style={styles.txInfo}>
                          <Text style={styles.txDesc} numberOfLines={1}>
                            {tx.description || (tx.type === "transfer_out" ? `To ${tx.counterparty?.name || tx.counterparty?.wallet_id || "Wallet"}` : `From ${tx.counterparty?.name || "Wallet"}`)}
                          </Text>
                          <Text style={styles.txDate}>{formatDate(tx.created_at)}</Text>
                        </View>
                        <Text style={[styles.txAmount, { color }]}>
                          {isOut ? "-" : "+"}${(Math.abs(tx.amount_cents) / 100).toFixed(2)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
              <View style={{ height: 40 }} />
            </>
          )}
        </ScrollView>
      </View>

      {/* ====== RECEIVE MODAL with QR code ====== */}
      <Modal visible={showReceiveModal} animationType="slide" transparent onRequestClose={() => setShowReceiveModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowReceiveModal(false)} />
          <View style={[styles.sheetContainer, { backgroundColor: tc.surface }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Receive Money</Text>
            <Text style={styles.sheetSubtitle}>Show this QR code or share your Wallet ID</Text>

            {wallet?.wallet_id && (
              <View style={styles.qrSection}>
                <QRCodeDisplay
                  value={`kvitt://wallet/${wallet.wallet_id}`}
                  size={200}
                  label={`Wallet ID: ${wallet.wallet_id}`}
                />
              </View>
            )}

            <TouchableOpacity
              style={[styles.primaryButton, { marginTop: SPACING.lg }]}
              onPress={() => {
                if (wallet?.wallet_id) {
                  Clipboard.setString(wallet.wallet_id);
                  Alert.alert("Copied!", "Wallet ID copied to clipboard");
                }
              }}
            >
              <Ionicons name="copy-outline" size={18} color="#fff" />
              <Text style={styles.primaryButtonText}>Copy Wallet ID</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.ghostButton, { marginTop: SPACING.md }]} onPress={() => setShowReceiveModal(false)}>
              <Text style={styles.ghostButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ====== SEND MODAL with QR scanner ====== */}
      <Modal visible={showSendModal} animationType="slide" transparent onRequestClose={() => { setShowSendModal(false); resetSendModal(); }}>
        {sendStep === "scanner" ? (
          // Full-screen QR scanner
          <View style={{ flex: 1 }}>
            <QRCodeScanner
              onScan={handleQRScanResult}
              onCancel={() => setSendStep("search")}
            />
          </View>
        ) : (
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
            <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => { setShowSendModal(false); resetSendModal(); }} />
            <View style={[styles.sheetContainer, { backgroundColor: tc.surface }]}>
              <View style={styles.sheetHandle} />

              {sendStep === "done" ? (
                <View style={styles.centeredContent}>
                  <Ionicons name="checkmark-circle" size={64} color={COLORS.status.success} />
                  <Text style={styles.setupTitle}>Sent!</Text>
                  <Text style={styles.setupSubtitle}>${parseFloat(sendAmount || "0").toFixed(2)} sent to {selectedRecipient?.display_name}</Text>
                </View>
              ) : sendStep === "search" ? (
                <>
                  <Text style={styles.sheetTitle}>Send Money</Text>
                  <Text style={styles.sheetSubtitle}>Search by name or scan a QR code</Text>

                  {/* Search + QR row */}
                  <View style={styles.searchRow}>
                    <TextInput
                      style={[styles.searchInput, { flex: 1 }]}
                      value={recipientSearch}
                      onChangeText={handleSearch}
                      placeholder="Search by name or wallet ID..."
                      placeholderTextColor={COLORS.text.muted}
                      autoFocus
                    />
                    <TouchableOpacity
                      style={styles.qrScanButton}
                      onPress={() => setSendStep("scanner")}
                    >
                      <Ionicons name="qr-code-outline" size={22} color={COLORS.orange} />
                    </TouchableOpacity>
                  </View>

                  {searching && <ActivityIndicator size="small" color={COLORS.orange} style={{ marginVertical: 12 }} />}
                  {searchResults.map((r) => (
                    <TouchableOpacity key={r.wallet_id} style={styles.searchResultItem} onPress={() => { setSelectedRecipient(r); setSendStep("amount"); }}>
                      <View style={styles.searchResultAvatar}>
                        <Text style={styles.searchResultAvatarText}>{(r.display_name || r.wallet_id || "?")[0].toUpperCase()}</Text>
                      </View>
                      <View style={styles.searchResultInfo}>
                        <Text style={styles.searchResultName}>{r.display_name || "Unknown"}</Text>
                        <Text style={styles.searchResultId}>{r.wallet_id}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={COLORS.text.muted} />
                    </TouchableOpacity>
                  ))}
                  {recipientSearch.length > 1 && searchResults.length === 0 && !searching && (
                    <Text style={styles.noResults}>No wallets found</Text>
                  )}
                </>
              ) : sendStep === "amount" ? (
                <>
                  <Text style={styles.sheetTitle}>Amount</Text>
                  <Text style={styles.sheetSubtitle}>Sending to {selectedRecipient?.display_name}</Text>
                  <TextInput style={styles.amountInput} value={sendAmount} onChangeText={setSendAmount} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={COLORS.text.muted} autoFocus />
                  <TextInput style={styles.noteInput} value={sendNote} onChangeText={setSendNote} placeholder="Add a note (optional)" placeholderTextColor={COLORS.text.muted} maxLength={100} />
                  <View style={styles.sheetActions}>
                    <TouchableOpacity style={styles.ghostButton} onPress={() => setSendStep("search")}><Text style={styles.ghostButtonText}>Back</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.primaryButton, { flex: 2 }, (!sendAmount || parseFloat(sendAmount) <= 0) && styles.buttonDisabled]} onPress={() => setSendStep("pin")} disabled={!sendAmount || parseFloat(sendAmount) <= 0}>
                      <Text style={styles.primaryButtonText}>Continue</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.sheetTitle}>Enter PIN</Text>
                  <Text style={styles.sheetSubtitle}>Confirm ${parseFloat(sendAmount || "0").toFixed(2)} to {selectedRecipient?.display_name}</Text>
                  <TextInput style={styles.pinInput} value={sendPin} onChangeText={setSendPin} keyboardType="number-pad" secureTextEntry maxLength={6} placeholder="Your wallet PIN" placeholderTextColor={COLORS.text.muted} autoFocus />
                  <View style={styles.sheetActions}>
                    <TouchableOpacity style={styles.ghostButton} onPress={() => setSendStep("amount")}><Text style={styles.ghostButtonText}>Back</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.primaryButton, { flex: 2 }, (!sendPin || sending) && styles.buttonDisabled]} onPress={handleSend} disabled={!sendPin || sending}>
                      {sending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryButtonText}>Confirm Send</Text>}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </KeyboardAvoidingView>
        )}
      </Modal>

      {/* ====== DEPOSIT MODAL ====== */}
      <Modal visible={showDepositModal} animationType="slide" transparent onRequestClose={() => { if (depositStep !== "processing") { setShowDepositModal(false); setDepositStep("amount"); } }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => { if (depositStep !== "processing") { setShowDepositModal(false); setDepositStep("amount"); } }} />
          <View style={[styles.sheetContainer, { backgroundColor: tc.surface }]}>
            <View style={styles.sheetHandle} />

            {depositStep === "success" ? (
              <View style={styles.centeredContent}>
                <Ionicons name="checkmark-circle" size={64} color={COLORS.status.success} />
                <Text style={styles.setupTitle}>Deposited!</Text>
                <Text style={styles.setupSubtitle}>Your balance has been updated</Text>
              </View>
            ) : depositStep === "failed" ? (
              <View style={styles.centeredContent}>
                <Ionicons name="close-circle" size={64} color={COLORS.status.danger} />
                <Text style={styles.setupTitle}>Payment Failed</Text>
                <Text style={styles.setupSubtitle}>Payment was cancelled or expired</Text>
                <TouchableOpacity style={[styles.primaryButton, { marginTop: SPACING.lg }]} onPress={() => setDepositStep("amount")}>
                  <Text style={styles.primaryButtonText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            ) : depositStep === "processing" || depositStep === "polling" ? (
              <View style={styles.centeredContent}>
                <ActivityIndicator size="large" color={COLORS.orange} />
                <Text style={styles.setupTitle}>{depositStep === "processing" ? "Opening Payment..." : "Waiting for Payment"}</Text>
                <Text style={styles.setupSubtitle}>
                  {depositStep === "polling"
                    ? "Complete payment in the browser. This screen will update automatically."
                    : "Please wait while we prepare your payment..."}
                </Text>
                {depositStep === "polling" && (
                  <TouchableOpacity
                    style={[styles.ghostButton, { marginTop: SPACING.xl, alignSelf: "stretch" }]}
                    onPress={async () => {
                      if (depositPollInterval.current) clearInterval(depositPollInterval.current);
                      // Manual check
                      if (depositSessionId) {
                        try {
                          const r = await api.get(`/wallet/deposit/status/${depositSessionId}`);
                          if (r.data?.status === "completed") {
                            setDepositStep("success");
                            await fetchWallet();
                          } else {
                            Alert.alert("Not yet", "Payment not confirmed yet. Try again in a moment.");
                          }
                        } catch {}
                      }
                    }}
                  >
                    <Text style={styles.ghostButtonText}>Check Payment Status</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <>
                <Text style={styles.sheetTitle}>Deposit Funds</Text>
                <Text style={styles.sheetSubtitle}>Add money to your Kvitt wallet via Stripe</Text>

                {/* Quick amounts */}
                <View style={styles.depositGrid}>
                  {DEPOSIT_AMOUNTS.map((a) => (
                    <TouchableOpacity
                      key={a.cents}
                      style={[
                        styles.depositChip,
                        selectedDepositCents === a.cents && !customDepositAmount && styles.depositChipSelected
                      ]}
                      onPress={() => { setSelectedDepositCents(a.cents); setCustomDepositAmount(""); }}
                    >
                      <Text style={[
                        styles.depositChipText,
                        selectedDepositCents === a.cents && !customDepositAmount && styles.depositChipTextSelected
                      ]}>{a.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  style={[styles.noteInput, { marginTop: SPACING.md }]}
                  value={customDepositAmount}
                  onChangeText={setCustomDepositAmount}
                  keyboardType="decimal-pad"
                  placeholder="Or enter custom amount ($5 - $1,000)"
                  placeholderTextColor={COLORS.text.muted}
                />

                <Text style={styles.depositNote}>
                  You'll be redirected to Stripe's secure checkout. Balance updates after payment is confirmed.
                </Text>

                <TouchableOpacity
                  style={[styles.primaryButton, { marginTop: SPACING.lg }, initiatingDeposit && styles.buttonDisabled]}
                  onPress={handleInitiateDeposit}
                  disabled={initiatingDeposit}
                >
                  {initiatingDeposit ? <ActivityIndicator size="small" color="#fff" /> : (
                    <>
                      <Ionicons name="card-outline" size={18} color="#fff" />
                      <Text style={styles.primaryButtonText}>
                        Pay ${((getEffectiveDepositCents()) / 100).toFixed(2)} via Stripe
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.ghostButton, { marginTop: SPACING.md }]} onPress={() => setShowDepositModal(false)}>
                  <Text style={styles.ghostButtonText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ====== WITHDRAW MODAL ====== */}
      <Modal visible={showWithdrawModal} animationType="slide" transparent onRequestClose={() => setShowWithdrawModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowWithdrawModal(false)} />
          <View style={[styles.sheetContainer, { backgroundColor: tc.surface }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Withdraw Funds</Text>
            <Text style={styles.sheetSubtitle}>Processed within 1-2 business days</Text>

            <View style={styles.methodRow}>
              {(["bank_transfer", "venmo"] as const).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.methodChip, withdrawMethod === m && styles.methodChipSelected]}
                  onPress={() => setWithdrawMethod(m)}
                >
                  <Ionicons
                    name={m === "bank_transfer" ? "business-outline" : "phone-portrait-outline"}
                    size={16}
                    color={withdrawMethod === m ? "#fff" : COLORS.text.muted}
                  />
                  <Text style={[styles.methodChipText, withdrawMethod === m && styles.methodChipTextSelected]}>
                    {m === "bank_transfer" ? "Bank" : "Venmo"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.noteInput}
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
              keyboardType="decimal-pad"
              placeholder="Amount (min $5.00)"
              placeholderTextColor={COLORS.text.muted}
            />

            <TextInput
              style={styles.noteInput}
              value={withdrawDestination}
              onChangeText={setWithdrawDestination}
              placeholder={withdrawMethod === "bank_transfer" ? "Account/routing or email" : "Venmo username (@handle)"}
              placeholderTextColor={COLORS.text.muted}
              autoCapitalize="none"
            />

            <TextInput
              style={styles.noteInput}
              value={withdrawPin}
              onChangeText={setWithdrawPin}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
              placeholder="Your wallet PIN"
              placeholderTextColor={COLORS.text.muted}
            />

            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.ghostButton} onPress={() => setShowWithdrawModal(false)}><Text style={styles.ghostButtonText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, { flex: 2 }, (!withdrawAmount || !withdrawDestination || !withdrawPin || submittingWithdraw) && styles.buttonDisabled]}
                onPress={handleWithdraw}
                disabled={!withdrawAmount || !withdrawDestination || !withdrawPin || submittingWithdraw}
              >
                {submittingWithdraw ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryButtonText}>Submit Request</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </BottomSheetScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.container,
    paddingVertical: SPACING.md,
    paddingTop: 16,
  },
  headerTitle: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.sizes.heading3,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  closeBtn: {
    width: 44, height: 44,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.glass.bg,
    borderWidth: 1,
    borderColor: COLORS.glass.border,
    alignItems: "center",
    justifyContent: "center",
  },
  copyBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  scrollView: { flex: 1 },
  scrollContent: { padding: SPACING.container },
  loadingContainer: { paddingVertical: 60, alignItems: "center" },

  // Setup
  setupContainer: {
    flex: 1,
    padding: SPACING.container,
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.lg,
  },
  setupIcon: {
    width: 80, height: 80,
    borderRadius: RADIUS.xxl,
    backgroundColor: COLORS.glass.glowOrange,
    alignItems: "center",
    justifyContent: "center",
  },
  setupTitle: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.sizes.heading2,
    fontWeight: TYPOGRAPHY.weights.bold,
    textAlign: "center",
  },
  setupSubtitle: {
    color: COLORS.text.muted,
    fontSize: TYPOGRAPHY.sizes.bodySmall,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 280,
  },
  featureList: { gap: SPACING.md, alignSelf: "stretch", marginVertical: SPACING.md },
  featureItem: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
  featureIcon: { width: 40, height: 40, borderRadius: RADIUS.md, alignItems: "center", justifyContent: "center" },
  featureText: { color: COLORS.text.secondary, fontSize: TYPOGRAPHY.sizes.body },
  centeredContent: { flex: 1, alignItems: "center", justifyContent: "center", gap: SPACING.lg, padding: SPACING.container },

  // Balance
  balanceCard: {
    borderRadius: RADIUS.xxl,
    borderWidth: 1.5,
    borderColor: COLORS.glass.border,
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.glass.bg,
  },
  balanceCardInner: {
    borderRadius: RADIUS.xl,
    padding: SPACING.xxl,
    backgroundColor: COLORS.glass.glowOrange,
    alignItems: "center",
  },
  walletIdRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: SPACING.md },
  walletIdText: {
    color: COLORS.moonstone,
    fontSize: TYPOGRAPHY.sizes.caption,
    letterSpacing: 1,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  balanceLabel: {
    color: COLORS.moonstone,
    fontSize: TYPOGRAPHY.sizes.caption,
    fontWeight: TYPOGRAPHY.weights.semiBold,
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
  balanceValue: {
    color: COLORS.text.primary,
    fontSize: 48,
    fontWeight: TYPOGRAPHY.weights.bold,
    letterSpacing: -1,
  },
  limitText: { color: COLORS.text.muted, fontSize: TYPOGRAPHY.sizes.micro, marginTop: SPACING.sm, textAlign: "center" },

  // Actions
  actionsRow: { flexDirection: "row", gap: SPACING.md, marginBottom: SPACING.md },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.lg,
  },
  actionButtonSmall: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  actionButtonText: { color: "#fff", fontSize: TYPOGRAPHY.sizes.body, fontWeight: TYPOGRAPHY.weights.semiBold },

  // PIN warning
  pinWarning: {
    flexDirection: "row", alignItems: "center", gap: SPACING.sm,
    backgroundColor: "rgba(245,158,11,0.1)", borderWidth: 1, borderColor: "rgba(245,158,11,0.3)",
    borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.xl,
  },
  pinWarningText: { color: COLORS.status.warning, fontSize: TYPOGRAPHY.sizes.bodySmall, flex: 1 },

  // Transactions
  sectionHeader: { marginBottom: SPACING.md },
  sectionTitle: { color: COLORS.moonstone, fontSize: TYPOGRAPHY.sizes.caption, fontWeight: TYPOGRAPHY.weights.semiBold, letterSpacing: 1 },
  emptyTx: { alignItems: "center", paddingVertical: SPACING.xxxl, gap: SPACING.sm },
  emptyTxText: { color: COLORS.text.secondary, fontSize: TYPOGRAPHY.sizes.body, fontWeight: TYPOGRAPHY.weights.medium },
  emptyTxSub: { color: COLORS.text.muted, fontSize: TYPOGRAPHY.sizes.bodySmall },
  txList: { backgroundColor: COLORS.glass.bg, borderWidth: 1, borderColor: COLORS.glass.border, borderRadius: RADIUS.xl, overflow: "hidden" },
  txItem: { flexDirection: "row", alignItems: "center", padding: SPACING.lg, gap: SPACING.md },
  txItemBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.glass.border },
  txIcon: { width: 40, height: 40, borderRadius: RADIUS.full, alignItems: "center", justifyContent: "center" },
  txInfo: { flex: 1 },
  txDesc: { color: COLORS.text.primary, fontSize: TYPOGRAPHY.sizes.bodySmall, fontWeight: TYPOGRAPHY.weights.medium },
  txDate: { color: COLORS.text.muted, fontSize: TYPOGRAPHY.sizes.micro, marginTop: 2 },
  txAmount: { fontSize: TYPOGRAPHY.sizes.body, fontWeight: TYPOGRAPHY.weights.bold },

  // Modal
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  sheetContainer: {
    borderTopLeftRadius: RADIUS.xxxl,
    borderTopRightRadius: RADIUS.xxxl,
    padding: SPACING.container,
    paddingBottom: 40,
    minHeight: 300,
    maxHeight: "85%",
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(128,128,128,0.3)", alignSelf: "center", marginBottom: SPACING.xl },
  sheetTitle: { color: COLORS.text.primary, fontSize: TYPOGRAPHY.sizes.heading2, fontWeight: TYPOGRAPHY.weights.bold, textAlign: "center", marginBottom: SPACING.sm },
  sheetSubtitle: { color: COLORS.text.muted, fontSize: TYPOGRAPHY.sizes.bodySmall, textAlign: "center", marginBottom: SPACING.xl },
  sheetActions: { flexDirection: "row", gap: SPACING.md, marginTop: SPACING.lg },

  // QR section in receive modal
  qrSection: { alignItems: "center", marginVertical: SPACING.lg },

  // Send search
  searchRow: { flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.md },
  searchInput: {
    backgroundColor: COLORS.glass.bg,
    borderWidth: 1, borderColor: COLORS.glass.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.sizes.body,
  },
  qrScanButton: {
    width: 52, height: 52,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.glass.bg,
    borderWidth: 1, borderColor: COLORS.orange + "60",
    alignItems: "center",
    justifyContent: "center",
  },
  searchResultItem: {
    flexDirection: "row", alignItems: "center", gap: SPACING.md,
    padding: SPACING.lg, backgroundColor: COLORS.glass.inner,
    borderRadius: RADIUS.lg, marginBottom: SPACING.sm,
  },
  searchResultAvatar: {
    width: 44, height: 44, borderRadius: RADIUS.full,
    backgroundColor: COLORS.glass.glowBlue, alignItems: "center", justifyContent: "center",
  },
  searchResultAvatarText: { color: COLORS.trustBlue, fontSize: TYPOGRAPHY.sizes.body, fontWeight: TYPOGRAPHY.weights.bold },
  searchResultInfo: { flex: 1 },
  searchResultName: { color: COLORS.text.primary, fontSize: TYPOGRAPHY.sizes.body, fontWeight: TYPOGRAPHY.weights.medium },
  searchResultId: { color: COLORS.text.muted, fontSize: TYPOGRAPHY.sizes.caption, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" },
  noResults: { color: COLORS.text.muted, fontSize: TYPOGRAPHY.sizes.body, textAlign: "center", marginVertical: SPACING.xl },

  // Amount
  amountInput: {
    backgroundColor: COLORS.glass.bg, borderWidth: 1, borderColor: COLORS.glass.border,
    borderRadius: RADIUS.lg, padding: SPACING.xl, color: COLORS.text.primary,
    fontSize: 40, fontWeight: TYPOGRAPHY.weights.bold, textAlign: "center", marginBottom: SPACING.md,
  },
  noteInput: {
    backgroundColor: COLORS.glass.bg, borderWidth: 1, borderColor: COLORS.glass.border,
    borderRadius: RADIUS.lg, padding: SPACING.lg, color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.sizes.body, marginBottom: SPACING.md,
  },
  pinInput: {
    backgroundColor: COLORS.glass.bg, borderWidth: 1, borderColor: COLORS.glass.border,
    borderRadius: RADIUS.lg, padding: SPACING.xl, color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.sizes.heading2, textAlign: "center", letterSpacing: 8, marginBottom: SPACING.md, alignSelf: "stretch",
  },

  // Deposit
  depositGrid: { flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.sm },
  depositChip: {
    flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.lg,
    backgroundColor: COLORS.glass.bg, borderWidth: 1, borderColor: COLORS.glass.border,
    alignItems: "center",
  },
  depositChipSelected: { backgroundColor: COLORS.orange, borderColor: COLORS.orange },
  depositChipText: { color: COLORS.text.secondary, fontSize: TYPOGRAPHY.sizes.body, fontWeight: TYPOGRAPHY.weights.semiBold },
  depositChipTextSelected: { color: "#fff" },
  depositNote: {
    color: COLORS.text.muted, fontSize: TYPOGRAPHY.sizes.caption,
    textAlign: "center", lineHeight: 18, marginTop: SPACING.md, paddingHorizontal: SPACING.sm,
  },

  // Withdraw methods
  methodRow: { flexDirection: "row", gap: SPACING.md, marginBottom: SPACING.md },
  methodChip: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: SPACING.sm, paddingVertical: SPACING.md, borderRadius: RADIUS.lg,
    backgroundColor: COLORS.glass.bg, borderWidth: 1, borderColor: COLORS.glass.border,
  },
  methodChipSelected: { backgroundColor: COLORS.orange, borderColor: COLORS.orange },
  methodChipText: { color: COLORS.text.muted, fontSize: TYPOGRAPHY.sizes.body, fontWeight: TYPOGRAPHY.weights.semiBold },
  methodChipTextSelected: { color: "#fff" },

  // Buttons
  primaryButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: SPACING.sm, backgroundColor: COLORS.orange, borderRadius: RADIUS.lg,
    padding: SPACING.lg, alignSelf: "stretch",
  },
  primaryButtonText: { color: "#fff", fontSize: TYPOGRAPHY.sizes.body, fontWeight: TYPOGRAPHY.weights.semiBold },
  ghostButton: {
    flex: 1, alignItems: "center", justifyContent: "center",
    backgroundColor: COLORS.glass.bg, borderWidth: 1, borderColor: COLORS.glass.border,
    borderRadius: RADIUS.lg, padding: SPACING.lg,
  },
  ghostButtonText: { color: COLORS.text.secondary, fontSize: TYPOGRAPHY.sizes.body, fontWeight: TYPOGRAPHY.weights.semiBold },
  buttonDisabled: { opacity: 0.5 },
});

export default WalletScreen;
