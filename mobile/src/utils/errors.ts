/**
 * Error mapping utilities for friendly user-facing messages
 */

export interface FriendlyError {
  title: string;
  detail: string;
  code?: string;
}

/**
 * Map Supabase auth errors to friendly messages
 */
export function friendlyAuthError(err: any): FriendlyError {
  const msg = (err?.message || "").toLowerCase();
  const status = err?.status;

  // Supabase common auth errors
  if (msg.includes("invalid login credentials") || msg.includes("invalid email or password")) {
    return {
      title: "Incorrect email or password",
      detail: "Please check your credentials and try again.",
      code: "INVALID_CREDENTIALS",
    };
  }

  if (msg.includes("email not confirmed") || msg.includes("email_not_confirmed")) {
    return {
      title: "Email not verified",
      detail: "Check your inbox to confirm your email address.",
      code: "EMAIL_NOT_CONFIRMED",
    };
  }

  if (msg.includes("user already registered") || msg.includes("already registered")) {
    return {
      title: "Account already exists",
      detail: "This email is already registered. Try logging in instead.",
      code: "USER_EXISTS",
    };
  }

  if (msg.includes("rate limit") || status === 429) {
    return {
      title: "Too many attempts",
      detail: "Please wait a minute and try again.",
      code: "RATE_LIMITED",
    };
  }

  if (msg.includes("network") || msg.includes("failed to fetch")) {
    return {
      title: "Connection problem",
      detail: "Check your internet connection and try again.",
      code: "NETWORK_ERROR",
    };
  }

  if (msg.includes("weak password") || (msg.includes("password") && msg.includes("length"))) {
    return {
      title: "Password too weak",
      detail: "Password must be at least 6 characters.",
      code: "WEAK_PASSWORD",
    };
  }

  // Generic auth error
  return {
    title: "Login failed",
    detail: "Please check your credentials and try again.",
    code: "AUTH_ERROR",
  };
}

/**
 * Map API errors (axios) to friendly messages
 */
export function friendlyApiError(err: any): FriendlyError {
  const status = err?.response?.status;
  const code = err?.response?.data?.error?.code;
  const message = err?.response?.data?.error?.message || err?.message;

  // HTTP status codes
  if (status === 401) {
    return {
      title: "Session expired",
      detail: "Please log in again.",
      code: "UNAUTHORIZED",
    };
  }

  if (status === 403) {
    return {
      title: "Not allowed",
      detail: "You don't have permission to do this.",
      code: "FORBIDDEN",
    };
  }

  if (status === 404 || code === "NOT_FOUND") {
    return {
      title: "Not found",
      detail: "That item no longer exists.",
      code: "NOT_FOUND",
    };
  }

  if (status === 409 || code === "CONFLICT") {
    return {
      title: "Conflict",
      detail: message || "This action conflicts with existing data.",
      code: "CONFLICT",
    };
  }

  if (status === 422 || code === "VALIDATION_ERROR") {
    return {
      title: "Invalid input",
      detail: message || "Please check your input and try again.",
      code: "VALIDATION_ERROR",
    };
  }

  if (status === 500 || status === 502 || status === 503) {
    return {
      title: "Server error",
      detail: "We're having trouble on our end. Try again in a moment.",
      code: "SERVER_ERROR",
    };
  }

  // Network errors
  if (err?.code === "ECONNABORTED" || err?.code === "ETIMEDOUT") {
    return {
      title: "Request timeout",
      detail: "The request took too long. Check your connection.",
      code: "TIMEOUT",
    };
  }

  if (!status && (err?.message?.includes("network") || err?.message?.includes("Network"))) {
    return {
      title: "Connection problem",
      detail: "Check your internet connection and try again.",
      code: "NETWORK_ERROR",
    };
  }

  // Generic API error
  return {
    title: "Oops — we hit a snag",
    detail: "Please try again in a moment.",
    code: "UNKNOWN_ERROR",
  };
}

/**
 * Get request ID from error response (for support/debugging)
 */
export function getRequestId(err: any): string | null {
  return (
    err?.response?.headers?.["x-request-id"] ||
    err?.response?.data?.requestId ||
    null
  );
}

/**
 * Format error for display with optional request ID
 */
export function formatErrorWithId(
  error: FriendlyError,
  requestId?: string | null
): string {
  let msg = `${error.title}\n${error.detail}`;
  if (requestId) {
    msg += `\n\nRef: ${requestId.substring(0, 8)}`;
  }
  return msg;
}
