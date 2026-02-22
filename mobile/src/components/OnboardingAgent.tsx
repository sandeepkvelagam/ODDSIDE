import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Modal,
  Pressable,
  Dimensions,
} from "react-native";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const STORAGE_KEY = "kvitt_onboarding_completed";

// ─── Design Tokens ────────────────────────────────────────────────────────────

const C = {
  jetDark: "#282B2B",
  jetSurface: "#323535",
  orange: "#EE6C29",
  orangeDark: "#C45A22",
  trustBlue: "#3B82F6",
  moonstone: "#7AA6B3",
  glassBg: "rgba(255,255,255,0.06)",
  glassBorder: "rgba(255,255,255,0.12)",
  innerBg: "rgba(255,255,255,0.03)",
  glowOrange: "rgba(238,108,41,0.15)",
  glowBlue: "rgba(59,130,246,0.15)",
  textPrimary: "#F5F5F5",
  textSecondary: "#B8B8B8",
  textMuted: "#7A7A7A",
  success: "#22C55E",
  danger: "#EF4444",
};

// ─── Step Definitions ─────────────────────────────────────────────────────────

const STEPS = [
  {
    id: "greeting",
    messages: [
      "Hey {name}! I'm your Kvitt agent.",
      "I don't just track games — I can plan your entire poker night end-to-end.",
    ],
    button: "Show me!",
  },
  {
    id: "event_planning",
    messages: [
      "Watch this. One tap is all it takes.",
      null, // demo slot
      "From zero to game night — I handle everything.",
    ],
    button: "That's insane!",
  },
  {
    id: "live_game",
    messages: [
      "When the cards are on the table, I've got you covered.",
      null, // demo slot
      "Live tracking. Real-time updates. Zero manual work.",
    ],
    button: "What happens after?",
  },
  {
    id: "post_game",
    messages: [
      "Game over? I've already done the math.",
      null, // demo slot
      "Auto-settlement. Smart payment reminders. No chasing friends.",
    ],
    button: "That's smart!",
  },
  {
    id: "smart_agent",
    messages: [
      "I don't stop after the game. I keep your crew active.",
      null, // demo slot
      "Weather-aware. Holiday-smart. Always looking out for the next game.",
    ],
    button: "Let's play!",
  },
  {
    id: "completion",
    messages: [
      "You're ready. Create your first group and let me handle the rest.",
      "Tap the help button anytime to see this again.",
    ],
    button: "Start Playing \u2660",
  },
];

// ─── Typewriter Hook ──────────────────────────────────────────────────────────

function useTypewriter(
  text: string,
  active: boolean,
  speed = 35,
  delay = 200
) {
  const [display, setDisplay] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!active) {
      setDisplay("");
      setDone(false);
      return;
    }
    setDisplay("");
    setDone(false);
    let i = 0;
    const startTimer = setTimeout(() => {
      const interval = setInterval(() => {
        if (i < text.length) {
          setDisplay(text.slice(0, i + 1));
          i++;
        } else {
          setDone(true);
          clearInterval(interval);
        }
      }, speed);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(startTimer);
  }, [text, active, speed, delay]);

  return { display, done };
}

// ─── Agent Avatar ─────────────────────────────────────────────────────────────

function AgentAvatar({ bounce }: { bounce?: boolean }) {
  const scale = useRef(new Animated.Value(bounce ? 0 : 1)).current;

  useEffect(() => {
    if (bounce) {
      scale.setValue(0);
      Animated.spring(scale, {
        toValue: 1,
        tension: 80,
        friction: 6,
        useNativeDriver: true,
      }).start();
    }
  }, [bounce]);

  return (
    <Animated.View style={[s.avatar, { transform: [{ scale }] }]}>
      <Text style={s.avatarText}>K</Text>
    </Animated.View>
  );
}

// ─── Thinking Indicator ───────────────────────────────────────────────────────

function ThinkingDots() {
  const dots = [
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
  ];

  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      )
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, []);

  return (
    <View style={s.messageRow}>
      <AgentAvatar />
      <View style={[s.bubble, { paddingHorizontal: 16, paddingVertical: 12 }]}>
        <View style={{ flexDirection: "row", gap: 4 }}>
          {dots.map((dot, i) => (
            <Animated.View
              key={i}
              style={[s.thinkDot, { opacity: dot }]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── Chat Message ─────────────────────────────────────────────────────────────

function ChatMessage({
  text,
  active,
  showAvatar,
  onDone,
}: {
  text: string;
  active: boolean;
  showAvatar: boolean;
  onDone: () => void;
}) {
  const { display, done } = useTypewriter(text, active);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    if (active) {
      opacity.setValue(0);
      translateY.setValue(16);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [active]);

  useEffect(() => {
    if (done) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onDone();
    }
  }, [done]);

  if (!active && !display) return null;

  return (
    <Animated.View
      style={[
        s.messageRow,
        { opacity, transform: [{ translateY }] },
      ]}
    >
      {showAvatar ? <AgentAvatar /> : <View style={{ width: 44 }} />}
      <View style={s.bubble}>
        <Text style={s.bubbleText}>
          {display}
          {!done && <Text style={{ color: C.orange }}>|</Text>}
        </Text>
      </View>
    </Animated.View>
  );
}

// ─── Demo: Event Planning (Step 1) ───────────────────────────────────────────

function EventPlanningDemo({ active }: { active: boolean }) {
  const [phase, setPhase] = useState(0);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const fadeAnims = useRef(
    Array.from({ length: 6 }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    if (!active) {
      setPhase(0);
      fadeAnims.forEach((a) => a.setValue(0));
      return;
    }
    const delays = [0, 1200, 2400, 3600, 4800, 6000];
    delays.forEach((delay, i) => {
      const t = setTimeout(() => {
        setPhase(i + 1);
        Animated.spring(fadeAnims[i], {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }).start();
      }, delay);
      timeouts.current.push(t);
    });
    return () => timeouts.current.forEach(clearTimeout);
  }, [active]);

  const phases = [
    { icon: "people" as const, label: "Checking your group...", sub: "4 members found", color: C.orange },
    { icon: "chatbubbles" as const, label: "Polling availability...", sub: "3 of 4 voted", color: C.trustBlue },
    { icon: "cloud" as const, label: "Checking weather...", sub: "Snowy Saturday — perfect cards night!", color: C.moonstone },
    { icon: "calendar" as const, label: "Saturday 7pm works!", sub: "Best time locked in", color: C.success },
    { icon: "notifications" as const, label: "Sending invites...", sub: "4 invites sent", color: C.orange },
    { icon: "game-controller" as const, label: "Game created!", sub: "$20 buy-in · 20 chips", color: C.success },
  ];

  return (
    <View style={s.demoCard}>
      <View style={s.demoHeader}>
        <Ionicons name="flash" size={14} color={C.orange} />
        <Text style={s.demoHeaderText}>ONE-TAP PLANNING</Text>
      </View>
      {phases.map((p, i) => (
        <Animated.View
          key={i}
          style={[
            s.planRow,
            {
              opacity: fadeAnims[i],
              transform: [
                {
                  translateX: fadeAnims[i].interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={[s.planIcon, { backgroundColor: `${p.color}22` }]}>
            <Ionicons name={p.icon} size={18} color={p.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.planLabel}>{p.label}</Text>
            <Text style={s.planSub}>{p.sub}</Text>
          </View>
          {phase > i && (
            <Ionicons name="checkmark-circle" size={18} color={C.success} />
          )}
        </Animated.View>
      ))}
      {phase >= 6 && (
        <View style={s.demoBadge}>
          <Text style={s.demoBadgeText}>Done in 30 seconds</Text>
        </View>
      )}
    </View>
  );
}

// ─── Demo: Live Game (Step 2) ─────────────────────────────────────────────────

function LiveGameDemo({ active }: { active: boolean }) {
  const [phase, setPhase] = useState(0);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const anims = useRef(
    Array.from({ length: 5 }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    if (!active) {
      setPhase(0);
      anims.forEach((a) => a.setValue(0));
      return;
    }
    const delays = [0, 800, 1600, 2800, 4000];
    delays.forEach((delay, i) => {
      const t = setTimeout(() => {
        setPhase(i + 1);
        Animated.spring(anims[i], {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }).start();
      }, delay);
      timeouts.current.push(t);
    });
    return () => timeouts.current.forEach(clearTimeout);
  }, [active]);

  const players = [
    { name: "You", amount: "$20", chips: "20" },
    { name: "Mike T.", amount: "$20", chips: "20" },
    { name: "Sarah K.", amount: "$30", chips: "30" },
  ];

  const chipBank = phase >= 3 ? "$70" : phase >= 2 ? "$40" : phase >= 1 ? "$20" : "$0";

  return (
    <View style={s.demoCard}>
      <View style={s.demoHeader}>
        <View style={[s.liveDot, phase >= 1 && s.liveDotActive]} />
        <Text style={s.demoHeaderText}>FRIDAY NIGHT POKER</Text>
        <Text style={[s.demoHeaderText, { marginLeft: "auto", color: C.textMuted }]}>
          {phase >= 1 ? "LIVE" : ""}
        </Text>
      </View>

      {players.map((p, i) =>
        phase > i ? (
          <Animated.View
            key={i}
            style={[
              s.playerRow,
              {
                opacity: anims[i] || new Animated.Value(1),
                transform: [
                  {
                    translateY: (anims[i] || new Animated.Value(0)).interpolate({
                      inputRange: [0, 1],
                      outputRange: [12, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={s.playerAvatar}>
              <Text style={s.playerAvatarText}>{p.name[0]}</Text>
            </View>
            <Text style={s.playerName}>{p.name}</Text>
            <Text style={s.playerAmount}>{p.amount}</Text>
            <Text style={s.playerChips}>{p.chips} chips</Text>
          </Animated.View>
        ) : null
      )}

      {phase >= 3 && (
        <Animated.View
          style={[
            s.chipBankRow,
            {
              opacity: anims[3] || new Animated.Value(1),
            },
          ]}
        >
          <Text style={s.chipBankLabel}>Chip Bank</Text>
          <Text style={s.chipBankValue}>{chipBank}</Text>
        </Animated.View>
      )}

      {phase >= 4 && (
        <Animated.View
          style={[
            s.rebuyCard,
            {
              opacity: anims[4] || new Animated.Value(1),
              transform: [
                {
                  translateY: (anims[4] || new Animated.Value(0)).interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={[s.playerAvatar, { width: 28, height: 28 }]}>
              <Text style={[s.playerAvatarText, { fontSize: 11 }]}>M</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.rebuyText}>Mike wants $20 more</Text>
              <Text style={[s.rebuyText, { color: C.textMuted, fontSize: 11 }]}>
                Rebuy request
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            <View style={[s.rebuyBtn, { backgroundColor: C.success + "22" }]}>
              <Text style={[s.rebuyBtnText, { color: C.success }]}>Approve</Text>
            </View>
            <View style={[s.rebuyBtn, { backgroundColor: C.danger + "22" }]}>
              <Text style={[s.rebuyBtnText, { color: C.danger }]}>Reject</Text>
            </View>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

// ─── Demo: Post-Game (Step 3) ─────────────────────────────────────────────────

function PostGameDemo({ active }: { active: boolean }) {
  const [phase, setPhase] = useState(0);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const anims = useRef(
    Array.from({ length: 4 }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    if (!active) {
      setPhase(0);
      anims.forEach((a) => a.setValue(0));
      return;
    }
    const delays = [0, 1500, 3000, 4500];
    delays.forEach((delay, i) => {
      const t = setTimeout(() => {
        setPhase(i + 1);
        Animated.spring(anims[i], {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }).start();
      }, delay);
      timeouts.current.push(t);
    });
    return () => timeouts.current.forEach(clearTimeout);
  }, [active]);

  const results = [
    { name: "You", result: "+$35", color: C.success },
    { name: "Mike", result: "-$15", color: C.danger },
    { name: "Sarah", result: "-$20", color: C.danger },
  ];

  return (
    <View style={s.demoCard}>
      <View style={s.demoHeader}>
        <Ionicons name="trophy" size={14} color={C.orange} />
        <Text style={s.demoHeaderText}>GAME RESULTS</Text>
      </View>

      {/* Phase 1: Results */}
      {phase >= 1 && (
        <Animated.View
          style={[
            s.resultsRow,
            {
              opacity: anims[0],
              transform: [
                {
                  scale: anims[0].interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.9, 1],
                  }),
                },
              ],
            },
          ]}
        >
          {results.map((r, i) => (
            <View key={i} style={s.resultPill}>
              <Text style={s.resultName}>{r.name}</Text>
              <Text style={[s.resultValue, { color: r.color }]}>{r.result}</Text>
            </View>
          ))}
        </Animated.View>
      )}

      {/* Phase 2: Settlement */}
      {phase >= 2 && (
        <Animated.View
          style={[
            s.settlementSection,
            {
              opacity: anims[1],
              transform: [
                {
                  translateY: anims[1].interpolate({
                    inputRange: [0, 1],
                    outputRange: [12, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={s.settlementHeader}>
            <Ionicons name="git-compare" size={14} color={C.trustBlue} />
            <Text style={[s.demoHeaderText, { color: C.trustBlue }]}>SETTLEMENT</Text>
          </View>
          {phase < 3 ? (
            <View style={s.optimizingRow}>
              <Text style={s.optimizingText}>Optimizing payments...</Text>
              <View style={s.shimmer} />
            </View>
          ) : (
            <View style={{ gap: 6 }}>
              <View style={s.paymentRow}>
                <Text style={s.paymentFrom}>Mike</Text>
                <Ionicons name="arrow-forward" size={14} color={C.textMuted} />
                <Text style={s.paymentTo}>You</Text>
                <Text style={s.paymentAmount}>$15</Text>
                <Ionicons name="checkmark-circle" size={16} color={C.success} />
              </View>
              <View style={s.paymentRow}>
                <Text style={s.paymentFrom}>Sarah</Text>
                <Ionicons name="arrow-forward" size={14} color={C.textMuted} />
                <Text style={s.paymentTo}>You</Text>
                <Text style={s.paymentAmount}>$20</Text>
                <Ionicons name="checkmark-circle" size={16} color={C.success} />
              </View>
              <View style={s.demoBadge}>
                <Text style={s.demoBadgeText}>5 payments → 2</Text>
              </View>
            </View>
          )}
        </Animated.View>
      )}

      {/* Phase 4: Payment Reminders */}
      {phase >= 4 && (
        <Animated.View
          style={[
            s.reminderRow,
            {
              opacity: anims[3],
              transform: [
                {
                  translateY: anims[3].interpolate({
                    inputRange: [0, 1],
                    outputRange: [12, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Ionicons name="notifications" size={16} color={C.orange} />
          <Text style={s.reminderText}>Reminder sent to Mike</Text>
          <View style={{ flexDirection: "row", gap: 4 }}>
            <View style={[s.reminderDot, { backgroundColor: C.success }]} />
            <View style={[s.reminderDot, { backgroundColor: C.orange }]} />
            <View style={[s.reminderDot, { backgroundColor: C.danger }]} />
          </View>
          <Text style={s.reminderLabels}>Day 1 · 3 · 7</Text>
        </Animated.View>
      )}
    </View>
  );
}

// ─── Demo: Smart Agent Timeline (Step 4) ──────────────────────────────────────

function SmartAgentDemo({ active }: { active: boolean }) {
  const [phase, setPhase] = useState(0);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const anims = useRef(
    Array.from({ length: 4 }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    if (!active) {
      setPhase(0);
      anims.forEach((a) => a.setValue(0));
      return;
    }
    const delays = [0, 1400, 2800, 4200];
    delays.forEach((delay, i) => {
      const t = setTimeout(() => {
        setPhase(i + 1);
        Animated.spring(anims[i], {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }).start();
      }, delay);
      timeouts.current.push(t);
    });
    return () => timeouts.current.forEach(clearTimeout);
  }, [active]);

  const items = [
    {
      icon: "calendar-outline" as const,
      iconColor: C.trustBlue,
      trigger: "12 days since last game",
      agentMsg: "Time for another round?",
    },
    {
      icon: "snow-outline" as const,
      iconColor: C.moonstone,
      trigger: "Storm this weekend",
      agentMsg: "Perfect excuse for poker!",
    },
    {
      icon: "trophy-outline" as const,
      iconColor: "#EAB308",
      trigger: "New badge: Hot Streak!",
      agentMsg: null,
    },
    {
      icon: "sparkles-outline" as const,
      iconColor: C.orange,
      trigger: "10th game milestone!",
      agentMsg: null,
    },
  ];

  return (
    <View style={s.demoCard}>
      <View style={s.demoHeader}>
        <Ionicons name="pulse" size={14} color={C.orange} />
        <Text style={s.demoHeaderText}>SMART AGENT</Text>
      </View>

      <View style={s.timeline}>
        {items.map((item, i) => (
          <Animated.View
            key={i}
            style={[
              s.timelineItem,
              {
                opacity: anims[i],
                transform: [
                  {
                    translateX: anims[i].interpolate({
                      inputRange: [0, 1],
                      outputRange: [-16, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {/* Timeline line */}
            {i < items.length - 1 && <View style={s.timelineLine} />}
            {/* Icon */}
            <View style={[s.timelineIcon, { backgroundColor: `${item.iconColor}22` }]}>
              <Ionicons name={item.icon} size={16} color={item.iconColor} />
            </View>
            {/* Content */}
            <View style={{ flex: 1 }}>
              <Text style={s.timelineTrigger}>{item.trigger}</Text>
              {item.agentMsg && (
                <View style={s.timelineAgentBubble}>
                  <View style={s.tinyAvatar}>
                    <Text style={s.tinyAvatarText}>K</Text>
                  </View>
                  <Text style={s.timelineAgentText}>{item.agentMsg}</Text>
                </View>
              )}
            </View>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

// ─── Sparkles Animation (Step 5) ──────────────────────────────────────────────

function Sparkles() {
  const anims = useRef(
    Array.from({ length: 8 }, () => ({
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.5),
    }))
  ).current;

  const positions = useRef(
    Array.from({ length: 8 }, () => ({
      left: 20 + Math.random() * 60,
      top: 10 + Math.random() * 40,
    }))
  ).current;

  useEffect(() => {
    const animations = anims.map((a, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.parallel([
            Animated.timing(a.opacity, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(a.scale, {
              toValue: 1.3,
              duration: 600,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(a.opacity, {
              toValue: 0,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(a.scale, {
              toValue: 0.5,
              duration: 600,
              useNativeDriver: true,
            }),
          ]),
        ])
      )
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, []);

  return (
    <>
      {anims.map((a, i) => (
        <Animated.View
          key={i}
          style={{
            position: "absolute",
            left: `${positions[i].left}%`,
            top: `${positions[i].top}%`,
            opacity: a.opacity,
            transform: [{ scale: a.scale }],
          }}
        >
          <Ionicons name="sparkles" size={16} color={C.orange} />
        </Animated.View>
      ))}
    </>
  );
}

// ─── Continue Button ──────────────────────────────────────────────────────────

function ContinueButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ translateY }, { scale }],
        marginTop: 12,
        paddingHorizontal: 20,
      }}
    >
      <Pressable
        style={s.continueBtn}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Text style={s.continueBtnText}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Progress Dots ────────────────────────────────────────────────────────────

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <View style={s.dotsRow}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            s.dot,
            i === current
              ? s.dotActive
              : i < current
                ? s.dotCompleted
                : s.dotUpcoming,
          ]}
        />
      ))}
    </View>
  );
}

// ─── Get Demo Component for Step ──────────────────────────────────────────────

function StepDemo({
  stepId,
  active,
}: {
  stepId: string;
  active: boolean;
}) {
  switch (stepId) {
    case "event_planning":
      return <EventPlanningDemo active={active} />;
    case "live_game":
      return <LiveGameDemo active={active} />;
    case "post_game":
      return <PostGameDemo active={active} />;
    case "smart_agent":
      return <SmartAgentDemo active={active} />;
    default:
      return null;
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface OnboardingAgentProps {
  visible: boolean;
  userName: string;
  onComplete: () => void;
  onNavigate?: (screen: string) => void;
}

export function OnboardingAgent({
  visible,
  userName,
  onComplete,
  onNavigate,
}: OnboardingAgentProps) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Animation values for modal
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const contentScale = useRef(new Animated.Value(0.85)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  // Step state
  const [currentStep, setCurrentStep] = useState(0);
  const [messagePhase, setMessagePhase] = useState(0);
  const [isThinking, setIsThinking] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const [demoActive, setDemoActive] = useState(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const step = STEPS[currentStep];
  const firstName = userName?.split(" ")[0] || "there";

  // ── Modal animation ──

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      setCurrentStep(0);
      setMessagePhase(0);
      setIsThinking(false);
      setShowButton(false);
      setDemoActive(false);

      backdropOpacity.setValue(0);
      contentScale.setValue(0.85);
      contentOpacity.setValue(0);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(contentScale, {
          toValue: 1,
          tension: 65,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (modalVisible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(contentScale, {
          toValue: 0.85,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(contentOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => setModalVisible(false));
    }
  }, [visible]);

  // ── Auto-scroll on content change ──

  useEffect(() => {
    const t = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
    return () => clearTimeout(t);
  }, [messagePhase, isThinking, showButton, demoActive]);

  // ── Message sequencing ──

  const resolveText = useCallback(
    (text: string) => text.replace("{name}", firstName),
    [firstName]
  );

  const handleMessageDone = useCallback(() => {
    const msgs = step.messages;
    const nextPhase = messagePhase + 1;

    if (nextPhase < msgs.length) {
      // Check if next message is a demo slot
      if (msgs[nextPhase] === null) {
        // Show demo
        const t = setTimeout(() => {
          setDemoActive(true);
          setMessagePhase(nextPhase);
          // After demo starts, queue the next message
          const demoDelay = currentStep === 1 ? 7500 : currentStep === 2 ? 5500 : currentStep === 3 ? 6000 : 6000;
          const t2 = setTimeout(() => {
            setMessagePhase(nextPhase + 1);
          }, demoDelay);
          timeoutsRef.current.push(t2);
        }, 400);
        timeoutsRef.current.push(t);
      } else {
        const t = setTimeout(() => {
          setMessagePhase(nextPhase);
        }, 600);
        timeoutsRef.current.push(t);
      }
    } else {
      // All messages done — show button
      const t = setTimeout(() => {
        setShowButton(true);
      }, 400);
      timeoutsRef.current.push(t);
    }
  }, [messagePhase, step, currentStep]);

  // ── Step advance ──

  const advanceStep = useCallback(() => {
    setShowButton(false);
    setDemoActive(false);
    setMessagePhase(0);
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    if (currentStep < STEPS.length - 1) {
      setIsThinking(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const t = setTimeout(() => {
        setIsThinking(false);
        setCurrentStep((prev) => prev + 1);
      }, 800);
      timeoutsRef.current.push(t);
    } else {
      // Completion
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      AsyncStorage.setItem(STORAGE_KEY, "true");
      onComplete();
      if (onNavigate) {
        onNavigate("Groups");
      }
    }
  }, [currentStep, onComplete, onNavigate]);

  const handleSkip = useCallback(() => {
    AsyncStorage.setItem(STORAGE_KEY, "true");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onComplete();
  }, [onComplete]);

  // ── Cleanup ──

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  if (!modalVisible && !visible) return null;

  // Build visible content for all completed steps + current step
  const visibleContent: React.ReactNode[] = [];

  for (let si = 0; si <= currentStep; si++) {
    const stepDef = STEPS[si];
    const isCurrent = si === currentStep;

    stepDef.messages.forEach((msg, mi) => {
      if (msg === null) {
        // Demo slot
        if (isCurrent && demoActive) {
          visibleContent.push(
            <View key={`demo-${si}`} style={{ paddingHorizontal: 20, marginVertical: 8 }}>
              <StepDemo stepId={stepDef.id} active={true} />
            </View>
          );
        } else if (!isCurrent) {
          // Past step demo — show as completed
          visibleContent.push(
            <View key={`demo-${si}`} style={{ paddingHorizontal: 20, marginVertical: 8 }}>
              <StepDemo stepId={stepDef.id} active={true} />
            </View>
          );
        }
        return;
      }

      const isActive = isCurrent
        ? mi <= messagePhase && (msg !== null)
        : true; // past steps always visible

      const showAvatar = mi === 0; // first message in step shows avatar

      if (isActive) {
        visibleContent.push(
          <ChatMessage
            key={`msg-${si}-${mi}`}
            text={resolveText(msg)}
            active={isCurrent ? mi === messagePhase : false}
            showAvatar={showAvatar}
            onDone={isCurrent && mi === messagePhase ? handleMessageDone : () => {}}
          />
        );
      }
    });
  }

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleSkip}
    >
      <View style={s.container}>
        {/* Backdrop */}
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill}>
            <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill}>
              <View style={s.backdropOverlay} />
            </BlurView>
          </Pressable>
        </Animated.View>

        {/* Content */}
        <Animated.View
          style={[
            s.contentWrapper,
            {
              opacity: contentOpacity,
              transform: [{ scale: contentScale }],
              paddingTop: insets.top + 12,
              paddingBottom: insets.bottom + 12,
            },
          ]}
        >
          {/* Header */}
          <View style={s.header}>
            <ProgressDots current={currentStep} total={STEPS.length} />
            {currentStep < STEPS.length - 1 && (
              <TouchableOpacity
                onPress={handleSkip}
                style={s.skipBtn}
                activeOpacity={0.6}
              >
                <Text style={s.skipText}>Skip</Text>
                <Ionicons name="close" size={16} color={C.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Chat area */}
          <ScrollView
            ref={scrollRef}
            style={s.chatArea}
            contentContainerStyle={s.chatContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Completion sparkles */}
            {currentStep === STEPS.length - 1 && (
              <View style={{ height: 80, position: "relative" }}>
                <Sparkles />
              </View>
            )}

            {visibleContent}

            {/* Thinking indicator */}
            {isThinking && <ThinkingDots />}

            {/* Continue button */}
            {showButton && (
              <ContinueButton label={step.button} onPress={advanceStep} />
            )}

            {/* Bottom spacing */}
            <View style={{ height: 20 }} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Persistence Helper ───────────────────────────────────────────────────────

export async function hasCompletedOnboarding(): Promise<boolean> {
  const val = await AsyncStorage.getItem(STORAGE_KEY);
  return val === "true";
}

export async function resetOnboarding(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdropOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  contentWrapper: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  skipBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  skipText: {
    color: C.textMuted,
    fontSize: 14,
    fontWeight: "500",
  },
  dotsRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  dot: {
    borderRadius: 5,
  },
  dotActive: {
    width: 10,
    height: 10,
    backgroundColor: C.orange,
  },
  dotCompleted: {
    width: 8,
    height: 8,
    backgroundColor: `${C.orange}66`,
  },
  dotUpcoming: {
    width: 8,
    height: 8,
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: C.glassBorder,
  },
  chatArea: {
    flex: 1,
  },
  chatContent: {
    paddingBottom: 20,
  },

  // ── Messages ──
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    marginBottom: 10,
    gap: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.jetDark,
    borderWidth: 2,
    borderColor: C.orange,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.orange,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },
  bubble: {
    backgroundColor: C.glassBg,
    borderWidth: 1,
    borderColor: C.glassBorder,
    borderRadius: 18,
    borderTopLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: SCREEN_WIDTH - 120,
  },
  bubbleText: {
    color: C.textPrimary,
    fontSize: 15,
    lineHeight: 22,
  },

  // ── Thinking ──
  thinkDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.textSecondary,
  },

  // ── Demo Cards ──
  demoCard: {
    backgroundColor: C.glassBg,
    borderWidth: 1,
    borderColor: C.glassBorder,
    borderRadius: 20,
    padding: 16,
  },
  demoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  demoHeaderText: {
    fontSize: 11,
    fontWeight: "700",
    color: C.moonstone,
    letterSpacing: 0.8,
  },
  demoBadge: {
    alignSelf: "center",
    backgroundColor: C.glowOrange,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 10,
  },
  demoBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: C.orange,
  },

  // ── Event Planning Demo ──
  planRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  planIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  planLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: C.textPrimary,
  },
  planSub: {
    fontSize: 11,
    color: C.textMuted,
    marginTop: 1,
  },

  // ── Live Game Demo ──
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
    paddingVertical: 4,
  },
  playerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: C.innerBg,
    borderWidth: 1,
    borderColor: C.glassBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  playerAvatarText: {
    fontSize: 13,
    fontWeight: "700",
    color: C.textPrimary,
  },
  playerName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: C.textPrimary,
  },
  playerAmount: {
    fontSize: 13,
    fontWeight: "600",
    color: C.orange,
  },
  playerChips: {
    fontSize: 11,
    color: C.textMuted,
    width: 55,
    textAlign: "right",
  },
  chipBankRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: C.glassBorder,
    paddingTop: 10,
    marginTop: 6,
  },
  chipBankLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: C.moonstone,
    letterSpacing: 0.5,
  },
  chipBankValue: {
    fontSize: 18,
    fontWeight: "800",
    color: C.success,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.textMuted,
  },
  liveDotActive: {
    backgroundColor: C.success,
  },
  rebuyCard: {
    backgroundColor: C.innerBg,
    borderWidth: 1,
    borderColor: C.glassBorder,
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
  },
  rebuyText: {
    fontSize: 13,
    fontWeight: "600",
    color: C.textPrimary,
  },
  rebuyBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  rebuyBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // ── Post-Game Demo ──
  resultsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  resultPill: {
    flex: 1,
    backgroundColor: C.innerBg,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.glassBorder,
  },
  resultName: {
    fontSize: 11,
    color: C.textMuted,
    marginBottom: 2,
  },
  resultValue: {
    fontSize: 16,
    fontWeight: "800",
  },
  settlementSection: {
    marginTop: 4,
  },
  settlementHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  optimizingRow: {
    alignItems: "center",
    paddingVertical: 12,
  },
  optimizingText: {
    fontSize: 13,
    color: C.moonstone,
    fontWeight: "500",
  },
  shimmer: {
    width: 120,
    height: 3,
    backgroundColor: C.glassBorder,
    borderRadius: 2,
    marginTop: 8,
  },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.innerBg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  paymentFrom: {
    fontSize: 13,
    fontWeight: "600",
    color: C.textPrimary,
  },
  paymentTo: {
    fontSize: 13,
    fontWeight: "600",
    color: C.textPrimary,
    flex: 1,
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: C.orange,
  },
  reminderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.glowOrange,
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  reminderText: {
    fontSize: 13,
    fontWeight: "600",
    color: C.textPrimary,
    flex: 1,
  },
  reminderDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  reminderLabels: {
    fontSize: 9,
    color: C.textMuted,
    fontWeight: "500",
  },

  // ── Smart Agent Timeline ──
  timeline: {
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
    position: "relative",
  },
  timelineLine: {
    position: "absolute",
    left: 16,
    top: 36,
    width: 2,
    height: 24,
    backgroundColor: C.glassBorder,
  },
  timelineIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineTrigger: {
    fontSize: 13,
    fontWeight: "600",
    color: C.textPrimary,
    marginTop: 2,
  },
  timelineAgentBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.glassBg,
    borderWidth: 1,
    borderColor: C.glassBorder,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 6,
    alignSelf: "flex-start",
  },
  tinyAvatar: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: C.jetDark,
    borderWidth: 1,
    borderColor: C.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  tinyAvatarText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#fff",
  },
  timelineAgentText: {
    fontSize: 12,
    color: C.textSecondary,
    fontWeight: "500",
  },

  // ── Continue Button ──
  continueBtn: {
    backgroundColor: C.trustBlue,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.trustBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  continueBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
