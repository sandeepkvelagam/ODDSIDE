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
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDrawer } from "../context/DrawerContext";
import { ProfileChip } from "./ProfileChip";
import { FloatingActionButton } from "./FloatingActionButton";
import { COLORS, BLUR_INTENSITY } from "../styles/glass";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = SCREEN_WIDTH * 0.82;

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
  }, [isOpen]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={isOpen ? "auto" : "none"}>
      {/* Overlay with blur */}
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        <BlurView intensity={12} tint="dark" style={StyleSheet.absoluteFill} />
        <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} />
      </Animated.View>

      {/* Drawer with glass styling */}
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
        <BlurView intensity={BLUR_INTENSITY} tint="dark" style={StyleSheet.absoluteFill} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>Kvitt</Text>
        </View>

        {/* Recents Section - "All chats" style */}
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
              {item.badge && item.badge > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.badge > 99 ? "99+" : item.badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Bottom Profile Bar - Glass style */}
        <View style={styles.bottomBar}>
          <ProfileChip 
            name={userName} 
            onPress={onProfilePress}
            testID="drawer-profile-chip"
          />
          <FloatingActionButton 
            onPress={onNewPress}
            testID="drawer-fab"
          />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  drawer: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: "rgba(20,20,20,0.85)",
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    overflow: "hidden",
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  logo: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.textPrimary,
    zIndex: 1,
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
    zIndex: 1,
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
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    zIndex: 1,
  },
});
