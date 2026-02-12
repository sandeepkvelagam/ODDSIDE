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
import { useTheme } from "../context/ThemeContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = SCREEN_WIDTH * 0.75;

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
  children: React.ReactNode;
};

export function AppDrawer({
  menuItems,
  recentItems = [],
  userName,
  onProfilePress,
  onNewPress,
  children,
}: Props) {
  const { colors } = useTheme();

  const { isOpen, closeDrawer } = useDrawer();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: DRAWER_WIDTH,
          useNativeDriver: true,
          friction: 10,
          tension: 65,
        }),
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          friction: 10,
          tension: 65,
        }),
        Animated.timing(overlayAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen, slideAnim, overlayAnim]);

  const userInitial = userName?.[0]?.toUpperCase() || "?";

  return (
    <View style={[styles.root, { backgroundColor: colors.navBg }]}>
      {/* Nav Sidebar */}
      <View
        style={[
          styles.navSidebar,
          {
            backgroundColor: colors.navBg,
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 16,
          },
        ]}
      >
        {/* Logo */}
        <View style={styles.logoSection}>
          <Text style={[styles.logo, { color: colors.textPrimary }]}>Kvitt</Text>
        </View>

        {/* Nav Items */}
        <View style={styles.navSection}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.navItem}
              onPress={() => {
                item.onPress();
                closeDrawer();
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={item.icon}
                size={24}
                color={colors.textSecondary}
                style={styles.navIcon}
              />
              <Text style={[styles.navLabel, { color: colors.textSecondary }]}>
                {item.label}
              </Text>
              {item.badge !== undefined && item.badge > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.orange }]}>
                  <Text style={styles.badgeText}>
                    {item.badge > 99 ? "99+" : item.badge}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Recents Section */}
        {recentItems.length > 0 && (
          <View style={styles.recentsSection}>
            <Text style={[styles.recentsLabel, { color: colors.textMuted }]}>
              Recents
            </Text>
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
                  <Text
                    style={[styles.recentTitle, { color: colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          <TouchableOpacity style={styles.allGamesRow} activeOpacity={0.7}>
            <Text style={[styles.allGamesText, { color: colors.textMuted }]}>
              All games
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Profile Pill + FAB Row */}
          <View style={styles.bottomRow}>
            <TouchableOpacity
              style={[
                styles.profilePill,
                { backgroundColor: colors.profileBg, borderColor: colors.border },
              ]}
              onPress={() => {
                onProfilePress();
                // Don't close drawer - Settings will overlay on top
              }}
              activeOpacity={0.7}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{userInitial}</Text>
              </View>
              <Text style={[styles.profileName, { color: colors.textPrimary }]} numberOfLines={1}>
                {userName}
              </Text>
            </TouchableOpacity>

            {/* FAB */}
            <TouchableOpacity
              style={[styles.fab, { backgroundColor: colors.orange }]}
              onPress={() => {
                onNewPress();
                closeDrawer();
              }}
              activeOpacity={0.9}
            >
              <Ionicons name="add" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Content Panel */}
      <Animated.View
        style={[
          styles.contentPanel,
          {
            backgroundColor: colors.contentBg,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        {children}

        {/* Overlay */}
        <Animated.View
          style={[
            styles.contentOverlay,
            {
              opacity: overlayAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.3],
              }),
            },
          ]}
          pointerEvents={isOpen ? "auto" : "none"}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  navSidebar: {
    position: "absolute",
    top: 0,
    left: 0,
    width: DRAWER_WIDTH,
    height: "100%",
  },
  logoSection: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  logo: {
    fontSize: 28,
    fontWeight: "600",
    letterSpacing: -0.5,
  },
  navSection: {
    paddingHorizontal: 12,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  navIcon: {
    width: 28,
    marginRight: 14,
  },
  navLabel: {
    fontSize: 17,
    fontWeight: "400",
    flex: 1,
  },
  badge: {
    borderRadius: 10,
    minWidth: 22,
    height: 22,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  recentsSection: {
    paddingHorizontal: 20,
    marginTop: 28,
    flex: 1,
  },
  recentsLabel: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 14,
  },
  recentsList: {
    flex: 1,
  },
  recentItem: {
    paddingVertical: 12,
  },
  recentTitle: {
    fontSize: 16,
  },
  spacer: {
    flex: 1,
  },
  bottomSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  allGamesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 14,
  },
  allGamesText: {
    fontSize: 15,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  profilePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 999,
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: 16,
    borderWidth: 1,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  profileName: {
    fontSize: 14,
    fontWeight: "500",
  },
  fab: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  contentPanel: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 48,
    borderBottomLeftRadius: 48,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 20,
  },
  contentOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },
});
