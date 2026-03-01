import React, { useMemo } from "react";
import { Text, TextStyle, StyleProp } from "react-native";
import { COLORS } from "../../styles/liquidGlass";

/**
 * Keywords and terms that should be highlighted in orange
 * when they appear in assistant responses.
 */
const HIGHLIGHT_KEYWORDS = [
  // App concepts
  "buy-in", "buy in", "cash-out", "cash out", "settlement", "rebuy", "rebuys",
  "chips", "chip count", "group", "groups", "game", "games", "poker night",
  "host", "player", "players", "invite", "ledger",
  // Actions
  "create", "start", "join", "approve", "cash out", "settle", "mark",
  "tap", "go to", "open", "set up",
  // Financial
  "owes", "owe", "profit", "loss", "net result", "payment", "payments",
  "venmo", "paid", "pending",
  // Screens / UI
  "Groups tab", "Start Game", "Cash Out", "Create Group", "Game Night",
  "Settlement", "Settings",
  // Stats
  "stats", "badges", "level", "record", "winnings", "losses",
  // Poker terms
  "Royal Flush", "Straight Flush", "Four of a Kind", "Full House",
  "Flush", "Straight", "Three of a Kind", "Two Pair", "One Pair",
  "High Card",
  // Numbered items (e.g. step numbers) are handled separately
];

// Build a single regex that matches any keyword (case-insensitive, word boundary)
// Sort longest first so "cash-out" matches before "cash"
const sortedKeywords = [...HIGHLIGHT_KEYWORDS].sort((a, b) => b.length - a.length);
const KEYWORD_PATTERN = new RegExp(
  `(${sortedKeywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
  "gi"
);

// Pattern for bullet markers (• or numbered lists like "1." "2.")
const BULLET_PATTERN = /^(\d+\.|•)\s/;

// Pattern for bold markers **text**
const BOLD_PATTERN = /\*\*(.+?)\*\*/g;

interface RichTextRendererProps {
  text: string;
  baseStyle: StyleProp<TextStyle>;
  highlightColor?: string;
}

/**
 * RichTextRenderer — Renders AI assistant text with orange keyword highlighting.
 *
 * - Important app terms (buy-in, settlement, etc.) are shown in orange
 * - Bullet numbers/markers are shown in orange
 * - **Bold** text is rendered bold + orange
 * - Everything else uses the base text style
 */
export function RichTextRenderer({
  text,
  baseStyle,
  highlightColor = COLORS.orange,
}: RichTextRendererProps) {
  const rendered = useMemo(() => {
    if (!text) return null;

    // Split by lines to handle bullet markers per-line
    const lines = text.split("\n");
    const elements: React.ReactNode[] = [];

    lines.forEach((line, lineIdx) => {
      if (lineIdx > 0) {
        elements.push("\n");
      }

      // Check for bullet/number prefix
      const bulletMatch = line.match(BULLET_PATTERN);
      let restOfLine = line;

      if (bulletMatch) {
        elements.push(
          <Text key={`b-${lineIdx}`} style={{ color: highlightColor, fontWeight: "700" }}>
            {bulletMatch[0]}
          </Text>
        );
        restOfLine = line.slice(bulletMatch[0].length);
      }

      // Process **bold** markers first, then keywords within each segment
      const boldParts = restOfLine.split(BOLD_PATTERN);
      // split with capture group alternates: [before, boldContent, between, boldContent, after]

      boldParts.forEach((part, partIdx) => {
        const isBoldCapture = partIdx % 2 === 1;

        if (isBoldCapture) {
          // This part was inside **...**
          elements.push(
            <Text
              key={`bold-${lineIdx}-${partIdx}`}
              style={{ color: highlightColor, fontWeight: "700" }}
            >
              {part}
            </Text>
          );
        } else {
          // Regular text — highlight keywords
          highlightKeywordsInText(part, lineIdx, partIdx, elements, highlightColor);
        }
      });
    });

    return elements;
  }, [text, highlightColor]);

  return <Text style={baseStyle}>{rendered}</Text>;
}

/**
 * Split a text segment by keyword matches and push highlighted/plain spans.
 */
function highlightKeywordsInText(
  text: string,
  lineIdx: number,
  partIdx: number,
  elements: React.ReactNode[],
  highlightColor: string
) {
  if (!text) return;

  // Reset lastIndex for global regex
  KEYWORD_PATTERN.lastIndex = 0;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = KEYWORD_PATTERN.exec(text)) !== null) {
    // Push text before the match
    if (match.index > lastIndex) {
      elements.push(text.slice(lastIndex, match.index));
    }

    // Push the highlighted keyword
    elements.push(
      <Text
        key={`kw-${lineIdx}-${partIdx}-${match.index}`}
        style={{ color: highlightColor, fontWeight: "600" }}
      >
        {match[0]}
      </Text>
    );

    lastIndex = match.index + match[0].length;
  }

  // Push remaining text after last match
  if (lastIndex < text.length) {
    elements.push(text.slice(lastIndex));
  }
}
