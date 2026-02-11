import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/constants/colors.dart';
import '../../../shared/widgets/kvitt_card.dart';
import '../../../shared/widgets/kvitt_avatar.dart';
import '../../../shared/widgets/kvitt_button.dart';

class SettlementScreen extends ConsumerWidget {
  final String gameId;

  const SettlementScreen({super.key, required this.gameId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft),
          onPressed: () => context.pop(),
        ),
        title: const Text('Settlement'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Game Summary
            KvittCard(
              backgroundColor: KvittColors.charcoal,
              child: Column(
                children: [
                  const Icon(
                    LucideIcons.trophy,
                    color: KvittColors.primary,
                    size: 48,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Game Complete!',
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                          color: KvittColors.white,
                        ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Total pot: \$0',
                    style: TextStyle(
                      color: KvittColors.white.withOpacity(0.7),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Results Section
            Text(
              'Results',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 12),

            // Empty state for results
            KvittCard(
              padding: const EdgeInsets.all(32),
              child: Column(
                children: [
                  Icon(
                    LucideIcons.users,
                    size: 48,
                    color: KvittColors.lightGray,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'No players in this game',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Payments Section
            Text(
              'Payments',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              'Who pays whom to settle up',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 12),

            // Empty state for payments
            KvittCard(
              padding: const EdgeInsets.all(32),
              child: Column(
                children: [
                  Icon(
                    LucideIcons.arrowRightLeft,
                    size: 48,
                    color: KvittColors.lightGray,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'No payments needed',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'All players are settled',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),

            const SizedBox(height: 32),

            // Done button
            KvittButton(
              onPressed: () => context.go('/groups'),
              child: const Text('Done'),
            ),

            const SizedBox(height: 12),

            // Share results button
            KvittButton(
              onPressed: () {
                // TODO: Share results
              },
              variant: KvittButtonVariant.outline,
              leadingIcon: LucideIcons.share2,
              child: const Text('Share Results'),
            ),
          ],
        ),
      ),
    );
  }
}
