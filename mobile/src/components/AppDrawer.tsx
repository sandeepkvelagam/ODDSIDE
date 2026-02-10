import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDrawer } from "../context/DrawerContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = SCREEN_WIDTH * 0.82;

// Glass design colors
const COLORS = {
  background: "#141414",
  surface: "rgba(255,255,255,0.08)",
  textPrimary: "rgba(255,255,255,0.92)",
  textSecondary: "rgba(255,255,255,0.55)",
  textMuted: "rgba(255,255,255,0.35)",
  border: "rgba(255,255,255,0.14)",
  borderLight: "rgba(255,255,255,0.08)",
  orange: "#D77A42",
};

type MenuItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  badge?: number;
};

type RecentItem = {
  id: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
};

type Props = {
  menuItems: MenuItem[];
  recentItems?: RecentItem[];
  userName: string;
  userEmail?: string;
  onProfilePress: () => void;
  onNewPress: () => void;
};

export function AppDrawer({
  menuItems,
  recentItems = [],
  userName,
  userEmail,
  onProfilePress,
  onNewPress,
}: Props) {
  const { isOpen, closeDrawer } = useDrawer();
  const insets = useSafeAreaInsets();
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          friction: 10,
          tension: 65,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: -DRAWER_WIDTH,
          useNativeDriver: true,
          friction: 10,
          tension: 65,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen, translateX, overlayOpacity]);

  const userInitial = userName?.[0]?.toUpperCase() || "?";

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={isOpen ? "auto" : "none"}>
      {/* Overlay */}
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} />
      </Animated.View>

      {/* Drawer */}
      <Animated.View
        style={[
          styles.drawer,
          {
            width: DRAWER_WIDTH,
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 16,
            transform: [{ translateX }],
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>Kvitt</Text>
        </View>

        {/* Recents Section */}
        {recentItems.length > 0 && (
          <View style={styles.recentsSection}>
            <TouchableOpacity style={styles.recentsHeader} activeOpacity={0.7}>
              <Text style={styles.recentsTitle}>All games</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <ScrollView style={styles.recentsList} showsVerticalScrollIndicator={false}>
              {recentItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.recentItem}
                  onPress={() => {
                    item.onPress();
                    closeDrawer();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.recentTitle} numberOfLines={1}>{item.title}</Text>
                  {item.subtitle && (
                    <Text style={styles.recentSubtitle} numberOfLines={1}>{item.subtitle}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Menu Items */}
        <View style={styles.menuSection}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => {
                item.onPress();
                closeDrawer();
              }}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconBox}>
                <Ionicons name={item.icon} size={20} color={COLORS.textPrimary} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              {item.badge !== undefined && item.badge > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.badge > 99 ? "99+" : item.badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Bottom Profile Bar */}
        <View style={styles.bottomBar}>
          {/* Profile Chip */}
          <TouchableOpacity 
            style={styles.profileChip} 
            onPress={onProfilePress}
            activeOpacity={0.7}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{userInitial}</Text>
            </View>
            <Text style={styles.profileName} numberOfLines={1}>{userName}</Text>
          </TouchableOpacity>

          {/* FAB */}
          <TouchableOpacity 
            style={styles.fab} 
            onPress={onNewPress}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  drawer: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: "rgba(20,20,20,0.95)",
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  logo: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  recentsSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  recentsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 4,
  },
  recentsTitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  recentsList: {
    maxHeight: 160,
  },
  recentItem: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  recentTitle: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: "500",
  },
  recentSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  menuSection: {
    paddingHorizontal: 12,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  menuIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  menuLabel: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: "500",
    flex: 1,
  },
  badge: {
    backgroundColor: COLORS.orange,
    borderRadius: 10,
    minWidth: 22,
    height: 22,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  spacer: {
    flex: 1,
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  profileChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    flex: 1,
    marginRight: 12,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: COLORS.textPrimary,
    fontWeight: "700",
    fontSize: 14,
  },
  profileName: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.orange,
    alignItems: "center",
    justifyContent: "center",
  },
});
