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
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, ANIMATION } from "../styles/liquidGlass";
import { BottomSheetScreen } from "../components/BottomSheetScreen";

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

// Step screens for wallet setup
type SetupStep = "intro" | "creating" | "pin_setup" | "done";

export function WalletScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();

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
  const [sendStep, setSendStep] = useState<"search" | "amount" | "pin" | "done">("search");
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
        risk_acknowledged: amountCents > 10000,
      });
      setSendStep("done");
      await fetchWallet();
      setTimeout(() => {
        setShowSendModal(false);
        resetSendModal();
      }, 2500);
    } catch (e: any) {
      Alert.alert("Transfer Failed", e?.response?.data?.detail || "Please check your PIN and try again");
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

  // Render wallet setup flow when no wallet
  if (!loading && (!wallet?.wallet_id || wallet?.status === "needs_setup")) {
    return (
      <BottomSheetScreen>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="close" size={22} color={COLORS.text.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Kvitt Wallet</Text>
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
            // Intro step
            <View style={styles.setupContainer}>
              <View style={styles.setupIcon}>
                <Ionicons name="wallet" size={40} color={COLORS.orange} />
              </View>
              <Text style={styles.setupTitle}>Kvitt Wallet</Text>
              <Text style={styles.setupSubtitle}>
                Send and receive poker settlements instantly. Your wallet comes with a unique ID for peer-to-peer transfers.
              </Text>

              <View style={styles.featureList}>
                {[
                  { icon: "arrow-forward-circle", color: COLORS.trustBlue, text: "Instant P2P transfers" },
                  { icon: "lock-closed", color: COLORS.orange, text: "PIN-protected security" },
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
      <View style={styles.container}>
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={22} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Kvitt Wallet</Text>
          <TouchableOpacity
            style={styles.walletIdBtn}
            onPress={() => {
              if (wallet?.wallet_id) {
                Clipboard.setString(wallet.wallet_id);
                Alert.alert("Copied!", `Wallet ID ${wallet.wallet_id} copied to clipboard`);
              }
            }}
          >
            <Ionicons name="copy-outline" size={16} color={COLORS.text.muted} />
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
                  {/* Wallet ID */}
                  <View style={styles.walletIdRow}>
                    <Ionicons name="wallet-outline" size={14} color={COLORS.moonstone} />
                    <Text style={styles.walletIdText}>{wallet?.wallet_id || "—"}</Text>
                  </View>

                  <Text style={styles.balanceLabel}>AVAILABLE BALANCE</Text>
                  <Text style={styles.balanceValue}>
                    ${((wallet?.balance_cents || 0) / 100).toFixed(2)}
                  </Text>

                  {/* Daily Limit */}
                  {wallet?.daily_transfer_limit_cents && (
                    <Text style={styles.limitText}>
                      Daily limit: ${(wallet.daily_transfer_limit_cents / 100).toFixed(0)} · Used: ${((wallet.daily_transferred_cents || 0) / 100).toFixed(0)}
                    </Text>
                  )}
                </View>
              </Animated.View>

              {/* Action Buttons */}
              <Animated.View style={[styles.actionsRow, { opacity: fadeAnim }]}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: COLORS.trustBlue }]}
                  onPress={() => setShowReceiveModal(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="arrow-down-circle-outline" size={22} color="#fff" />
                  <Text style={styles.actionButtonText}>Receive</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: COLORS.orange }]}
                  onPress={() => { setShowSendModal(true); setSendStep("search"); }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="arrow-up-circle-outline" size={22} color="#fff" />
                  <Text style={styles.actionButtonText}>Send</Text>
                </TouchableOpacity>
              </Animated.View>

              {/* PIN status */}
              {!wallet?.has_pin && (
                <View style={styles.pinWarning}>
                  <Ionicons name="warning-outline" size={16} color={COLORS.status.warning} />
                  <Text style={styles.pinWarningText}>
                    Set a PIN to enable transfers
                  </Text>
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
                  <Text style={styles.emptyTxSub}>Send or receive money to get started</Text>
                </View>
              ) : (
                <View style={styles.txList}>
                  {transactions.map((tx, idx) => {
                    const isOut = tx.type === "transfer_out";
                    const color = getTransactionColor(tx.type);
                    return (
                      <View
                        key={tx.transaction_id || idx}
                        style={[styles.txItem, idx < transactions.length - 1 && styles.txItemBorder]}
                      >
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

      {/* Receive Modal */}
      <Modal visible={showReceiveModal} animationType="slide" transparent onRequestClose={() => setShowReceiveModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowReceiveModal(false)} />
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Receive Money</Text>
            <Text style={styles.sheetSubtitle}>Share your Wallet ID to receive transfers</Text>

            <View style={styles.walletIdDisplay}>
              <Text style={styles.walletIdDisplayLabel}>YOUR WALLET ID</Text>
              <Text style={styles.walletIdDisplayValue}>{wallet?.wallet_id}</Text>
            </View>

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

            <TouchableOpacity
              style={[styles.ghostButton, { marginTop: SPACING.md }]}
              onPress={() => setShowReceiveModal(false)}
            >
              <Text style={styles.ghostButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Send Modal */}
      <Modal visible={showSendModal} animationType="slide" transparent onRequestClose={() => { setShowSendModal(false); resetSendModal(); }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => { setShowSendModal(false); resetSendModal(); }} />
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHandle} />

            {sendStep === "done" ? (
              <View style={styles.centeredContent}>
                <Ionicons name="checkmark-circle" size={64} color={COLORS.status.success} />
                <Text style={styles.setupTitle}>Sent!</Text>
                <Text style={styles.setupSubtitle}>
                  ${parseFloat(sendAmount || "0").toFixed(2)} sent to {selectedRecipient?.display_name}
                </Text>
              </View>
            ) : sendStep === "search" ? (
              <>
                <Text style={styles.sheetTitle}>Send Money</Text>
                <Text style={styles.sheetSubtitle}>Search by name or wallet ID</Text>

                <TextInput
                  style={styles.searchInput}
                  value={recipientSearch}
                  onChangeText={handleSearch}
                  placeholder="Search by name or wallet ID..."
                  placeholderTextColor={COLORS.text.muted}
                  autoFocus
                />

                {searching && <ActivityIndicator size="small" color={COLORS.orange} style={{ marginVertical: 12 }} />}

                {searchResults.map((r) => (
                  <TouchableOpacity
                    key={r.wallet_id}
                    style={styles.searchResultItem}
                    onPress={() => { setSelectedRecipient(r); setSendStep("amount"); }}
                  >
                    <View style={styles.searchResultAvatar}>
                      <Text style={styles.searchResultAvatarText}>
                        {(r.display_name || r.wallet_id || "?")[0].toUpperCase()}
                      </Text>
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

                <TextInput
                  style={styles.amountInput}
                  value={sendAmount}
                  onChangeText={setSendAmount}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={COLORS.text.muted}
                  autoFocus
                />

                <TextInput
                  style={styles.noteInput}
                  value={sendNote}
                  onChangeText={setSendNote}
                  placeholder="Add a note (optional)"
                  placeholderTextColor={COLORS.text.muted}
                  maxLength={100}
                />

                <View style={styles.sheetActions}>
                  <TouchableOpacity style={styles.ghostButton} onPress={() => setSendStep("search")}>
                    <Text style={styles.ghostButtonText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.primaryButton, { flex: 2 }, (!sendAmount || parseFloat(sendAmount) <= 0) && styles.buttonDisabled]}
                    onPress={() => setSendStep("pin")}
                    disabled={!sendAmount || parseFloat(sendAmount) <= 0}
                  >
                    <Text style={styles.primaryButtonText}>Continue</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              // Pin step
              <>
                <Text style={styles.sheetTitle}>Enter PIN</Text>
                <Text style={styles.sheetSubtitle}>
                  Confirm ${parseFloat(sendAmount || "0").toFixed(2)} to {selectedRecipient?.display_name}
                </Text>

                <TextInput
                  style={styles.pinInput}
                  value={sendPin}
                  onChangeText={setSendPin}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={6}
                  placeholder="Your wallet PIN"
                  placeholderTextColor={COLORS.text.muted}
                  autoFocus
                />

                <View style={styles.sheetActions}>
                  <TouchableOpacity style={styles.ghostButton} onPress={() => setSendStep("amount")}>
                    <Text style={styles.ghostButtonText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.primaryButton, { flex: 2 }, (!sendPin || sending) && styles.buttonDisabled]}
                    onPress={handleSend}
                    disabled={!sendPin || sending}
                  >
                    {sending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryButtonText}>Confirm Send</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </BottomSheetScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.jetDark,
  },
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
    width: 44,
    height: 44,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.glass.bg,
    borderWidth: 1,
    borderColor: COLORS.glass.border,
    alignItems: "center",
    justifyContent: "center",
  },
  walletIdBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: { flex: 1 },
  scrollContent: { padding: SPACING.container },
  loadingContainer: { paddingVertical: 60, alignItems: "center" },

  // Setup flow
  setupContainer: {
    flex: 1,
    padding: SPACING.container,
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.lg,
  },
  setupIcon: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.xxl,
    backgroundColor: COLORS.glass.glowOrange,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.sm,
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
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    color: COLORS.text.secondary,
    fontSize: TYPOGRAPHY.sizes.body,
  },
  centeredContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.lg,
  },

  // Balance card
  balanceCard: {
    borderRadius: RADIUS.xxl,
    padding: 3,
    backgroundColor: COLORS.glass.bg,
    borderWidth: 1.5,
    borderColor: COLORS.glass.border,
    marginBottom: SPACING.lg,
  },
  balanceCardInner: {
    borderRadius: RADIUS.xl,
    padding: SPACING.xxl,
    backgroundColor: COLORS.glass.glowOrange,
    alignItems: "center",
  },
  walletIdRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: SPACING.md,
  },
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
  limitText: {
    color: COLORS.text.muted,
    fontSize: TYPOGRAPHY.sizes.micro,
    marginTop: SPACING.sm,
    textAlign: "center",
  },

  // Actions
  actionsRow: {
    flexDirection: "row",
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.lg,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },

  // PIN warning
  pinWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    backgroundColor: "rgba(245,158,11,0.1)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.3)",
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  pinWarningText: {
    color: COLORS.status.warning,
    fontSize: TYPOGRAPHY.sizes.bodySmall,
    flex: 1,
  },

  // Transactions
  sectionHeader: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    color: COLORS.moonstone,
    fontSize: TYPOGRAPHY.sizes.caption,
    fontWeight: TYPOGRAPHY.weights.semiBold,
    letterSpacing: 1,
  },
  emptyTx: {
    alignItems: "center",
    paddingVertical: SPACING.xxxl,
    gap: SPACING.sm,
  },
  emptyTxText: {
    color: COLORS.text.secondary,
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  emptyTxSub: {
    color: COLORS.text.muted,
    fontSize: TYPOGRAPHY.sizes.bodySmall,
  },
  txList: {
    backgroundColor: COLORS.glass.bg,
    borderWidth: 1,
    borderColor: COLORS.glass.border,
    borderRadius: RADIUS.xl,
    overflow: "hidden",
  },
  txItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  txItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glass.border,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
  },
  txInfo: { flex: 1 },
  txDesc: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.sizes.bodySmall,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  txDate: {
    color: COLORS.text.muted,
    fontSize: TYPOGRAPHY.sizes.micro,
    marginTop: 2,
  },
  txAmount: {
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: TYPOGRAPHY.weights.bold,
  },

  // Modal
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  sheetContainer: {
    backgroundColor: COLORS.jetSurface,
    borderTopLeftRadius: RADIUS.xxxl,
    borderTopRightRadius: RADIUS.xxxl,
    padding: SPACING.container,
    paddingBottom: 40,
    minHeight: 300,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(128,128,128,0.3)",
    alignSelf: "center",
    marginBottom: SPACING.xl,
  },
  sheetTitle: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.sizes.heading2,
    fontWeight: TYPOGRAPHY.weights.bold,
    textAlign: "center",
    marginBottom: SPACING.sm,
  },
  sheetSubtitle: {
    color: COLORS.text.muted,
    fontSize: TYPOGRAPHY.sizes.bodySmall,
    textAlign: "center",
    marginBottom: SPACING.xl,
  },
  sheetActions: {
    flexDirection: "row",
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },

  // Wallet ID display
  walletIdDisplay: {
    backgroundColor: COLORS.glass.bg,
    borderWidth: 1,
    borderColor: COLORS.glass.border,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: "center",
    gap: SPACING.sm,
    marginVertical: SPACING.lg,
  },
  walletIdDisplayLabel: {
    color: COLORS.moonstone,
    fontSize: TYPOGRAPHY.sizes.caption,
    fontWeight: TYPOGRAPHY.weights.semiBold,
    letterSpacing: 1,
  },
  walletIdDisplayValue: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.sizes.heading3,
    fontWeight: TYPOGRAPHY.weights.bold,
    letterSpacing: 2,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },

  // Search
  searchInput: {
    backgroundColor: COLORS.glass.bg,
    borderWidth: 1,
    borderColor: COLORS.glass.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.sizes.body,
    marginBottom: SPACING.md,
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.lg,
    backgroundColor: COLORS.glass.inner,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
  },
  searchResultAvatar: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.glass.glowBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  searchResultAvatarText: {
    color: COLORS.trustBlue,
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  searchResultInfo: { flex: 1 },
  searchResultName: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  searchResultId: {
    color: COLORS.text.muted,
    fontSize: TYPOGRAPHY.sizes.caption,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  noResults: {
    color: COLORS.text.muted,
    fontSize: TYPOGRAPHY.sizes.body,
    textAlign: "center",
    marginVertical: SPACING.xl,
  },

  // Amount
  amountInput: {
    backgroundColor: COLORS.glass.bg,
    borderWidth: 1,
    borderColor: COLORS.glass.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    color: COLORS.text.primary,
    fontSize: 40,
    fontWeight: TYPOGRAPHY.weights.bold,
    textAlign: "center",
    marginBottom: SPACING.md,
  },
  noteInput: {
    backgroundColor: COLORS.glass.bg,
    borderWidth: 1,
    borderColor: COLORS.glass.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.sizes.body,
    marginBottom: SPACING.md,
  },

  // PIN input
  pinInput: {
    backgroundColor: COLORS.glass.bg,
    borderWidth: 1,
    borderColor: COLORS.glass.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.sizes.heading2,
    textAlign: "center",
    letterSpacing: 8,
    marginBottom: SPACING.md,
    alignSelf: "stretch",
  },

  // Buttons
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.orange,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignSelf: "stretch",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  ghostButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.glass.bg,
    borderWidth: 1,
    borderColor: COLORS.glass.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  ghostButtonText: {
    color: COLORS.text.secondary,
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  buttonDisabled: { opacity: 0.5 },
});

export default WalletScreen;
