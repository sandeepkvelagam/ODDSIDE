import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/constants/colors.dart';
import '../../../shared/widgets/kvitt_card.dart';
import '../../../shared/widgets/kvitt_avatar.dart';
import '../../../shared/widgets/kvitt_button.dart';
import '../../../shared/widgets/loading_states.dart';

class GameNightScreen extends ConsumerStatefulWidget {
  final String gameId;

  const GameNightScreen({super.key, required this.gameId});

  @override
  ConsumerState<GameNightScreen> createState() => _GameNightScreenState();
}

class _GameNightScreenState extends ConsumerState<GameNightScreen> {
  bool _isConnected = false;

  @override
  void initState() {
    super.initState();
    // TODO: Connect to WebSocket
    // ref.read(gameSocketProvider(widget.gameId).notifier).connect();
    Future.delayed(const Duration(seconds: 1), () {
      if (mounted) setState(() => _isConnected = true);
    });
  }

  @override
  Widget build(BuildContext context) {
    // TODO: Watch game provider
    // final gameAsync = ref.watch(gameProvider(widget.gameId));

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft),
          onPressed: () => context.pop(),
        ),
        title: const Text('Game Night'),
        actions: [
          // Connection indicator
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: Icon(
              _isConnected ? LucideIcons.wifi : LucideIcons.wifiOff,
              color: _isConnected ? KvittColors.success : KvittColors.error,
              size: 20,
            ),
          ),
          PopupMenuButton<String>(
            icon: const Icon(LucideIcons.moreVertical),
            onSelected: (value) {
              // Handle menu actions
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'add_player',
                child: Row(
                  children: [
                    Icon(LucideIcons.userPlus, size: 18),
                    SizedBox(width: 12),
                    Text('Add Player'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'end_game',
                child: Row(
                  children: [
                    Icon(LucideIcons.flag, size: 18),
                    SizedBox(width: 12),
                    Text('End Game'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'cancel',
                child: Row(
                  children: [
                    Icon(LucideIcons.x, size: 18, color: KvittColors.error),
                    SizedBox(width: 12),
                    Text('Cancel Game', style: TextStyle(color: KvittColors.error)),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          // Game Stats Header
          Container(
            padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
            color: KvittColors.charcoal,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _StatColumn(label: 'Pot', value: '\$0'),
                Container(
                  width: 1,
                  height: 40,
                  color: KvittColors.white.withOpacity(0.2),
                ),
                _StatColumn(label: 'Players', value: '0'),
                Container(
                  width: 1,
                  height: 40,
                  color: KvittColors.white.withOpacity(0.2),
                ),
                _StatColumn(label: 'Buy-in', value: '\$20'),
              ],
            ),
          ),

          // Players List
          Expanded(
            child: EmptyView(
              icon: LucideIcons.users,
              title: 'No players yet',
              subtitle: 'Add players to get started',
              actionLabel: 'Add Player',
              onAction: () {
                // TODO: Show add player dialog
              },
            ),
          ),

          // Game Activity Thread (collapsed)
          Container(
            height: 60,
            decoration: BoxDecoration(
              color: KvittColors.white,
              border: Border(
                top: BorderSide(color: KvittColors.lightGray.withOpacity(0.3)),
              ),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                const Icon(LucideIcons.messageSquare, size: 20, color: KvittColors.gray),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'No activity yet',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ),
                Icon(LucideIcons.chevronUp, color: KvittColors.gray),
              ],
            ),
          ),

          // Action Buttons
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Expanded(
                    child: KvittButton(
                      onPressed: () {
                        // TODO: Add player
                      },
                      variant: KvittButtonVariant.outline,
                      leadingIcon: LucideIcons.userPlus,
                      child: const Text('Add Player'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: KvittButton(
                      onPressed: () {
                        context.go('/games/${widget.gameId}/settlement');
                      },
                      leadingIcon: LucideIcons.flag,
                      child: const Text('End Game'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatColumn extends StatelessWidget {
  final String label;
  final String value;

  const _StatColumn({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          value,
          style: const TextStyle(
            color: KvittColors.white,
            fontSize: 24,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(
            color: KvittColors.white.withOpacity(0.7),
            fontSize: 12,
          ),
        ),
      ],
    );
  }
}
