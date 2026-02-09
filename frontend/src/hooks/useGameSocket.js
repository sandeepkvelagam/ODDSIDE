import { useEffect, useRef, useCallback, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '@/context/AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const SOCKET_URL = process.env.REACT_APP_BACKEND_URL?.replace('/api', '') || '';

export function useGameSocket(gameId) {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const listenersRef = useRef({});

  // Connect to socket
  useEffect(() => {
    if (!user?.user_id || !gameId) return;

    // Get JWT token from Supabase session
    const connectSocket = async () => {
      let authPayload = { user_id: user.user_id }; // Fallback for non-Supabase

      if (isSupabaseConfigured() && supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            authPayload = { token: session.access_token }; // Send JWT
          }
        } catch (error) {
          console.error('Error getting auth token for socket:', error);
        }
      }

      const socket = io(SOCKET_URL, {
        auth: authPayload,
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('✅ Socket connected');
        setIsConnected(true);
        // Join game room
        socket.emit('join_game', { game_id: gameId });
      });

      socket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error.message);
        setIsConnected(false);
      });

      socket.on('disconnect', () => {
        console.log('Socket disconnected');
        setIsConnected(false);
      });

      socket.on('game_update', (data) => {
        console.log('Game update:', data);
        setLastEvent(data);

        // Call registered listeners
        const handler = listenersRef.current[data.type];
        if (handler) {
          handler(data);
        }

        // Call generic handler
        if (listenersRef.current['*']) {
          listenersRef.current['*'](data);
        }
      });

      socket.on('notification', (data) => {
        console.log('Notification:', data);
        if (listenersRef.current['notification']) {
          listenersRef.current['notification'](data);
        }
      });

      return () => {
        if (socketRef.current) {
          socketRef.current.emit('leave_game', { game_id: gameId });
          socketRef.current.disconnect();
        }
      };
    };

    connectSocket();

    // Cleanup function
    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave_game', { game_id: gameId });
        socketRef.current.disconnect();
      }
    };
  }, [user?.user_id, gameId]);

  // Register event listener
  const on = useCallback((eventType, handler) => {
    listenersRef.current[eventType] = handler;
    return () => {
      delete listenersRef.current[eventType];
    };
  }, []);

  // Remove event listener
  const off = useCallback((eventType) => {
    delete listenersRef.current[eventType];
  }, []);

  return {
    isConnected,
    lastEvent,
    on,
    off,
  };
}

// Hook for notifications socket
export function useNotificationSocket() {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!user?.user_id) return;

    const connectSocket = async () => {
      let authPayload = { user_id: user.user_id }; // Fallback

      if (isSupabaseConfigured() && supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            authPayload = { token: session.access_token }; // Send JWT
          }
        } catch (error) {
          console.error('Error getting auth token for notifications:', error);
        }
      }

      const socket = io(SOCKET_URL, {
        auth: authPayload,
        transports: ['websocket', 'polling'],
      });

      socketRef.current = socket;

      socket.on('notification', (data) => {
        setNotifications(prev => [data, ...prev]);
      });

      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
      };
    };

    connectSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [user?.user_id]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return { notifications, clearNotifications };
}
