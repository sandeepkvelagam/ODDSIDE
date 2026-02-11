import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/constants/colors.dart';
import '../../../shared/widgets/kvitt_card.dart';
import '../../../shared/widgets/kvitt_avatar.dart';
import '../../../shared/widgets/kvitt_button.dart';
import '../../auth/providers/auth_provider.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final userName = user?.userMetadata?['name'] ??
        user?.email?.split('@')[0] ??
        'Player';
    final userEmail = user?.email ?? '';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.settings),
            onPressed: () {
              // TODO: Settings screen
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Profile Header
            KvittCard(
              child: Column(
                children: [
                  KvittAvatar(
                    name: userName,
                    imageUrl: user?.userMetadata?['avatar_url'],
                    size: KvittAvatarSize.xlarge,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    userName,
                    style: Theme.of(context).textTheme.headlineMedium,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    userEmail,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 16),
                  // Level badge
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: KvittColors.primary.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text('🎯', style: TextStyle(fontSize: 16)),
                        const SizedBox(width: 8),
                        Text(
                          'Rookie',
                          style: TextStyle(
                            color: KvittColors.primary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Stats
            Row(
              children: [
                Expanded(
                  child: _StatCard(
                    icon: LucideIcons.gamepad2,
                    label: 'Games Played',
                    value: '0',
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _StatCard(
                    icon: LucideIcons.trendingUp,
                    label: 'Net Profit',
                    value: '\$0',
                    valueColor: KvittColors.neutral,
                  ),
                ),
              ],
            ),

            const SizedBox(height: 12),

            Row(
              children: [
                Expanded(
                  child: _StatCard(
                    icon: LucideIcons.trophy,
                    label: 'Wins',
                    value: '0',
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _StatCard(
                    icon: LucideIcons.award,
                    label: 'Badges',
                    value: '0',
                  ),
                ),
              ],
            ),

            const SizedBox(height: 32),

            // Menu Items
            _MenuSection(
              title: 'Account',
              items: [
                _MenuItem(
                  icon: LucideIcons.user,
                  label: 'Edit Profile',
                  onTap: () {},
                ),
                _MenuItem(
                  icon: LucideIcons.bell,
                  label: 'Notifications',
                  onTap: () {},
                ),
                _MenuItem(
                  icon: LucideIcons.crown,
                  label: 'Premium',
                  trailing: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: KvittColors.primary,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Text(
                      'Upgrade',
                      style: TextStyle(
                        color: KvittColors.white,
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  onTap: () {},
                ),
              ],
            ),

            const SizedBox(height: 24),

            _MenuSection(
              title: 'Support',
              items: [
                _MenuItem(
                  icon: LucideIcons.helpCircle,
                  label: 'Help Center',
                  onTap: () {},
                ),
                _MenuItem(
                  icon: LucideIcons.messageCircle,
                  label: 'Contact Us',
                  onTap: () {},
                ),
                _MenuItem(
                  icon: LucideIcons.star,
                  label: 'Rate App',
                  onTap: () {},
                ),
              ],
            ),

            const SizedBox(height: 32),

            // Sign out button
            KvittButton(
              onPressed: () async {
                await ref.read(authRepositoryProvider).signOut();
              },
              variant: KvittButtonVariant.outline,
              leadingIcon: LucideIcons.logOut,
              child: const Text('Sign Out'),
            ),

            const SizedBox(height: 16),

            // Version
            Text(
              'Version 1.0.0',
              style: Theme.of(context).textTheme.bodySmall,
            ),

            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color? valueColor;

  const _StatCard({
    required this.icon,
    required this.label,
    required this.value,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return KvittCard(
      child: Column(
        children: [
          Icon(icon, color: KvittColors.gray, size: 24),
          const SizedBox(height: 8),
          Text(
            value,
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: valueColor,
                ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
    );
  }
}

class _MenuSection extends StatelessWidget {
  final String title;
  final List<_MenuItem> items;

  const _MenuSection({
    required this.title,
    required this.items,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 8),
          child: Text(
            title,
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  color: KvittColors.gray,
                ),
          ),
        ),
        KvittCard(
          padding: EdgeInsets.zero,
          child: Column(
            children: items.asMap().entries.map((entry) {
              final index = entry.key;
              final item = entry.value;
              return Column(
                children: [
                  if (index > 0)
                    Divider(
                      height: 1,
                      color: KvittColors.lightGray.withOpacity(0.3),
                    ),
                  item,
                ],
              );
            }).toList(),
          ),
        ),
      ],
    );
  }
}

class _MenuItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final Widget? trailing;
  final VoidCallback onTap;

  const _MenuItem({
    required this.icon,
    required this.label,
    this.trailing,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            Icon(icon, size: 20, color: KvittColors.gray),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                label,
                style: Theme.of(context).textTheme.bodyLarge,
              ),
            ),
            if (trailing != null)
              trailing!
            else
              const Icon(
                LucideIcons.chevronRight,
                size: 18,
                color: KvittColors.lightGray,
              ),
          ],
        ),
      ),
    );
  }
}
