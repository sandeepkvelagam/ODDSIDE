import { useEffect, useRef, useState, useCallback } from "react";
import { getSocket, createSocket } from "../lib/socket";
import type { Socket } from "socket.io-client";

export type GroupMessage = {
  message_id: string;
  group_id: string;
  user_id: string;
  content: string;
  type: string; // "user" | "ai" | "system"
  reply_to?: string;
  metadata?: Record<string, any>;
  created_at: string;
  edited_at?: string;
  deleted?: boolean;
  user?: { user_id: string; name: string; picture?: string };
  poll?: any;
  poll_result?: any;
};

type TypingUser = {
  user_id: string;
  user_name: string;
  timestamp: number;
};

/**
 * Socket.IO hook for group chat rooms.
 *
 * Reuses the existing socket singleton when available (so game sockets
 * stay connected). A socket can be in multiple rooms simultaneously.
 */
export function useGroupSocket(
  groupId: string,
  onMessage: (msg: GroupMessage) => void
) {
  const socketRef = useRef<Socket | null>(null);
  const onMessageRef = useRef(onMessage);
  const [connected, setConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const typingTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Keep callback ref fresh without re-subscribing
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    let mounted = true;

    async function connect() {
      // Reuse existing socket if connected, otherwise create new
      let socket = getSocket();
      if (!socket || !socket.connected) {
        socket = await createSocket();
      }
      if (!mounted) return;

      socketRef.current = socket;
      setConnected(socket.connected);

      // Join the group room
      socket.emit("join_group", { group_id: groupId }, (ack: any) => {
        if (ack?.error) {
          console.error("join_group failed:", ack.error);
        }
      });

      // Listen for new messages
      const handleMessage = (data: GroupMessage) => {
        if (data.group_id === groupId) {
          onMessageRef.current(data);
        }
      };
      socket.on("group_message", handleMessage);

      // Listen for typing indicators
      const handleTyping = (data: { user_id: string; user_name: string; group_id: string }) => {
        if (data.group_id !== groupId) return;

        setTypingUsers((prev) => {
          const filtered = prev.filter((t) => t.user_id !== data.user_id);
          return [...filtered, { user_id: data.user_id, user_name: data.user_name, timestamp: Date.now() }];
        });

        // Clear existing timer for this user
        if (typingTimersRef.current[data.user_id]) {
          clearTimeout(typingTimersRef.current[data.user_id]);
        }
        // Auto-dismiss after 3 seconds
        typingTimersRef.current[data.user_id] = setTimeout(() => {
          setTypingUsers((prev) => prev.filter((t) => t.user_id !== data.user_id));
          delete typingTimersRef.current[data.user_id];
        }, 3000);
      };
      socket.on("group_typing", handleTyping);

      // Connection state tracking
      const handleConnect = () => mounted && setConnected(true);
      const handleDisconnect = () => mounted && setConnected(false);
      socket.on("connect", handleConnect);
      socket.on("disconnect", handleDisconnect);

      // Cleanup function
      return () => {
        socket!.off("group_message", handleMessage);
        socket!.off("group_typing", handleTyping);
        socket!.off("connect", handleConnect);
        socket!.off("disconnect", handleDisconnect);
        socket!.emit("leave_group", { group_id: groupId });
      };
    }

    let cleanup: (() => void) | undefined;
    connect().then((fn) => {
      cleanup = fn;
    });

    return () => {
      mounted = false;
      cleanup?.();
      // Clear all typing timers
      Object.values(typingTimersRef.current).forEach(clearTimeout);
      typingTimersRef.current = {};
    };
  }, [groupId]);

  const emitTyping = useCallback(
    (userName: string) => {
      socketRef.current?.emit("group_typing", {
        group_id: groupId,
        user_name: userName,
      });
    },
    [groupId]
  );

  return { connected, typingUsers, emitTyping };
}
