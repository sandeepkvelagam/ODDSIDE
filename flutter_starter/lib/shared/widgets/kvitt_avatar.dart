import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../core/constants/colors.dart';

enum KvittAvatarSize { small, medium, large, xlarge }

class KvittAvatar extends StatelessWidget {
  final String? imageUrl;
  final String? name;
  final KvittAvatarSize size;
  final Color? backgroundColor;
  final VoidCallback? onTap;
  final bool showBorder;
  final Color? borderColor;

  const KvittAvatar({
    super.key,
    this.imageUrl,
    this.name,
    this.size = KvittAvatarSize.medium,
    this.backgroundColor,
    this.onTap,
    this.showBorder = false,
    this.borderColor,
  });

  double get _size => switch (size) {
        KvittAvatarSize.small => 32,
        KvittAvatarSize.medium => 40,
        KvittAvatarSize.large => 56,
        KvittAvatarSize.xlarge => 80,
      };

  double get _fontSize => switch (size) {
        KvittAvatarSize.small => 12,
        KvittAvatarSize.medium => 14,
        KvittAvatarSize.large => 20,
        KvittAvatarSize.xlarge => 28,
      };

  String get _initials {
    if (name == null || name!.isEmpty) return '?';
    final parts = name!.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return name![0].toUpperCase();
  }

  Color get _backgroundColor {
    if (backgroundColor != null) return backgroundColor!;

    // Generate consistent color based on name
    if (name != null && name!.isNotEmpty) {
      final colors = [
        KvittColors.primary,
        const Color(0xFF3B82F6), // Blue
        const Color(0xFF22C55E), // Green
        const Color(0xFFF59E0B), // Amber
        const Color(0xFF8B5CF6), // Purple
        const Color(0xFFEC4899), // Pink
        const Color(0xFF06B6D4), // Cyan
      ];
      final index = name!.codeUnitAt(0) % colors.length;
      return colors[index];
    }

    return KvittColors.gray;
  }

  @override
  Widget build(BuildContext context) {
    Widget avatar;

    if (imageUrl != null && imageUrl!.isNotEmpty) {
      avatar = CachedNetworkImage(
        imageUrl: imageUrl!,
        imageBuilder: (context, imageProvider) => Container(
          width: _size,
          height: _size,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            image: DecorationImage(
              image: imageProvider,
              fit: BoxFit.cover,
            ),
          ),
        ),
        placeholder: (context, url) => _buildPlaceholder(),
        errorWidget: (context, url, error) => _buildInitials(),
      );
    } else {
      avatar = _buildInitials();
    }

    if (showBorder) {
      avatar = Container(
        padding: const EdgeInsets.all(2),
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(
            color: borderColor ?? KvittColors.primary,
            width: 2,
          ),
        ),
        child: avatar,
      );
    }

    if (onTap != null) {
      return GestureDetector(
        onTap: onTap,
        child: avatar,
      );
    }

    return avatar;
  }

  Widget _buildInitials() {
    return Container(
      width: _size,
      height: _size,
      decoration: BoxDecoration(
        color: _backgroundColor,
        shape: BoxShape.circle,
      ),
      alignment: Alignment.center,
      child: Text(
        _initials,
        style: TextStyle(
          color: KvittColors.white,
          fontSize: _fontSize,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _buildPlaceholder() {
    return Container(
      width: _size,
      height: _size,
      decoration: BoxDecoration(
        color: KvittColors.lightGray.withOpacity(0.3),
        shape: BoxShape.circle,
      ),
    );
  }
}

/// Avatar with online/offline status indicator
class KvittAvatarWithStatus extends StatelessWidget {
  final String? imageUrl;
  final String? name;
  final KvittAvatarSize size;
  final bool isOnline;

  const KvittAvatarWithStatus({
    super.key,
    this.imageUrl,
    this.name,
    this.size = KvittAvatarSize.medium,
    this.isOnline = false,
  });

  @override
  Widget build(BuildContext context) {
    final avatarSize = switch (size) {
      KvittAvatarSize.small => 32.0,
      KvittAvatarSize.medium => 40.0,
      KvittAvatarSize.large => 56.0,
      KvittAvatarSize.xlarge => 80.0,
    };

    final statusSize = switch (size) {
      KvittAvatarSize.small => 8.0,
      KvittAvatarSize.medium => 10.0,
      KvittAvatarSize.large => 14.0,
      KvittAvatarSize.xlarge => 18.0,
    };

    return SizedBox(
      width: avatarSize,
      height: avatarSize,
      child: Stack(
        children: [
          KvittAvatar(
            imageUrl: imageUrl,
            name: name,
            size: size,
          ),
          Positioned(
            right: 0,
            bottom: 0,
            child: Container(
              width: statusSize,
              height: statusSize,
              decoration: BoxDecoration(
                color: isOnline ? KvittColors.success : KvittColors.gray,
                shape: BoxShape.circle,
                border: Border.all(
                  color: KvittColors.white,
                  width: 2,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
