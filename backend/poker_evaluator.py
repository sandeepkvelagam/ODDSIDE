"""
Deterministic Poker Hand Evaluator

This module evaluates poker hands using code (not LLM) to ensure accuracy.
The LLM is only used for strategy suggestions after the hand is evaluated.
"""

from typing import List, Tuple, Dict, Optional
from collections import Counter
from enum import IntEnum


class HandRank(IntEnum):
    """Poker hand rankings from lowest to highest"""
    HIGH_CARD = 1
    ONE_PAIR = 2
    TWO_PAIR = 3
    THREE_OF_A_KIND = 4
    STRAIGHT = 5
    FLUSH = 6
    FULL_HOUSE = 7
    FOUR_OF_A_KIND = 8
    STRAIGHT_FLUSH = 9
    ROYAL_FLUSH = 10


# Card rank values for comparison
RANK_VALUES = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
    '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
}

RANK_NAMES = {v: k for k, v in RANK_VALUES.items()}

HAND_NAMES = {
    HandRank.HIGH_CARD: "High Card",
    HandRank.ONE_PAIR: "One Pair",
    HandRank.TWO_PAIR: "Two Pair",
    HandRank.THREE_OF_A_KIND: "Three of a Kind",
    HandRank.STRAIGHT: "Straight",
    HandRank.FLUSH: "Flush",
    HandRank.FULL_HOUSE: "Full House",
    HandRank.FOUR_OF_A_KIND: "Four of a Kind",
    HandRank.STRAIGHT_FLUSH: "Straight Flush",
    HandRank.ROYAL_FLUSH: "Royal Flush"
}


def parse_card(card_str: str) -> Tuple[str, str]:
    """
    Parse a card string like "A of hearts" or "10 of spades" into (rank, suit)
    """
    card_str = card_str.strip().lower()

    # Handle various formats
    if " of " in card_str:
        parts = card_str.split(" of ")
        rank = parts[0].strip().upper()
        suit = parts[1].strip().lower()
    else:
        # Try to parse compact format like "Ah" or "10s"
        card_str = card_str.upper()
        if card_str[-1] in 'HSDC':
            suit_map = {'H': 'hearts', 'S': 'spades', 'D': 'diamonds', 'C': 'clubs'}
            suit = suit_map[card_str[-1]]
            rank = card_str[:-1]
        else:
            raise ValueError(f"Cannot parse card: {card_str}")

    # Normalize rank
    if rank == '1':
        rank = 'A'
    elif rank.lower() == 'ace':
        rank = 'A'
    elif rank.lower() == 'king':
        rank = 'K'
    elif rank.lower() == 'queen':
        rank = 'Q'
    elif rank.lower() == 'jack':
        rank = 'J'

    # Validate
    if rank not in RANK_VALUES:
        raise ValueError(f"Invalid rank: {rank}")

    valid_suits = ['hearts', 'diamonds', 'clubs', 'spades']
    if suit not in valid_suits:
        raise ValueError(f"Invalid suit: {suit}")

    return (rank, suit)


def get_rank_counts(cards: List[Tuple[str, str]]) -> Counter:
    """Get count of each rank"""
    return Counter(card[0] for card in cards)


def get_suit_counts(cards: List[Tuple[str, str]]) -> Counter:
    """Get count of each suit"""
    return Counter(card[1] for card in cards)


def is_flush(cards: List[Tuple[str, str]]) -> Tuple[bool, Optional[str]]:
    """Check if 5+ cards of same suit exist. Returns (is_flush, suit)"""
    suit_counts = get_suit_counts(cards)
    for suit, count in suit_counts.items():
        if count >= 5:
            return True, suit
    return False, None


def get_straight_high(ranks: List[int]) -> Optional[int]:
    """
    Check if there's a straight in the ranks.
    Returns the high card of the straight, or None.
    """
    unique_ranks = sorted(set(ranks), reverse=True)

    # Check for Ace-low straight (A-2-3-4-5)
    if set([14, 2, 3, 4, 5]).issubset(set(unique_ranks)):
        return 5  # 5-high straight

    # Check for regular straights
    for i in range(len(unique_ranks) - 4):
        window = unique_ranks[i:i+5]
        if window[0] - window[4] == 4:
            return window[0]

    return None


def evaluate_hand(hole_cards: List[str], community_cards: List[str]) -> Dict:
    """
    Evaluate the best 5-card poker hand from hole cards + community cards.

    Returns a dict with:
    - hand_rank: HandRank enum value
    - hand_name: Human-readable name
    - description: Detailed description of the hand
    - cards_used: The 5 cards that make the best hand
    - kickers: Kicker cards for tiebreakers
    """
    # Parse all cards
    all_cards = []
    for card_str in hole_cards + community_cards:
        try:
            parsed = parse_card(card_str)
            all_cards.append(parsed)
        except ValueError as e:
            return {"error": str(e)}

    if len(all_cards) < 5:
        return {
            "hand_rank": HandRank.HIGH_CARD,
            "hand_name": "Incomplete Hand",
            "description": f"Only {len(all_cards)} cards - need at least 5 for a complete hand",
            "cards_used": all_cards,
            "kickers": []
        }

    # Get rank and suit information
    rank_counts = get_rank_counts(all_cards)
    suit_counts = get_suit_counts(all_cards)
    ranks = [RANK_VALUES[card[0]] for card in all_cards]

    # Check for flush
    has_flush, flush_suit = is_flush(all_cards)

    # Get flush cards if flush exists
    flush_cards = [c for c in all_cards if c[1] == flush_suit] if has_flush else []
    flush_ranks = [RANK_VALUES[c[0]] for c in flush_cards] if flush_cards else []

    # Check for straight flush / royal flush
    if has_flush and len(flush_cards) >= 5:
        straight_high = get_straight_high(flush_ranks)
        if straight_high:
            if straight_high == 14:  # A-K-Q-J-10
                return {
                    "hand_rank": HandRank.ROYAL_FLUSH,
                    "hand_name": "Royal Flush",
                    "description": f"Royal Flush in {flush_suit}!",
                    "cards_used": sorted(flush_cards, key=lambda c: RANK_VALUES[c[0]], reverse=True)[:5],
                    "kickers": []
                }
            else:
                return {
                    "hand_rank": HandRank.STRAIGHT_FLUSH,
                    "hand_name": "Straight Flush",
                    "description": f"Straight Flush, {RANK_NAMES[straight_high]}-high in {flush_suit}",
                    "cards_used": sorted(flush_cards, key=lambda c: RANK_VALUES[c[0]], reverse=True)[:5],
                    "kickers": []
                }

    # Check for four of a kind
    quads = [rank for rank, count in rank_counts.items() if count == 4]
    if quads:
        quad_rank = quads[0]
        quad_cards = [c for c in all_cards if c[0] == quad_rank]
        kicker = max([c for c in all_cards if c[0] != quad_rank], key=lambda c: RANK_VALUES[c[0]])
        return {
            "hand_rank": HandRank.FOUR_OF_A_KIND,
            "hand_name": "Four of a Kind",
            "description": f"Four of a Kind, {quad_rank}s",
            "cards_used": quad_cards + [kicker],
            "kickers": [kicker]
        }

    # Check for full house (three of a kind + pair)
    trips = [rank for rank, count in rank_counts.items() if count == 3]
    pairs = [rank for rank, count in rank_counts.items() if count == 2]

    if trips:
        # Could have multiple trips or trips + pairs
        trips_sorted = sorted(trips, key=lambda r: RANK_VALUES[r], reverse=True)
        best_trip = trips_sorted[0]

        # Look for best pair (could be another trip or a pair)
        other_pairs = [r for r in trips_sorted[1:]] + pairs
        if other_pairs:
            best_pair = max(other_pairs, key=lambda r: RANK_VALUES[r])
            trip_cards = [c for c in all_cards if c[0] == best_trip][:3]
            pair_cards = [c for c in all_cards if c[0] == best_pair][:2]
            return {
                "hand_rank": HandRank.FULL_HOUSE,
                "hand_name": "Full House",
                "description": f"Full House, {best_trip}s full of {best_pair}s",
                "cards_used": trip_cards + pair_cards,
                "kickers": []
            }

    # Check for flush (already calculated above)
    if has_flush:
        flush_cards_sorted = sorted(flush_cards, key=lambda c: RANK_VALUES[c[0]], reverse=True)[:5]
        high_card = flush_cards_sorted[0][0]
        return {
            "hand_rank": HandRank.FLUSH,
            "hand_name": "Flush",
            "description": f"Flush, {high_card}-high in {flush_suit}",
            "cards_used": flush_cards_sorted,
            "kickers": []
        }

    # Check for straight
    straight_high = get_straight_high(ranks)
    if straight_high:
        return {
            "hand_rank": HandRank.STRAIGHT,
            "hand_name": "Straight",
            "description": f"Straight, {RANK_NAMES[straight_high]}-high",
            "cards_used": [],  # Would need to track which cards
            "kickers": []
        }

    # Three of a kind (no full house)
    if trips:
        best_trip = max(trips, key=lambda r: RANK_VALUES[r])
        trip_cards = [c for c in all_cards if c[0] == best_trip][:3]
        other_cards = sorted([c for c in all_cards if c[0] != best_trip],
                            key=lambda c: RANK_VALUES[c[0]], reverse=True)[:2]
        return {
            "hand_rank": HandRank.THREE_OF_A_KIND,
            "hand_name": "Three of a Kind",
            "description": f"Three of a Kind, {best_trip}s",
            "cards_used": trip_cards + other_cards,
            "kickers": other_cards
        }

    # Two pair
    if len(pairs) >= 2:
        pairs_sorted = sorted(pairs, key=lambda r: RANK_VALUES[r], reverse=True)[:2]
        pair1_cards = [c for c in all_cards if c[0] == pairs_sorted[0]][:2]
        pair2_cards = [c for c in all_cards if c[0] == pairs_sorted[1]][:2]
        kicker = max([c for c in all_cards if c[0] not in pairs_sorted],
                    key=lambda c: RANK_VALUES[c[0]])
        return {
            "hand_rank": HandRank.TWO_PAIR,
            "hand_name": "Two Pair",
            "description": f"Two Pair, {pairs_sorted[0]}s and {pairs_sorted[1]}s",
            "cards_used": pair1_cards + pair2_cards + [kicker],
            "kickers": [kicker]
        }

    # One pair
    if pairs:
        best_pair = max(pairs, key=lambda r: RANK_VALUES[r])
        pair_cards = [c for c in all_cards if c[0] == best_pair][:2]
        kickers = sorted([c for c in all_cards if c[0] != best_pair],
                        key=lambda c: RANK_VALUES[c[0]], reverse=True)[:3]
        return {
            "hand_rank": HandRank.ONE_PAIR,
            "hand_name": "One Pair",
            "description": f"One Pair, {best_pair}s",
            "cards_used": pair_cards + kickers,
            "kickers": kickers
        }

    # High card
    sorted_cards = sorted(all_cards, key=lambda c: RANK_VALUES[c[0]], reverse=True)[:5]
    high = sorted_cards[0][0]
    return {
        "hand_rank": HandRank.HIGH_CARD,
        "hand_name": "High Card",
        "description": f"High Card, {high}",
        "cards_used": sorted_cards,
        "kickers": sorted_cards[1:]
    }


def get_hand_strength(hand_rank: HandRank) -> str:
    """Get a qualitative strength assessment"""
    if hand_rank >= HandRank.STRAIGHT_FLUSH:
        return "Monster"
    elif hand_rank >= HandRank.FULL_HOUSE:
        return "Very Strong"
    elif hand_rank >= HandRank.FLUSH:
        return "Strong"
    elif hand_rank >= HandRank.STRAIGHT:
        return "Good"
    elif hand_rank >= HandRank.THREE_OF_A_KIND:
        return "Decent"
    elif hand_rank >= HandRank.TWO_PAIR:
        return "Marginal"
    elif hand_rank >= HandRank.ONE_PAIR:
        return "Weak"
    else:
        return "Very Weak"


def get_action_suggestion(evaluation: Dict, stage: str) -> Dict:
    """
    Get a deterministic action suggestion based on hand strength.
    This is a rule-based system, not LLM-based.
    """
    hand_rank = evaluation.get("hand_rank", HandRank.HIGH_CARD)
    strength = get_hand_strength(hand_rank)

    # Simple rule-based suggestions
    if hand_rank >= HandRank.FULL_HOUSE:
        return {
            "action": "RAISE",
            "potential": "High",
            "reasoning": f"You have {evaluation['hand_name']} - {evaluation['description']}. This is a very strong hand, consider raising to build the pot."
        }
    elif hand_rank >= HandRank.STRAIGHT:
        return {
            "action": "RAISE",
            "potential": "High",
            "reasoning": f"You have {evaluation['hand_name']} - {evaluation['description']}. Strong hand, raising is recommended."
        }
    elif hand_rank >= HandRank.THREE_OF_A_KIND:
        return {
            "action": "CALL",
            "potential": "Medium",
            "reasoning": f"You have {evaluation['hand_name']} - {evaluation['description']}. Decent hand, calling is safe."
        }
    elif hand_rank >= HandRank.TWO_PAIR:
        return {
            "action": "CALL",
            "potential": "Medium",
            "reasoning": f"You have {evaluation['hand_name']} - {evaluation['description']}. Marginal hand, call but be cautious."
        }
    elif hand_rank >= HandRank.ONE_PAIR:
        if stage == "Flop":
            return {
                "action": "CHECK",
                "potential": "Low",
                "reasoning": f"You have {evaluation['hand_name']} - {evaluation['description']}. Weak hand early, check to see more cards."
            }
        else:
            return {
                "action": "FOLD",
                "potential": "Low",
                "reasoning": f"You have {evaluation['hand_name']} - {evaluation['description']}. Weak hand late in the game, consider folding."
            }
    else:
        return {
            "action": "FOLD",
            "potential": "Low",
            "reasoning": f"You have {evaluation['hand_name']} - {evaluation['description']}. Very weak hand, folding is recommended."
        }


# Test function
if __name__ == "__main__":
    # Test cases
    test_cases = [
        # Full house test (was incorrectly identified as four of a kind)
        {
            "hole": ["2 of hearts", "5 of diamonds"],
            "community": ["2 of clubs", "2 of diamonds", "5 of spades"],
            "expected": "Full House"
        },
        # Flush test (should NOT be flush with only 4 hearts)
        {
            "hole": ["3 of hearts", "J of hearts"],
            "community": ["8 of hearts", "7 of hearts", "6 of diamonds"],
            "expected": "NOT Flush"
        },
        # Actual flush (5 hearts)
        {
            "hole": ["3 of hearts", "J of hearts"],
            "community": ["8 of hearts", "7 of hearts", "6 of hearts"],
            "expected": "Flush"
        },
    ]

    for test in test_cases:
        print(f"\nTest: {test['expected']}")
        print(f"Hole: {test['hole']}")
        print(f"Community: {test['community']}")
        result = evaluate_hand(test['hole'], test['community'])
        print(f"Result: {result['hand_name']} - {result['description']}")
