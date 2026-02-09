import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { supabase } from "../lib/supabase";
import { api } from "../api/client";
import { createSocket, disconnectSocket } from "../lib/socket";
import { Socket } from "socket.io-client";

type TestResult = {
  status: "pending" | "success" | "error";
  message: string;
};

export default function TestScreen() {
  const [user, setUser] = useState<any>(null);
  const [apiTest, setApiTest] = useState<TestResult>({
    status: "pending",
    message: "Not tested",
  });
  const [socketTest, setSocketTest] = useState<TestResult>({
    status: "pending",
    message: "Not tested",
  });
  const [lastEvent, setLastEvent] = useState<string>("None");
  const [deepLink, setDeepLink] = useState<string>("Not tested");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Get current user
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          email: session.user.email,
          id: session.user.id,
        });
      }
    });

    // Auto-run tests on mount
    runAllTests();

    return () => {
      disconnectSocket();
    };
  }, []);

  async function runAllTests() {
    setLoading(true);
    await testAPI();
    await testSocket();
    setLoading(false);
  }

  async function testAPI() {
    try {
      const response = await api.get("/groups");
      setApiTest({
        status: "success",
        message: `✅ ${response.data.length} groups fetched`,
      });
    } catch (error: any) {
      setApiTest({
        status: "error",
        message: `❌ ${error.response?.status || error.message}`,
      });
    }
  }

  async function testSocket() {
    try {
      const sock = await createSocket();
      setSocket(sock);

      sock.on("connect", () => {
        setSocketTest({
          status: "success",
          message: `✅ Connected (${sock.id})`,
        });
      });

      sock.on("connect_error", (error) => {
        setSocketTest({
          status: "error",
          message: `❌ ${error.message}`,
        });
      });

      sock.on("game_update", (data) => {
        setLastEvent(
          `${data.type} at ${new Date(data.timestamp).toLocaleTimeString()}`
        );
      });

      sock.on("notification", (data) => {
        setLastEvent(
          `${data.type} at ${new Date(data.timestamp).toLocaleTimeString()}`
        );
      });

      // Test joining a game room (will fail gracefully if no games)
      sock.emit("join_game", { game_id: "test" }, (response: any) => {
        console.log("join_game response:", response);
      });
    } catch (error: any) {
      setSocketTest({
        status: "error",
        message: `❌ ${error.message}`,
      });
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    disconnectSocket();
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "#22c55e";
      case "error":
        return "#ef4444";
      default:
        return "#999";
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Phase 0 Status Board</Text>

        {/* User Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Authentication</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{user?.email || "Loading..."}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>User ID:</Text>
            <Text style={[styles.value, styles.small]}>
              {user?.id || "Loading..."}
            </Text>
          </View>
        </View>

        {/* API Test */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>API Connection</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Status:</Text>
            <Text style={[styles.value, { color: getStatusColor(apiTest.status) }]}>
              {apiTest.message}
            </Text>
          </View>
        </View>

        {/* Socket Test */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Socket.IO</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Status:</Text>
            <Text style={[styles.value, { color: getStatusColor(socketTest.status) }]}>
              {socketTest.message}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Last Event:</Text>
            <Text style={styles.value}>{lastEvent}</Text>
          </View>
        </View>

        {/* Deep Link */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Deep Linking</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Status:</Text>
            <Text style={styles.value}>{deepLink}</Text>
          </View>
          <Text style={styles.hint}>Test: oddside://test</Text>
        </View>

        {/* Actions */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={runAllTests}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Re-run Tests</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 32,
  },
  section: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#333",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    marginBottom: 8,
    flexWrap: "wrap",
  },
  label: {
    fontSize: 14,
    color: "#999",
    width: 100,
  },
  value: {
    flex: 1,
    fontSize: 14,
    color: "#fff",
  },
  small: {
    fontSize: 10,
  },
  hint: {
    fontSize: 12,
    color: "#666",
    marginTop: 8,
    fontStyle: "italic",
  },
  button: {
    backgroundColor: "#3b82f6",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  logoutButton: {
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#ef4444",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  logoutButtonText: {
    color: "#ef4444",
    fontSize: 16,
    fontWeight: "600",
  },
});
