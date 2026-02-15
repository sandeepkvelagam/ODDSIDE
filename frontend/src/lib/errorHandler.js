/**
 * Error handling utilities for Kvitt frontend
 * Maps API and Supabase errors to user-friendly messages
 */

// Error codes (should match backend)
export const ErrorCode = {
  // Auth errors
  AUTH_INVALID_CREDENTIALS: "AUTH_001",
  AUTH_EMAIL_NOT_FOUND: "AUTH_002",
  AUTH_WRONG_PASSWORD: "AUTH_003",
  AUTH_ACCOUNT_DISABLED: "AUTH_004",
  AUTH_SESSION_EXPIRED: "AUTH_005",
  AUTH_TOKEN_INVALID: "AUTH_006",
  AUTH_EMAIL_NOT_VERIFIED: "AUTH_007",
  AUTH_SIGNUP_FAILED: "AUTH_008",
  AUTH_RATE_LIMITED: "AUTH_009",
  
  // User errors
  USER_NOT_FOUND: "USER_001",
  USER_ALREADY_EXISTS: "USER_002",
  USER_INVALID_EMAIL: "USER_003",
  
  // Server errors
  SERVER_ERROR: "SERVER_001",
  NETWORK_ERROR: "NETWORK_001",
};

// User-friendly messages - clear and actionable
const ERROR_MESSAGES = {
  // Auth
  [ErrorCode.AUTH_INVALID_CREDENTIALS]: "Email or password is incorrect.",
  [ErrorCode.AUTH_EMAIL_NOT_FOUND]: "No account found with this email.",
  [ErrorCode.AUTH_WRONG_PASSWORD]: "Incorrect password.",
  [ErrorCode.AUTH_ACCOUNT_DISABLED]: "This account has been disabled. Please contact support.",
  [ErrorCode.AUTH_SESSION_EXPIRED]: "Your session has expired. Please log in again.",
  [ErrorCode.AUTH_TOKEN_INVALID]: "Authentication failed. Please log in again.",
  [ErrorCode.AUTH_EMAIL_NOT_VERIFIED]: "Please verify your email before logging in.",
  [ErrorCode.AUTH_SIGNUP_FAILED]: "Unable to create account. Please try again.",
  [ErrorCode.AUTH_RATE_LIMITED]: "Too many attempts. Wait a few minutes and try again.",

  // User
  [ErrorCode.USER_NOT_FOUND]: "User not found.",
  [ErrorCode.USER_ALREADY_EXISTS]: "This email is already registered. Log in instead?",
  [ErrorCode.USER_INVALID_EMAIL]: "Please enter a valid email address.",

  // Server
  [ErrorCode.SERVER_ERROR]: "Something went wrong. Please try again.",
  [ErrorCode.NETWORK_ERROR]: "Unable to connect. Check your internet connection.",
};

/**
 * Parse Supabase error and return user-friendly message
 */
export function parseSupabaseError(error) {
  // Debug: Log raw error in development to see what Supabase actually returns
  if (process.env.NODE_ENV === 'development') {
    console.log('[parseSupabaseError] Raw error:', {
      message: error?.message,
      code: error?.code,
      status: error?.status,
      name: error?.name,
      error: error?.error,
      fullError: JSON.stringify(error, null, 2)
    });
  }

  if (!error) return { code: ErrorCode.SERVER_ERROR, message: ERROR_MESSAGES[ErrorCode.SERVER_ERROR] };

  // Check for nested error structure (Supabase sometimes wraps errors)
  let actualError = error;
  if (error?.error && typeof error.error === 'object') {
    actualError = error.error;
  }

  const errorMessage = actualError.message?.toLowerCase() || '';
  const errorCode = actualError.code?.toLowerCase() || '';

  // Map common Supabase errors - check both message and code

  // Invalid credentials (covers both wrong email and wrong password in Supabase)
  if (errorMessage.includes('invalid login credentials') ||
      errorMessage.includes('invalid_credentials') ||
      errorCode.includes('invalid_credentials') ||
      (errorMessage.includes('invalid') && errorMessage.includes('credential'))) {
    return { code: ErrorCode.AUTH_INVALID_CREDENTIALS, message: ERROR_MESSAGES[ErrorCode.AUTH_INVALID_CREDENTIALS] };
  }

  // Wrong password patterns
  if (errorMessage.includes('wrong password') ||
      errorMessage.includes('password is incorrect') ||
      errorMessage.includes('incorrect password')) {
    return { code: ErrorCode.AUTH_WRONG_PASSWORD, message: ERROR_MESSAGES[ErrorCode.AUTH_WRONG_PASSWORD] };
  }

  // Server returned invalid response - Supabase wrapper error (treat as invalid credentials)
  if (errorMessage.includes('server returned') ||
      errorMessage.includes('invalid response') ||
      errorMessage.includes('unexpected response')) {
    return { code: ErrorCode.AUTH_INVALID_CREDENTIALS, message: ERROR_MESSAGES[ErrorCode.AUTH_INVALID_CREDENTIALS] };
  }

  // User not found
  if (errorMessage.includes('user not found') ||
      errorMessage.includes('no user found') ||
      errorMessage.includes('user does not exist')) {
    return { code: ErrorCode.AUTH_EMAIL_NOT_FOUND, message: ERROR_MESSAGES[ErrorCode.AUTH_EMAIL_NOT_FOUND] };
  }

  // Email not verified
  if (errorMessage.includes('email not confirmed') ||
      errorMessage.includes('email_not_confirmed') ||
      errorCode.includes('email_not_confirmed')) {
    return { code: ErrorCode.AUTH_EMAIL_NOT_VERIFIED, message: ERROR_MESSAGES[ErrorCode.AUTH_EMAIL_NOT_VERIFIED] };
  }

  // Rate limited
  if (errorMessage.includes('rate limit') ||
      errorMessage.includes('too many requests') ||
      errorCode.includes('over_request_rate_limit')) {
    return { code: ErrorCode.AUTH_RATE_LIMITED, message: ERROR_MESSAGES[ErrorCode.AUTH_RATE_LIMITED] };
  }

  // User already exists
  if (errorMessage.includes('already registered') ||
      errorMessage.includes('user already exists') ||
      errorMessage.includes('already been registered') ||
      errorCode.includes('user_already_exists')) {
    return { code: ErrorCode.USER_ALREADY_EXISTS, message: ERROR_MESSAGES[ErrorCode.USER_ALREADY_EXISTS] };
  }

  // Invalid email format
  if (errorMessage.includes('invalid email') ||
      errorMessage.includes('email format') ||
      errorMessage.includes('unable to validate email') ||
      errorMessage.includes('not a valid email')) {
    return { code: ErrorCode.USER_INVALID_EMAIL, message: ERROR_MESSAGES[ErrorCode.USER_INVALID_EMAIL] };
  }

  // Weak password
  if (errorMessage.includes('password') &&
      (errorMessage.includes('weak') ||
       errorMessage.includes('short') ||
       errorMessage.includes('should be') ||
       errorMessage.includes('at least'))) {
    return { code: ErrorCode.AUTH_SIGNUP_FAILED, message: "Password must be at least 6 characters." };
  }

  // Signup disabled
  if (errorMessage.includes('signup') && errorMessage.includes('disabled')) {
    return { code: ErrorCode.AUTH_SIGNUP_FAILED, message: "Signups are currently disabled." };
  }

  // Network/fetch errors
  if (errorMessage.includes('fetch') ||
      errorMessage.includes('network') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('failed to fetch')) {
    return { code: ErrorCode.NETWORK_ERROR, message: ERROR_MESSAGES[ErrorCode.NETWORK_ERROR] };
  }

  // Body locked/disturbed - Supabase fetch issue
  if (errorMessage.includes('body') &&
      (errorMessage.includes('locked') || errorMessage.includes('disturbed') || errorMessage.includes('stream'))) {
    return { code: ErrorCode.NETWORK_ERROR, message: ERROR_MESSAGES[ErrorCode.NETWORK_ERROR] };
  }

  // JSON parse errors
  if (errorMessage.includes('json') || errorMessage.includes('parse') || errorMessage.includes('unexpected token')) {
    return { code: ErrorCode.SERVER_ERROR, message: "Server error. Please try again." };
  }

  // Session expired
  if (errorMessage.includes('session') && (errorMessage.includes('expired') || errorMessage.includes('invalid'))) {
    return { code: ErrorCode.AUTH_SESSION_EXPIRED, message: ERROR_MESSAGES[ErrorCode.AUTH_SESSION_EXPIRED] };
  }

  // Default fallback - NEVER show raw error.message to users
  // Always use friendly message to avoid confusing technical errors
  return {
    code: ErrorCode.SERVER_ERROR,
    message: ERROR_MESSAGES[ErrorCode.SERVER_ERROR]
  };
}

/**
 * Parse API error from axios response
 */
export function parseApiError(error) {
  // Network error
  if (!error.response) {
    return { code: ErrorCode.NETWORK_ERROR, message: ERROR_MESSAGES[ErrorCode.NETWORK_ERROR] };
  }
  
  const data = error.response?.data;
  
  // Backend returned structured error
  if (data?.code && data?.message) {
    return { code: data.code, message: data.message };
  }
  
  // FastAPI detail message
  if (data?.detail) {
    return { code: ErrorCode.SERVER_ERROR, message: data.detail };
  }
  
  // Status code based fallback
  const status = error.response?.status;
  if (status === 401) {
    return { code: ErrorCode.AUTH_SESSION_EXPIRED, message: ERROR_MESSAGES[ErrorCode.AUTH_SESSION_EXPIRED] };
  }
  if (status === 403) {
    return { code: ErrorCode.AUTH_TOKEN_INVALID, message: "You don't have permission to do this." };
  }
  if (status === 404) {
    return { code: ErrorCode.USER_NOT_FOUND, message: "The requested resource was not found." };
  }
  if (status === 429) {
    return { code: ErrorCode.AUTH_RATE_LIMITED, message: ERROR_MESSAGES[ErrorCode.AUTH_RATE_LIMITED] };
  }
  
  return { code: ErrorCode.SERVER_ERROR, message: ERROR_MESSAGES[ErrorCode.SERVER_ERROR] };
}

/**
 * Get friendly message for error code
 */
export function getErrorMessage(code) {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES[ErrorCode.SERVER_ERROR];
}

/**
 * Log error for debugging (only in development)
 */
export function logError(context, error) {
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${context}]`, error);
  }
}
