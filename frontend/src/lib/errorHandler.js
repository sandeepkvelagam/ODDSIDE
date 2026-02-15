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

// User-friendly messages
const ERROR_MESSAGES = {
  // Auth
  [ErrorCode.AUTH_INVALID_CREDENTIALS]: "Invalid email or password. Please check and try again.",
  [ErrorCode.AUTH_EMAIL_NOT_FOUND]: "No account found with this email. Would you like to sign up?",
  [ErrorCode.AUTH_WRONG_PASSWORD]: "Incorrect password. Please try again or reset your password.",
  [ErrorCode.AUTH_ACCOUNT_DISABLED]: "This account has been disabled. Please contact support.",
  [ErrorCode.AUTH_SESSION_EXPIRED]: "Your session has expired. Please log in again.",
  [ErrorCode.AUTH_TOKEN_INVALID]: "Authentication failed. Please log in again.",
  [ErrorCode.AUTH_EMAIL_NOT_VERIFIED]: "Please check your email and verify your account before logging in.",
  [ErrorCode.AUTH_SIGNUP_FAILED]: "Unable to create account. Please try again.",
  [ErrorCode.AUTH_RATE_LIMITED]: "Too many attempts. Please wait a few minutes before trying again.",
  
  // User
  [ErrorCode.USER_NOT_FOUND]: "User not found.",
  [ErrorCode.USER_ALREADY_EXISTS]: "An account with this email already exists. Try logging in instead.",
  [ErrorCode.USER_INVALID_EMAIL]: "Please enter a valid email address.",
  
  // Server
  [ErrorCode.SERVER_ERROR]: "Something went wrong. Please try again later.",
  [ErrorCode.NETWORK_ERROR]: "Unable to connect. Please check your internet connection.",
};

/**
 * Parse Supabase error and return user-friendly message
 */
export function parseSupabaseError(error) {
  if (!error) return { code: ErrorCode.SERVER_ERROR, message: ERROR_MESSAGES[ErrorCode.SERVER_ERROR] };
  
  const errorMessage = error.message?.toLowerCase() || '';
  const errorCode = error.code || (error.__isAuthError ? 'auth_error' : 'unknown');

  // Check error code first (more reliable than message parsing)
  if (errorCode === 'user_already_exists' || errorCode === 'email_exists') {
    return { code: ErrorCode.USER_ALREADY_EXISTS, message: ERROR_MESSAGES[ErrorCode.USER_ALREADY_EXISTS] };
  }
  if (errorCode === 'over_request_rate_limit' || errorCode === 'rate_limit_exceeded') {
    return { code: ErrorCode.AUTH_RATE_LIMITED, message: ERROR_MESSAGES[ErrorCode.AUTH_RATE_LIMITED] };
  }
  if (errorCode === 'email_not_confirmed') {
    return { code: ErrorCode.AUTH_EMAIL_NOT_VERIFIED, message: ERROR_MESSAGES[ErrorCode.AUTH_EMAIL_NOT_VERIFIED] };
  }
  if (errorCode === 'invalid_credentials') {
    return { code: ErrorCode.AUTH_INVALID_CREDENTIALS, message: ERROR_MESSAGES[ErrorCode.AUTH_INVALID_CREDENTIALS] };
  }
  if (errorCode === 'signup_disabled') {
    return { code: ErrorCode.AUTH_SIGNUP_FAILED, message: "Sign up is currently disabled. Please try again later." };
  }

  // Fallback to message-based matching
  if (errorMessage.includes('invalid login credentials') || errorMessage.includes('invalid_credentials')) {
    return { code: ErrorCode.AUTH_INVALID_CREDENTIALS, message: ERROR_MESSAGES[ErrorCode.AUTH_INVALID_CREDENTIALS] };
  }
  
  if (errorMessage.includes('user not found') || errorMessage.includes('no user found')) {
    return { code: ErrorCode.AUTH_EMAIL_NOT_FOUND, message: ERROR_MESSAGES[ErrorCode.AUTH_EMAIL_NOT_FOUND] };
  }
  
  if (errorMessage.includes('email not confirmed') || errorMessage.includes('email_not_confirmed')) {
    return { code: ErrorCode.AUTH_EMAIL_NOT_VERIFIED, message: ERROR_MESSAGES[ErrorCode.AUTH_EMAIL_NOT_VERIFIED] };
  }
  
  if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
    return { code: ErrorCode.AUTH_RATE_LIMITED, message: ERROR_MESSAGES[ErrorCode.AUTH_RATE_LIMITED] };
  }
  
  if (errorMessage.includes('already registered') || errorMessage.includes('user already exists')) {
    return { code: ErrorCode.USER_ALREADY_EXISTS, message: ERROR_MESSAGES[ErrorCode.USER_ALREADY_EXISTS] };
  }
  
  if (errorMessage.includes('invalid email') || errorMessage.includes('email format')) {
    return { code: ErrorCode.USER_INVALID_EMAIL, message: ERROR_MESSAGES[ErrorCode.USER_INVALID_EMAIL] };
  }
  
  if (errorMessage.includes('password') && (errorMessage.includes('weak') || errorMessage.includes('short'))) {
    return { code: ErrorCode.AUTH_SIGNUP_FAILED, message: "Password must be at least 6 characters." };
  }
  
  if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('connection')) {
    return { code: ErrorCode.NETWORK_ERROR, message: ERROR_MESSAGES[ErrorCode.NETWORK_ERROR] };
  }
  
  if (errorMessage.includes('body') && (errorMessage.includes('locked') || errorMessage.includes('disturbed'))) {
    // This is a Supabase client issue - likely a network/fetch problem
    return { code: ErrorCode.NETWORK_ERROR, message: "Connection error. Please check your internet and try again." };
  }
  
  if (errorMessage.includes('json') || errorMessage.includes('parse')) {
    return { code: ErrorCode.SERVER_ERROR, message: "Server returned an invalid response. Please try again." };
  }
  
  // Default fallback
  return { 
    code: ErrorCode.SERVER_ERROR, 
    message: error.message || ERROR_MESSAGES[ErrorCode.SERVER_ERROR] 
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
