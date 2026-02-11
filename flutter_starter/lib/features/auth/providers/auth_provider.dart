import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../data/datasources/api_client.dart';

/// Stream of auth state changes from Supabase
final authStateProvider = StreamProvider<User?>((ref) {
  return Supabase.instance.client.auth.onAuthStateChange.map((event) {
    return event.session?.user;
  });
});

/// Current authenticated user (synchronous access)
final currentUserProvider = Provider<User?>((ref) {
  return ref.watch(authStateProvider).valueOrNull;
});

/// Check if user is authenticated
final isAuthenticatedProvider = Provider<bool>((ref) {
  return ref.watch(currentUserProvider) != null;
});

/// Auth repository for sign in/up/out operations
final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(ref.watch(apiClientProvider));
});

class AuthRepository {
  final ApiClient _api;

  AuthRepository(this._api);

  /// Get current Supabase client
  SupabaseClient get _supabase => Supabase.instance.client;

  /// Sign in with email and password
  Future<User> signIn({
    required String email,
    required String password,
  }) async {
    final response = await _supabase.auth.signInWithPassword(
      email: email,
      password: password,
    );

    if (response.user == null) {
      throw Exception('Sign in failed');
    }

    // Sync user to MongoDB backend
    await _syncUserToBackend(response.session!);

    return response.user!;
  }

  /// Sign up with email, password, and name
  Future<User> signUp({
    required String email,
    required String password,
    required String name,
  }) async {
    final response = await _supabase.auth.signUp(
      email: email,
      password: password,
      data: {'name': name},
    );

    if (response.user == null) {
      throw Exception('Sign up failed');
    }

    // Sync new user to MongoDB backend
    try {
      await _api.post('/auth/sync-user', data: {
        'supabase_id': response.user!.id,
        'email': email,
        'name': name,
      });
    } catch (e) {
      // Don't throw - user is created in Supabase even if backend sync fails
      print('Warning: Failed to sync user to backend: $e');
    }

    return response.user!;
  }

  /// Sign out
  Future<void> signOut() async {
    // Try to logout from backend first
    try {
      await _api.post('/auth/logout');
    } catch (e) {
      // Ignore backend logout errors
    }

    await _supabase.auth.signOut();
  }

  /// Send password reset email
  Future<void> resetPassword(String email) async {
    await _supabase.auth.resetPasswordForEmail(email);
  }

  /// Get current session
  Session? get currentSession => _supabase.auth.currentSession;

  /// Get current user
  User? get currentUser => _supabase.auth.currentUser;

  /// Sync user data to MongoDB backend
  Future<void> _syncUserToBackend(Session session) async {
    try {
      await _api.post('/auth/sync-user', data: {
        'supabase_id': session.user.id,
        'email': session.user.email,
        'name': session.user.userMetadata?['name'] ??
            session.user.email?.split('@')[0],
        'picture': session.user.userMetadata?['avatar_url'],
      });
    } catch (e) {
      print('Warning: Failed to sync user to backend: $e');
    }
  }
}
