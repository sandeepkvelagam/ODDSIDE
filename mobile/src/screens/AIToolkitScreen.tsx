import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Animated,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, ANIMATION, SHADOWS } from "../styles/liquidGlass";
import { GlassButton, GlassIconButton, GlassSurface } from "../components/ui";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// AI Model chips
const AI_MODELS = [
  { id: "sora", name: "Sora", icon: "videocam", color: "#8B5CF6" },
  { id: "nano", name: "Nano Banana", icon: "image", color: "#F59E0B" },
  { id: "kling", name: "Kling", icon: "film", color: "#EC4899" },
  { id: "gpt", name: "GPT-4", icon: "chatbubble", color: "#10B981" },
];

export function AIToolkitScreen() {
  const navigation = useNavigation();
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState("sora");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        ...ANIMATION.spring.bouncy,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (isGenerating) {
      // Progress animation
      progressAnim.setValue(0);
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: false,
      }).start();

      // Pulse animation for generating state
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.7,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      return () => pulse.stop();
    }
  }, [isGenerating]);

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    // Simulate generation
    setTimeout(() => {
      setIsGenerating(false);
      setGeneratedImage("https://picsum.photos/800/600");
    }, 3000);
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={[COLORS.deepBlack, COLORS.jetDark, COLORS.jetSurface]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <GlassIconButton
            icon={<Ionicons name="chevron-back" size={22} color={COLORS.text.primary} />}
            onPress={() => navigation.goBack()}
            variant="ghost"
            size="medium"
          />
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>AI Toolkit</Text>
            <Text style={styles.headerSubtitle}>Create amazing visuals</Text>
          </View>
          <GlassIconButton
            icon={<Ionicons name="settings-outline" size={20} color={COLORS.text.secondary} />}
            onPress={() => {}}
            variant="ghost"
            size="medium"
          />
        </Animated.View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* AI Model Selector Chips */}
          <Animated.View
            style={[
              styles.chipsContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsScroll}
            >
              {AI_MODELS.map((model) => (
                <TouchableOpacity
                  key={model.id}
                  style={[
                    styles.chip,
                    selectedModel === model.id && { backgroundColor: model.color },
                  ]}
                  onPress={() => setSelectedModel(model.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={model.icon as any}
                    size={16}
                    color={selectedModel === model.id ? "#fff" : COLORS.text.secondary}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      selectedModel === model.id && { color: "#fff" },
                    ]}
                  >
                    {model.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>

          {/* Main Canvas Area */}
          <Animated.View
            style={[
              styles.canvasContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <GlassSurface style={styles.canvas} innerStyle={styles.canvasInner}>
              {isGenerating ? (
                // Generating State
                <View style={styles.generatingContainer}>
                  <Animated.View style={{ opacity: pulseAnim }}>
                    <View style={styles.generatingIcon}>
                      <Ionicons name="sparkles" size={48} color={COLORS.orange} />
                    </View>
                  </Animated.View>
                  <Text style={styles.generatingText}>Generating...</Text>
                  <Text style={styles.generatingSubtext}>
                    Creating your masterpiece
                  </Text>

                  {/* Progress Bar */}
                  <View style={styles.progressContainer}>
                    <Animated.View
                      style={[styles.progressBar, { width: progressWidth }]}
                    />
                  </View>
                </View>
              ) : generatedImage ? (
                // Generated Image
                <View style={styles.imageContainer}>
                  <Image
                    source={{ uri: generatedImage }}
                    style={styles.generatedImage}
                    resizeMode="cover"
                  />
                  {/* Overlay Controls */}
                  <View style={styles.imageOverlay}>
                    <View style={styles.imageActions}>
                      <TouchableOpacity style={styles.imageActionButton}>
                        <Ionicons name="download-outline" size={20} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.imageActionButton}>
                        <Ionicons name="share-outline" size={20} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.imageActionButton}>
                        <Ionicons name="heart-outline" size={20} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ) : (
                // Empty State
                <View style={styles.emptyState}>
                  <View style={styles.emptyIcon}>
                    <Ionicons name="images-outline" size={56} color={COLORS.text.muted} />
                  </View>
                  <Text style={styles.emptyTitle}>Ready to create</Text>
                  <Text style={styles.emptySubtext}>
                    Enter a prompt below to generate amazing AI visuals
                  </Text>
                </View>
              )}
            </GlassSurface>
          </Animated.View>

          {/* Prompt Suggestions */}
          {!generatedImage && !isGenerating && (
            <Animated.View
              style={[
                styles.suggestionsContainer,
                {
                  opacity: fadeAnim,
                },
              ]}
            >
              <Text style={styles.suggestionsTitle}>Try these prompts</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.suggestionsScroll}
              >
                {[
                  "A mystical poker game in a forest",
                  "Neon casino at night",
                  "Royal flush on fire",
                  "Poker chips floating in space",
                ].map((suggestion, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.suggestionChip}
                    onPress={() => setPrompt(suggestion)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Animated.View>
          )}
        </ScrollView>

        {/* Input Bar */}
        <Animated.View
          style={[
            styles.inputBar,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <BlurView intensity={40} style={styles.inputBlur} tint="dark">
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Describe what you want to create..."
                placeholderTextColor={COLORS.text.muted}
                value={prompt}
                onChangeText={setPrompt}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  !prompt.trim() && styles.sendButtonDisabled,
                ]}
                onPress={handleGenerate}
                disabled={!prompt.trim() || isGenerating}
                activeOpacity={0.8}
              >
                {isGenerating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="arrow-up" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </BlurView>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.deepBlack,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.container,
    paddingVertical: SPACING.md,
  },
  headerCenter: {
    alignItems: "center",
  },
  headerTitle: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.sizes.heading3,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  headerSubtitle: {
    color: COLORS.text.muted,
    fontSize: TYPOGRAPHY.sizes.caption,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.container,
    paddingBottom: 120,
  },
  // Chips
  chipsContainer: {
    marginBottom: SPACING.xl,
  },
  chipsScroll: {
    gap: SPACING.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.glass.bg,
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    gap: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.glass.border,
  },
  chipText: {
    color: COLORS.text.secondary,
    fontSize: TYPOGRAPHY.sizes.caption,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  // Canvas
  canvasContainer: {
    marginBottom: SPACING.xl,
  },
  canvas: {
    aspectRatio: 4 / 3,
    minHeight: 280,
  },
  canvasInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  // Empty State
  emptyState: {
    alignItems: "center",
    padding: SPACING.xxl,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.glass.bg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.sizes.heading3,
    fontWeight: TYPOGRAPHY.weights.semiBold,
    marginBottom: SPACING.sm,
  },
  emptySubtext: {
    color: COLORS.text.muted,
    fontSize: TYPOGRAPHY.sizes.bodySmall,
    textAlign: "center",
    maxWidth: 250,
  },
  // Generating State
  generatingContainer: {
    alignItems: "center",
    padding: SPACING.xxl,
  },
  generatingIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.glass.glowOrange,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.lg,
  },
  generatingText: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.sizes.heading3,
    fontWeight: TYPOGRAPHY.weights.semiBold,
    marginBottom: SPACING.xs,
  },
  generatingSubtext: {
    color: COLORS.text.muted,
    fontSize: TYPOGRAPHY.sizes.bodySmall,
    marginBottom: SPACING.xl,
  },
  progressContainer: {
    width: "80%",
    height: 4,
    backgroundColor: COLORS.glass.bg,
    borderRadius: RADIUS.full,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: COLORS.orange,
    borderRadius: RADIUS.full,
  },
  // Image Container
  imageContainer: {
    width: "100%",
    height: "100%",
    borderRadius: RADIUS.xl,
    overflow: "hidden",
  },
  generatedImage: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    padding: SPACING.md,
  },
  imageActions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: SPACING.md,
  },
  imageActionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  // Suggestions
  suggestionsContainer: {
    marginBottom: SPACING.xl,
  },
  suggestionsTitle: {
    color: COLORS.text.muted,
    fontSize: TYPOGRAPHY.sizes.caption,
    fontWeight: TYPOGRAPHY.weights.medium,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: SPACING.md,
  },
  suggestionsScroll: {
    gap: SPACING.sm,
  },
  suggestionChip: {
    backgroundColor: COLORS.glass.bg,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.glass.border,
  },
  suggestionText: {
    color: COLORS.text.secondary,
    fontSize: TYPOGRAPHY.sizes.caption,
  },
  // Input Bar
  inputBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  inputBlur: {
    paddingHorizontal: SPACING.container,
    paddingVertical: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: COLORS.glass.bg,
    borderRadius: RADIUS.xxl,
    borderWidth: 1.5,
    borderColor: COLORS.glass.border,
    padding: SPACING.xs,
    gap: SPACING.sm,
  },
  input: {
    flex: 1,
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.sizes.body,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.glass.bg,
    opacity: 0.5,
  },
});

export default AIToolkitScreen;
