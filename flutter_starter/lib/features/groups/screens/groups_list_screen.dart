import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/constants/colors.dart';
import '../../../shared/widgets/kvitt_card.dart';
import '../../../shared/widgets/kvitt_avatar.dart';
import '../../../shared/widgets/loading_states.dart';

// TODO: Replace with actual provider from groups_provider.dart
final groupsProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  // Simulated empty state for now
  // Replace with: ref.watch(groupsRepositoryProvider).getMyGroups()
  await Future.delayed(const Duration(milliseconds: 500));
  return [];
});

class GroupsListScreen extends ConsumerWidget {
  const GroupsListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final groupsAsync = ref.watch(groupsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Groups'),
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.plus),
            onPressed: () => context.go('/groups/new'),
          ),
        ],
      ),
      body: groupsAsync.when(
        loading: () => const ShimmerList(itemCount: 3, itemHeight: 90),
        error: (error, stack) => ErrorView(
          message: error.toString(),
          onRetry: () => ref.invalidate(groupsProvider),
        ),
        data: (groups) {
          if (groups.isEmpty) {
            return EmptyView(
              icon: LucideIcons.users,
              title: 'No groups yet',
              subtitle: 'Create a group to start tracking your poker games with friends',
              actionLabel: 'Create Group',
              onAction: () => context.go('/groups/new'),
            );
          }

          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(groupsProvider),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: groups.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final group = groups[index];
                return _GroupCard(
                  name: group['name'] ?? 'Unnamed Group',
                  memberCount: group['member_count'] ?? 0,
                  lastGame: group['last_game'],
                  onTap: () => context.go('/groups/${group['group_id']}'),
                );
              },
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.go('/groups/new'),
        backgroundColor: KvittColors.primary,
        foregroundColor: KvittColors.white,
        icon: const Icon(LucideIcons.plus),
        label: const Text('New Group'),
      ),
    );
  }
}

class _GroupCard extends StatelessWidget {
  final String name;
  final int memberCount;
  final String? lastGame;
  final VoidCallback onTap;

  const _GroupCard({
    required this.name,
    required this.memberCount,
    this.lastGame,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return KvittCard(
      onTap: onTap,
      child: Row(
        children: [
          // Group avatar
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: KvittColors.primary.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(
              LucideIcons.users,
              color: KvittColors.primary,
              size: 24,
            ),
          ),
          const SizedBox(width: 16),

          // Group info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: Theme.of(context).textTheme.titleMedium,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Icon(
                      LucideIcons.users,
                      size: 14,
                      color: KvittColors.gray,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '$memberCount members',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    if (lastGame != null) ...[
                      const SizedBox(width: 12),
                      Icon(
                        LucideIcons.calendar,
                        size: 14,
                        color: KvittColors.gray,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        lastGame!,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),

          // Arrow
          const Icon(
            LucideIcons.chevronRight,
            color: KvittColors.lightGray,
          ),
        ],
      ),
    );
  }
}
