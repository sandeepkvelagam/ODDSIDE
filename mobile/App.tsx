import React, { useState, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  FlatList,
  RefreshControl,
} from "react-native";
import { supabase } from "./src/lib/supabase";
import axios from "axios";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://kvitt-ledger.preview.emergentagent.com";

// Simple screen type
type Screen = "login" | "groups" | "group" | "game";

export default function App() {
  // Auth state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [isSignUp, setIsSignUp] = useState(false);

  // Navigation state
  const [currentScreen, setCurrentScreen] = useState<Screen>("login");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedGroupName, setSelectedGroupName] = useState<string>("");
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  // Data state
  const [groups, setGroups] = useState<any[]>([]);
  const [groupDetails, setGroupDetails] = useState<any>(null);
  const [games, setGames] = useState<any[]>([]);
  const [gameDetails, setGameDetails] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // Auth check on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) setCurrentScreen("groups");
      setCheckingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setCurrentScreen("groups");
      } else {
        setCurrentScreen("login");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch groups when on groups screen
  useEffect(() => {
    if (currentScreen === "groups" && session) {
      fetchGroups();
    }
  }, [currentScreen, session]);

  // Fetch group details when selected
  useEffect(() => {
    if (currentScreen === "group" && selectedGroupId && session) {
      fetchGroupDetails();
    }
  }, [currentScreen, selectedGroupId, session]);

  // Fetch game details when selected
  useEffect(() => {
    if (currentScreen === "game" && selectedGameId && session) {
      fetchGameDetails();
    }
  }, [currentScreen, selectedGameId, session]);

  // API calls
  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      Authorization: `Bearer ${session?.access_token}`,
      "Content-Type": "application/json",
    };
  };

  const fetchGroups = async () => {
    try {
      setDataError(null);
      const headers = await getAuthHeaders();
      const res = await axios.get(`${API_URL}/api/groups`, { headers });
      setGroups(res.data || []);
    } catch (e: any) {
      setDataError(e?.response?.data?.detail || e?.message || "Failed to load groups");
      setGroups([]);
    }
  };

  const fetchGroupDetails = async () => {
    try {
      setDataError(null);
      const headers = await getAuthHeaders();
      const [groupRes, gamesRes] = await Promise.all([
        axios.get(`${API_URL}/api/groups/${selectedGroupId}`, { headers }),
        axios.get(`${API_URL}/api/groups/${selectedGroupId}/games`, { headers }),
      ]);
      setGroupDetails(groupRes.data);
      setGames(gamesRes.data || []);
    } catch (e: any) {
      setDataError(e?.response?.data?.detail || e?.message || "Failed to load group");
    }
  };

  const fetchGameDetails = async () => {
    try {
      setDataError(null);
      const headers = await getAuthHeaders();
      const res = await axios.get(`${API_URL}/api/games/${selectedGameId}`, { headers });
      setGameDetails(res.data);
    } catch (e: any) {
      setDataError(e?.response?.data?.detail || e?.message || "Failed to load game");
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (currentScreen === "groups") await fetchGroups();
    else if (currentScreen === "group") await fetchGroupDetails();
    else if (currentScreen === "game") await fetchGameDetails();
    setRefreshing(false);
  };

  // Auth handlers
  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: { data: { name: email.split("@")[0] } }
        });
        if (error) throw error;
        Alert.alert("Success", "Check your email to confirm your account, then sign in!");
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error: any) {
      Alert.alert(isSignUp ? "Sign Up Failed" : "Login Failed", error.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setGroups([]);
    setGroupDetails(null);
    setGames([]);
    setGameDetails(null);
  };

  // Navigation helpers
  const goToGroup = (groupId: string, groupName: string) => {
    setSelectedGroupId(groupId);
    setSelectedGroupName(groupName);
    setCurrentScreen("group");
  };

  const goToGame = (gameId: string) => {
    setSelectedGameId(gameId);
    setCurrentScreen("game");
  };

  const goBack = () => {
    if (currentScreen === "game") {
      setCurrentScreen("group");
      setGameDetails(null);
    } else if (currentScreen === "group") {
      setCurrentScreen("groups");
      setGroupDetails(null);
      setGames([]);
    }
  };

  // Loading state
  if (checkingAuth) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
        <StatusBar style="light" />
      </SafeAreaView>
    );
  }

  // Login screen
  if (currentScreen === "login" || !session) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Kvitt</Text>
          <Text style={styles.subtitle}>Game Ledger</Text>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#666"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />

            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#666"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleAuth}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>{isSignUp ? "Create Account" : "Sign In"}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setIsSignUp(!isSignUp)}
              disabled={loading}
            >
              <Text style={styles.secondaryButtonText}>
                {isSignUp ? "Already have an account? Sign In" : "Need an account? Create One"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <StatusBar style="light" />
      </SafeAreaView>
    );
  }

  // Groups list screen
  if (currentScreen === "groups") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Groups</Text>
          <TouchableOpacity onPress={handleLogout}>
            <Text style={styles.logoutLink}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {dataError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{dataError}</Text>
          </View>
        )}

        <FlatList
          data={groups}
          keyExtractor={(item) => item.group_id || item._id || String(Math.random())}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No groups yet</Text>
              <Text style={styles.emptySubtext}>Create one on the web app</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => goToGroup(item.group_id || item._id, item.name)}
            >
              <View style={styles.cardRow}>
                <View>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardSubtitle}>{item.member_count || 0} members</Text>
                </View>
                <Text style={styles.arrow}>›</Text>
              </View>
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
        <StatusBar style="light" />
      </SafeAreaView>
    );
  }

  // Group detail screen
  if (currentScreen === "group") {
    const members = groupDetails?.members || [];
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack}>
            <Text style={styles.backButton}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{selectedGroupName}</Text>
          <View style={{ width: 50 }} />
        </View>

        {dataError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{dataError}</Text>
          </View>
        )}

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        >
          <Text style={styles.sectionTitle}>Members ({members.length})</Text>
          <View style={styles.card}>
            {members.length === 0 ? (
              <Text style={styles.emptyText}>No members</Text>
            ) : (
              members.slice(0, 10).map((m: any, idx: number) => (
                <View key={m.user_id || idx}>
                  <Text style={styles.memberName}>{m.name || m.email || "Member"}</Text>
                  <Text style={styles.memberRole}>{m.role || "member"}</Text>
                  {idx < members.length - 1 && <View style={styles.divider} />}
                </View>
              ))
            )}
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Games ({games.length})</Text>
          {games.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.emptyText}>No games yet</Text>
            </View>
          ) : (
            games.map((g: any) => (
              <TouchableOpacity
                key={g.game_id || g._id}
                style={[styles.card, { marginBottom: 12 }]}
                onPress={() => goToGame(g.game_id || g._id)}
              >
                <View style={styles.cardRow}>
                  <View>
                    <Text style={styles.cardTitle}>{g.title || "Game"}</Text>
                    <Text style={styles.cardSubtitle}>Status: {g.status}</Text>
                  </View>
                  <Text style={styles.arrow}>›</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
        <StatusBar style="light" />
      </SafeAreaView>
    );
  }

  // Game detail screen
  if (currentScreen === "game") {
    const players = gameDetails?.players || [];
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack}>
            <Text style={styles.backButton}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Game</Text>
          <View style={{ width: 50 }} />
        </View>

        {dataError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{dataError}</Text>
          </View>
        )}

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        >
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{gameDetails?.title || "Game"}</Text>
            <Text style={styles.cardSubtitle}>Status: {gameDetails?.status}</Text>
            <Text style={styles.cardSubtitle}>Buy-in: ${gameDetails?.buy_in_amount || 0}</Text>
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Players ({players.length})</Text>
          <View style={styles.card}>
            {players.length === 0 ? (
              <Text style={styles.emptyText}>No players</Text>
            ) : (
              players.map((p: any, idx: number) => (
                <View key={p.player_id || idx}>
                  <View style={styles.playerRow}>
                    <Text style={styles.playerName}>{p.name || p.email || "Player"}</Text>
                    <Text style={styles.playerChips}>{p.chips || 0} chips</Text>
                  </View>
                  <Text style={styles.playerStats}>
                    Buy-in: ${p.total_buy_in || 0} • Cash-out: ${p.cash_out || 0}
                  </Text>
                  {idx < players.length - 1 && <View style={styles.divider} />}
                </View>
              ))
            )}
          </View>

          <View style={[styles.card, { marginTop: 24 }]}>
            <Text style={styles.infoTitle}>📱 Mobile v0.2</Text>
            <Text style={styles.infoText}>✅ View groups, games, players</Text>
            <Text style={styles.infoText}>🚧 Actions coming: buy-in, cash-out</Text>
          </View>
        </ScrollView>
        <StatusBar style="light" />
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: "#999",
    textAlign: "center",
    marginBottom: 48,
  },
  form: {
    gap: 12,
  },
  input: {
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: "#fff",
    marginBottom: 4,
  },
  button: {
    backgroundColor: "#3b82f6",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    padding: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#3b82f6",
    fontSize: 14,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  backButton: {
    color: "#3b82f6",
    fontSize: 16,
  },
  logoutLink: {
    color: "#ef4444",
    fontSize: 14,
  },
  listContainer: {
    padding: 16,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    backgroundColor: "#141421",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: 16,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  cardSubtitle: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    marginTop: 4,
  },
  arrow: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 24,
  },
  sectionTitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  memberName: {
    color: "#fff",
    fontSize: 15,
  },
  memberRole: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    marginTop: 2,
  },
  playerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  playerName: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "500",
  },
  playerChips: {
    color: "#22c55e",
    fontSize: 14,
    fontWeight: "600",
  },
  playerStats: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginVertical: 12,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
  },
  emptySubtext: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 12,
    marginTop: 4,
  },
  errorBanner: {
    backgroundColor: "rgba(239,68,68,0.2)",
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 14,
  },
  infoTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  infoText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    marginTop: 4,
  },
});
