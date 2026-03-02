import { io, Socket } from "socket.io-client";
import { supabase } from "./supabase";

const socketUrl = process.env.EXPO_PUBLIC_SOCKET_URL!;

if (!socketUrl) {
  throw new Error("Missing EXPO_PUBLIC_SOCKET_URL in .env");
}

let socket: Socket | null = null;

export async function createSocket(): Promise<Socket> {
  // Disconnect existing socket if any
  if (socket?.connected) {
    socket.disconnect();
  }

  // Get auth token from Supabase
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (!token) {
    throw new Error("No session token available for Socket.IO connection");
  }

  // Create socket with JWT auth — dynamic auth refreshes token on each reconnect
  socket = io(socketUrl, {
    auth: async (cb) => {
      const { data: freshData } = await supabase.auth.getSession();
      cb({ token: freshData.session?.access_token ?? token });
    },
    transports: ["websocket"],
    reconnection: true,
    reconnectionDelay: 800,
    reconnectionDelayMax: 8000,
    randomizationFactor: 0.4,
    reconnectionAttempts: Infinity,
    timeout: 10000,
  });

  socket.on("connect", () => {
    console.log("✅ Socket.IO connected:", socket?.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("❌ Socket.IO disconnected:", reason);
  });

  socket.on("connect_error", async (error) => {
    console.error("Socket.IO connection error:", error.message);
    const msg = (error.message || "").toLowerCase();
    if (msg.includes("jwt") || msg.includes("auth") || msg.includes("expired")) {
      try {
        await supabase.auth.refreshSession();
      } catch {}
    }
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
