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
            paddingTop: insets.top + 12,
            paddingBottom: insets.bottom + 12,
            transform: [{ translateX }],
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>Kvitt</Text>
        </View>

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
              <Ionicons name={item.icon} size={22} color="#fff" style={styles.menuIcon} />
              <Text style={styles.menuLabel}>{item.label}</Text>
              {item.badge && item.badge > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.badge > 99 ? "99+" : item.badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Recents Section */}
        {recentItems.length > 0 && (
          <View style={styles.recentsSection}>
            <Text style={styles.recentsTitle}>Recents</Text>
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
                  <Text style={styles.recentTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {item.subtitle && (
                    <Text style={styles.recentSubtitle} numberOfLines={1}>
                      {item.subtitle}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Bottom Profile Bar */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={onProfilePress}
            activeOpacity={0.7}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{userName[0]?.toUpperCase() || "?"}</Text>
            </View>
            <Text style={styles.profileName} numberOfLines={1}>
              {userName}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.newButton}
            onPress={onNewPress}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle" size={28} color="#f97316" />
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
    backgroundColor: "#0f0f0f",
    borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.08)",
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  logo: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
  },
  menuSection: {
    paddingHorizontal: 12,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  menuIcon: {
    marginRight: 14,
    opacity: 0.9,
  },
  menuLabel: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "500",
    flex: 1,
  },
  badge: {
    backgroundColor: "#f97316",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  recentsSection: {
    marginTop: 24,
    paddingHorizontal: 12,
    flex: 1,
    maxHeight: 280,
  },
  recentsTitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    fontWeight: "500",
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  recentsList: {
    flex: 1,
  },
  recentItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  recentTitle: {
    fontSize: 15,
    color: "#fff",
    fontWeight: "400",
  },
  recentSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    marginTop: 2,
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  profileButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginRight: 12,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  avatarText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  profileName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  newButton: {
    padding: 4,
  },
});
