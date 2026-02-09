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

  // Create socket with JWT auth
  socket = io(socketUrl, {
    auth: { token },
    transports: ["websocket"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });

  socket.on("connect", () => {
    console.log("✅ Socket.IO connected:", socket?.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("❌ Socket.IO disconnected:", reason);
  });

  socket.on("connect_error", (error) => {
    console.error("Socket.IO connection error:", error.message);
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
