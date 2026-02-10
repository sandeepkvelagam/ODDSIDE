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
const DRAWER_WIDTH = SCREEN_WIDTH * 0.75;

// Claude-style warm dark theme colors
const COLORS = {
  navBg: "#1a1816", // Warm dark for nav/base
  contentBg: "#252320", // Lighter warm dark for content panel
  textPrimary: "#ffffff",
  textSecondary: "#9a9a9a",
  textMuted: "#666666",
  border: "rgba(255, 255, 255, 0.06)",
  glassBg: "rgba(255, 255, 255, 0.05)",
  glassBorder: "rgba(255, 255, 255, 0.08)",
  hoverBg: "rgba(255, 255, 255, 0.05)",
  profileBg: "#2a2826",
  orange: "#e8845c",
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
  children: React.ReactNode;
};

export function AppDrawer({
  menuItems,
  recentItems = [],
  userName,
  userEmail,
  onProfilePress,
  onNewPress,
  children,
}: Props) {
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
    <View style={styles.root}>
      {/* Nav Sidebar - Base layer (doesn't move) */}
      <View
        style={[
          styles.navSidebar,
          {
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 16,
          },
        ]}
      >
        {/* Logo */}
        <View style={styles.logoSection}>
          <Text style={styles.logo}>Kvitt</Text>
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
                size={22}
                color={COLORS.textSecondary}
                style={styles.navIcon}
              />
              <Text style={styles.navLabel}>{item.label}</Text>
              {item.badge !== undefined && item.badge > 0 && (
                <View style={styles.badge}>
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
            <Text style={styles.recentsLabel}>RECENTS</Text>
            <ScrollView
              style={styles.recentsList}
              showsVerticalScrollIndicator={false}
            >
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
            <Text style={styles.allGamesText}>All games</Text>
            <Ionicons
              name="chevron-forward"
              size={14}
              color={COLORS.textMuted}
            />
          </TouchableOpacity>

          {/* Profile Pill */}
          <TouchableOpacity
            style={styles.profilePill}
            onPress={() => {
              onProfilePress();
              closeDrawer();
            }}
            activeOpacity={0.7}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{userInitial}</Text>
            </View>
            <Text style={styles.profileName} numberOfLines={1}>
              {userName}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content Panel - Slides right with rounded left edge */}
      <Animated.View
        style={[
          styles.contentPanel,
          {
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        {children}

        {/* Overlay on content when drawer open */}
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

      {/* FAB - Fixed position, always visible */}
      <Animated.View
        style={[
          styles.fabContainer,
          {
            transform: [{ translateX: slideAnim }],
            bottom: insets.bottom + 100,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            onNewPress();
            closeDrawer();
          }}
          activeOpacity={0.9}
        >
          <Ionicons name="sparkles" size={24} color="#fff5ee" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.navBg,
  },

  /* Nav Sidebar - Base layer */
  navSidebar: {
    position: "absolute",
    top: 0,
    left: 0,
    width: DRAWER_WIDTH,
    height: "100%",
    backgroundColor: COLORS.navBg,
  },
  logoSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  logo: {
    fontSize: 26,
    fontWeight: "600",
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },

  /* Nav Items */
  navSection: {
    paddingHorizontal: 12,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  navIcon: {
    width: 24,
    marginRight: 12,
  },
  navLabel: {
    fontSize: 15,
    color: COLORS.textSecondary,
    flex: 1,
  },
  badge: {
    backgroundColor: COLORS.orange,
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

  /* Recents */
  recentsSection: {
    paddingHorizontal: 20,
    marginTop: 24,
    flex: 1,
  },
  recentsLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: "500",
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  recentsList: {
    flex: 1,
  },
  recentItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  recentTitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },

  spacer: {
    flex: 1,
  },

  /* Bottom */
  bottomSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  allGamesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 12,
  },
  allGamesText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  profilePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.profileBg,
    borderRadius: 999,
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: 16,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: COLORS.border,
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
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "500",
  },

  /* Content Panel - Rounded left edge */
  contentPanel: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.contentBg,
    borderTopLeftRadius: 28,
    borderBottomLeftRadius: 28,
    overflow: "hidden",
    // Shadow for depth
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

  /* FAB */
  fabContainer: {
    position: "absolute",
    right: 20,
    zIndex: 100,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    // Gradient-like effect with solid color
    backgroundColor: "#e8845c",
    shadowColor: "#e8845c",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
});
