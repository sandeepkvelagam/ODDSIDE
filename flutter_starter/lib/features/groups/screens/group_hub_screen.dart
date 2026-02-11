import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/constants/colors.dart';
import '../../../shared/widgets/kvitt_card.dart';
import '../../../shared/widgets/kvitt_avatar.dart';
import '../../../shared/widgets/kvitt_button.dart';
import '../../../shared/widgets/loading_states.dart';

class GroupHubScreen extends ConsumerWidget {
  final String groupId;

  const GroupHubScreen({super.key, required this.groupId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // TODO: Replace with actual group provider
    // final groupAsync = ref.watch(groupProvider(groupId));

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft),
          onPressed: () => context.go('/groups'),
        ),
        title: const Text('Group Hub'),
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.settings),
            onPressed: () {
              // TODO: Group settings
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Group Header
            KvittCard(
              child: Column(
                children: [
                  Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      color: KvittColors.primary.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Icon(
                      LucideIcons.users,
                      color: KvittColors.primary,
                      size: 40,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Loading...',
                    style: Theme.of(context).textTheme.headlineMedium,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '0 members',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Quick Actions
            Row(
              children: [
                Expanded(
                  child: KvittButton(
                    onPressed: () {
                      // TODO: Create new game
                    },
                    leadingIcon: LucideIcons.plus,
                    child: const Text('New Game'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: KvittButton(
                    onPressed: () {
                      // TODO: Invite members
                    },
                    variant: KvittButtonVariant.outline,
                    leadingIcon: LucideIcons.userPlus,
                    child: const Text('Invite'),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 32),

            // Active Games
            Text(
              'Active Games',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 12),
            KvittCard(
              padding: const EdgeInsets.all(32),
              child: Column(
                children: [
                  Icon(
                    LucideIcons.gamepad2,
                    size: 48,
                    color: KvittColors.lightGray,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'No active games',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Start a new game night!',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),

            const SizedBox(height: 32),

            // Members
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Members',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                TextButton(
                  onPressed: () {
                    // TODO: View all members
                  },
                  child: const Text('View All'),
                ),
              ],
            ),
            const SizedBox(height: 12),
            KvittCard(
              padding: const EdgeInsets.all(32),
              child: Column(
                children: [
                  Icon(
                    LucideIcons.userPlus,
                    size: 48,
                    color: KvittColors.lightGray,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Invite your friends',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Share the group with your poker buddies',
                    style: Theme.of(context).textTheme.bodySmall,
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),

            const SizedBox(height: 32),

            // Recent Games
            Text(
              'Past Games',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 12),
            KvittCard(
              padding: const EdgeInsets.all(32),
              child: Column(
                children: [
                  Icon(
                    LucideIcons.history,
                    size: 48,
                    color: KvittColors.lightGray,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'No games yet',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Your game history will appear here',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
