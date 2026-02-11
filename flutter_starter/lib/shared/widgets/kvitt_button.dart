import 'package:flutter/material.dart';
import '../../core/constants/colors.dart';

enum KvittButtonVariant { primary, secondary, outline, ghost, danger }
enum KvittButtonSize { small, medium, large }

class KvittButton extends StatelessWidget {
  final VoidCallback? onPressed;
  final Widget child;
  final KvittButtonVariant variant;
  final KvittButtonSize size;
  final bool isLoading;
  final bool isFullWidth;
  final IconData? leadingIcon;
  final IconData? trailingIcon;

  const KvittButton({
    super.key,
    required this.onPressed,
    required this.child,
    this.variant = KvittButtonVariant.primary,
    this.size = KvittButtonSize.medium,
    this.isLoading = false,
    this.isFullWidth = true,
    this.leadingIcon,
    this.trailingIcon,
  });

  @override
  Widget build(BuildContext context) {
    final padding = switch (size) {
      KvittButtonSize.small => const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      KvittButtonSize.medium => const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      KvittButtonSize.large => const EdgeInsets.symmetric(horizontal: 32, vertical: 20),
    };

    final textStyle = switch (size) {
      KvittButtonSize.small => const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
      KvittButtonSize.medium => const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
      KvittButtonSize.large => const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
    };

    final iconSize = switch (size) {
      KvittButtonSize.small => 16.0,
      KvittButtonSize.medium => 18.0,
      KvittButtonSize.large => 20.0,
    };

    final minSize = isFullWidth
        ? Size.fromHeight(switch (size) {
            KvittButtonSize.small => 40,
            KvittButtonSize.medium => 52,
            KvittButtonSize.large => 60,
          })
        : null;

    Widget buttonChild = _buildChild(iconSize, textStyle);

    return switch (variant) {
      KvittButtonVariant.primary => ElevatedButton(
          onPressed: isLoading ? null : onPressed,
          style: ElevatedButton.styleFrom(
            backgroundColor: KvittColors.primary,
            foregroundColor: KvittColors.white,
            disabledBackgroundColor: KvittColors.primary.withOpacity(0.5),
            disabledForegroundColor: KvittColors.white.withOpacity(0.7),
            padding: padding,
            minimumSize: minSize,
            textStyle: textStyle,
          ),
          child: buttonChild,
        ),

      KvittButtonVariant.secondary => ElevatedButton(
          onPressed: isLoading ? null : onPressed,
          style: ElevatedButton.styleFrom(
            backgroundColor: KvittColors.charcoal,
            foregroundColor: KvittColors.white,
            padding: padding,
            minimumSize: minSize,
            textStyle: textStyle,
          ),
          child: buttonChild,
        ),

      KvittButtonVariant.outline => OutlinedButton(
          onPressed: isLoading ? null : onPressed,
          style: OutlinedButton.styleFrom(
            foregroundColor: KvittColors.charcoal,
            padding: padding,
            minimumSize: minSize,
            textStyle: textStyle,
            side: const BorderSide(color: KvittColors.lightGray),
          ),
          child: buttonChild,
        ),

      KvittButtonVariant.ghost => TextButton(
          onPressed: isLoading ? null : onPressed,
          style: TextButton.styleFrom(
            foregroundColor: KvittColors.charcoal,
            padding: padding,
            minimumSize: minSize,
            textStyle: textStyle,
          ),
          child: buttonChild,
        ),

      KvittButtonVariant.danger => ElevatedButton(
          onPressed: isLoading ? null : onPressed,
          style: ElevatedButton.styleFrom(
            backgroundColor: KvittColors.error,
            foregroundColor: KvittColors.white,
            padding: padding,
            minimumSize: minSize,
            textStyle: textStyle,
          ),
          child: buttonChild,
        ),
    };
  }

  Widget _buildChild(double iconSize, TextStyle textStyle) {
    if (isLoading) {
      return SizedBox(
        height: iconSize + 2,
        width: iconSize + 2,
        child: CircularProgressIndicator(
          strokeWidth: 2,
          color: variant == KvittButtonVariant.outline ||
                  variant == KvittButtonVariant.ghost
              ? KvittColors.charcoal
              : KvittColors.white,
        ),
      );
    }

    if (leadingIcon != null || trailingIcon != null) {
      return Row(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (leadingIcon != null) ...[
            Icon(leadingIcon, size: iconSize),
            const SizedBox(width: 8),
          ],
          child,
          if (trailingIcon != null) ...[
            const SizedBox(width: 8),
            Icon(trailingIcon, size: iconSize),
          ],
        ],
      );
    }

    return child;
  }
}
