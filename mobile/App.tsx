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

// Direct Supabase import to avoid any module issues
import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import axios from "axios";

// SecureStore adapter
const storage = {
  getItem: async (key: string) => {
    try { return await SecureStore.getItemAsync(key); } 
    catch { return null; }
  },
  setItem: async (key: string, value: string) => {
    try { await SecureStore.setItemAsync(key, value); } 
    catch {}
  },
  removeItem: async (key: string) => {
    try { await SecureStore.deleteItemAsync(key); } 
    catch {}
  },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://kvitt-ledger.preview.emergentagent.com";

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { storage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});

// Types
type Screen = "login" | "groups" | "group" | "game";
type Group = { _id?: string; group_id?: string; name: string; member_count?: number; members?: any[] };
type Game = { _id?: string; game_id?: string; title?: string; status: string; buy_in_amount?: number; players?: any[] };

export default function App() {
  // Auth
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [isSignUp, setIsSignUp] = useState(false);

  // Navigation
  const [screen, setScreen] = useState<Screen>("login");
  const [selectedGroup, setSelectedGroup] = useState<{ id: string; name: string } | null>(null);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  // Data
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupDetail, setGroupDetail] = useState<any>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [gameDetail, setGameDetail] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auth check
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) setScreen("groups");
      setCheckingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, sess) => {
      setSession(sess);
      setScreen(sess ? "groups" : "login");
    });

    return () => subscription.unsubscribe();
  }, []);

  // Data fetching
  const getHeaders = async () => {
    const { data } = await supabase.auth.getSession();
    return { Authorization: `Bearer ${data.session?.access_token}`, "Content-Type": "application/json" };
  };

  const fetchGroups = async () => {
    try {
      setError(null);
      const headers = await getHeaders();
      const res = await axios.get(`${API_URL}/api/groups`, { headers });
      setGroups(res.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Failed to load");
    }
  };

  const fetchGroupDetail = async (groupId: string) => {
    try {
      setError(null);
      const headers = await getHeaders();
      const [g, gs] = await Promise.all([
        axios.get(`${API_URL}/api/groups/${groupId}`, { headers }),
        axios.get(`${API_URL}/api/groups/${groupId}/games`, { headers }),
      ]);
      setGroupDetail(g.data);
      setGames(gs.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Failed to load");
    }
  };

  const fetchGameDetail = async (gameId: string) => {
    try {
      setError(null);
      const headers = await getHeaders();
      const res = await axios.get(`${API_URL}/api/games/${gameId}`, { headers });
      setGameDetail(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Failed to load");
    }
  };

  useEffect(() => {
    if (screen === "groups" && session) fetchGroups();
  }, [screen, session]);

  useEffect(() => {
    if (screen === "group" && selectedGroup) fetchGroupDetail(selectedGroup.id);
  }, [screen, selectedGroup]);

  useEffect(() => {
    if (screen === "game" && selectedGameId) fetchGameDetail(selectedGameId);
  }, [screen, selectedGameId]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (screen === "groups") await fetchGroups();
    else if (screen === "group" && selectedGroup) await fetchGroupDetail(selectedGroup.id);
    else if (screen === "game" && selectedGameId) await fetchGameDetail(selectedGameId);
    setRefreshing(false);
  };

  // Auth handlers
  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Enter email and password");
      return;
    }
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        Alert.alert("Success", "Check email to confirm, then sign in");
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: () => supabase.auth.signOut() },
    ]);
  };

  // Navigation
  const goToGroup = (id: string, name: string) => {
    setSelectedGroup({ id, name });
    setScreen("group");
  };

  const goToGame = (id: string) => {
    setSelectedGameId(id);
    setScreen("game");
  };

  const goBack = () => {
    if (screen === "game") { setScreen("group"); setGameDetail(null); }
    else if (screen === "group") { setScreen("groups"); setGroupDetail(null); setGames([]); }
  };

  // Loading
  if (checkingAuth) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.center}><ActivityIndicator size="large" color="#3b82f6" /></View>
        <StatusBar style="light" />
      </SafeAreaView>
    );
  }

  // Login
  if (!session) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.content}>
          <Text style={s.title}>Kvitt</Text>
          <Text style={s.subtitle}>Poker Game Ledger</Text>
          <TextInput style={s.input} placeholder="Email" placeholderTextColor="#666" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <TextInput style={s.input} placeholder="Password" placeholderTextColor="#666" value={password} onChangeText={setPassword} secureTextEntry />
          <TouchableOpacity style={[s.btn, loading && s.btnOff]} onPress={handleAuth} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>{isSignUp ? "Create Account" : "Sign In"}</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={s.link} onPress={() => setIsSignUp(!isSignUp)}>
            <Text style={s.linkTxt}>{isSignUp ? "Have account? Sign In" : "Need account? Create"}</Text>
          </TouchableOpacity>
        </View>
        <StatusBar style="light" />
      </SafeAreaView>
    );
  }

  // Groups
  if (screen === "groups") {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <Text style={s.headerTitle}>Groups</Text>
          <TouchableOpacity onPress={handleSignOut}><Text style={s.signOut}>Sign Out</Text></TouchableOpacity>
        </View>
        {error && <View style={s.err}><Text style={s.errTxt}>{error}</Text></View>}
        <FlatList
          data={groups}
          keyExtractor={(i) => i._id || i.group_id || Math.random().toString()}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
          ListEmptyComponent={<View style={s.empty}><Text style={s.emptyTxt}>No groups</Text></View>}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.card} onPress={() => goToGroup(item._id || item.group_id || "", item.name)}>
              <View style={s.row}><Text style={s.cardTitle}>{item.name}</Text><Text style={s.arrow}>›</Text></View>
              <Text style={s.cardSub}>{item.member_count || 0} members</Text>
            </TouchableOpacity>
          )}
        />
        <StatusBar style="light" />
      </SafeAreaView>
    );
  }

  // Group detail
  if (screen === "group") {
    const members = groupDetail?.members || [];
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={goBack}><Text style={s.back}>‹ Back</Text></TouchableOpacity>
          <Text style={s.headerTitle}>{selectedGroup?.name}</Text>
          <View style={{ width: 50 }} />
        </View>
        {error && <View style={s.err}><Text style={s.errTxt}>{error}</Text></View>}
        <ScrollView contentContainerStyle={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}>
          <Text style={s.section}>MEMBERS ({members.length})</Text>
          <View style={s.card}>
            {members.length === 0 ? <Text style={s.emptyTxt}>No members</Text> : members.map((m: any, i: number) => (
              <View key={m.user_id || i}>
                <Text style={s.memberName}>{m.name || m.email || "Member"}</Text>
                <Text style={s.memberRole}>{m.role === "admin" ? "👑 Admin" : "Member"}</Text>
                {i < members.length - 1 && <View style={s.divider} />}
              </View>
            ))}
          </View>
          <Text style={[s.section, { marginTop: 20 }]}>GAMES ({games.length})</Text>
          {games.length === 0 ? (
            <View style={s.card}><Text style={s.emptyTxt}>No games</Text></View>
          ) : games.map((g) => (
            <TouchableOpacity key={g._id || g.game_id} style={[s.card, { marginBottom: 12 }]} onPress={() => goToGame(g._id || g.game_id || "")}>
              <View style={s.row}><Text style={s.cardTitle}>{g.title || "Game"}</Text><Text style={s.arrow}>›</Text></View>
              <Text style={s.cardSub}>Status: {g.status}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <StatusBar style="light" />
      </SafeAreaView>
    );
  }

  // Game detail
  if (screen === "game") {
    const players = gameDetail?.players || [];
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={goBack}><Text style={s.back}>‹ Back</Text></TouchableOpacity>
          <Text style={s.headerTitle}>Game</Text>
          <View style={{ width: 50 }} />
        </View>
        {error && <View style={s.err}><Text style={s.errTxt}>{error}</Text></View>}
        <ScrollView contentContainerStyle={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}>
          <View style={s.card}>
            <Text style={s.cardTitle}>{gameDetail?.title || "Game"}</Text>
            <Text style={s.cardSub}>Status: {gameDetail?.status} • Buy-in: ${gameDetail?.buy_in_amount || 0}</Text>
          </View>
          <Text style={[s.section, { marginTop: 20 }]}>PLAYERS ({players.length})</Text>
          <View style={s.card}>
            {players.length === 0 ? <Text style={s.emptyTxt}>No players</Text> : players.map((p: any, i: number) => (
              <View key={p.player_id || i}>
                <View style={s.row}>
                  <Text style={s.memberName}>{p.name || p.email || "Player"}</Text>
                  <Text style={s.chips}>{p.chips || 0} chips</Text>
                </View>
                <Text style={s.cardSub}>Buy-in: ${p.total_buy_in || 0} • Cash: ${p.cash_out || 0}</Text>
                {i < players.length - 1 && <View style={s.divider} />}
              </View>
            ))}
          </View>
          <View style={[s.card, { marginTop: 20 }]}>
            <Text style={s.cardTitle}>📱 Mobile v0.3</Text>
            <Text style={s.cardSub}>✅ Full navigation • SecureStore • Pull to refresh</Text>
          </View>
        </ScrollView>
        <StatusBar style="light" />
      </SafeAreaView>
    );
  }

  return null;
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { flex: 1, justifyContent: "center", padding: 24 },
  title: { fontSize: 48, fontWeight: "bold", color: "#fff", textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 18, color: "#999", textAlign: "center", marginBottom: 48 },
  input: { backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "#333", borderRadius: 10, padding: 16, fontSize: 16, color: "#fff", marginBottom: 12 },
  btn: { backgroundColor: "#3b82f6", padding: 16, borderRadius: 10, alignItems: "center", marginTop: 8 },
  btnOff: { opacity: 0.6 },
  btnTxt: { color: "#fff", fontSize: 16, fontWeight: "600" },
  link: { padding: 12, alignItems: "center" },
  linkTxt: { color: "#3b82f6", fontSize: 14 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#222" },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "600" },
  back: { color: "#3b82f6", fontSize: 16 },
  signOut: { color: "#ef4444", fontSize: 14 },
  list: { padding: 16 },
  scroll: { padding: 16 },
  card: { backgroundColor: "#141421", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", borderRadius: 12, padding: 16 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { color: "#fff", fontSize: 16, fontWeight: "600" },
  cardSub: { color: "rgba(255,255,255,0.5)", fontSize: 14, marginTop: 4 },
  arrow: { color: "rgba(255,255,255,0.3)", fontSize: 24 },
  section: { color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: "600", letterSpacing: 1, marginBottom: 8 },
  memberName: { color: "#fff", fontSize: 15, fontWeight: "500" },
  memberRole: { color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 2 },
  chips: { color: "#22c55e", fontSize: 16, fontWeight: "700" },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginVertical: 12 },
  empty: { alignItems: "center", paddingVertical: 40 },
  emptyTxt: { color: "rgba(255,255,255,0.5)", fontSize: 14 },
  err: { backgroundColor: "rgba(239,68,68,0.15)", padding: 12, marginHorizontal: 16, marginTop: 8, borderRadius: 8 },
  errTxt: { color: "#fca5a5", fontSize: 14 },
});
