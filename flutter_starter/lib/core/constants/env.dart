/// Environment configuration
///
/// TODO: Replace these with your actual values
/// For production, consider using --dart-define or .env files
class Env {
  // Backend API URL (your Railway deployment)
  static const String apiBaseUrl = 'https://your-backend.up.railway.app/api';

  // WebSocket URL (same as backend, without /api)
  static const String socketUrl = 'https://your-backend.up.railway.app';

  // Supabase configuration
  // Get these from: Supabase Dashboard > Settings > API
  static const String supabaseUrl = 'https://your-project.supabase.co';
  static const String supabaseAnonKey = 'your-anon-key-here';

  // Stripe (for premium features)
  static const String stripePublishableKey = 'pk_test_...';
}
