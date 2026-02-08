"""
Centralized Error Handling & Logging for Kvitt
Provides consistent error messages and logging across the app
"""

import logging
import traceback
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import os

# Configure logging
LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
LOG_FORMAT = '%(asctime)s | %(levelname)s | %(name)s | %(message)s'

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    format=LOG_FORMAT
)

logger = logging.getLogger('kvitt')

# Error codes for frontend
class ErrorCode:
    # Auth errors (1xxx)
    AUTH_INVALID_CREDENTIALS = "AUTH_001"
    AUTH_EMAIL_NOT_FOUND = "AUTH_002"
    AUTH_WRONG_PASSWORD = "AUTH_003"
    AUTH_ACCOUNT_DISABLED = "AUTH_004"
    AUTH_SESSION_EXPIRED = "AUTH_005"
    AUTH_TOKEN_INVALID = "AUTH_006"
    AUTH_EMAIL_NOT_VERIFIED = "AUTH_007"
    AUTH_SIGNUP_FAILED = "AUTH_008"
    AUTH_RATE_LIMITED = "AUTH_009"
    
    # User errors (2xxx)
    USER_NOT_FOUND = "USER_001"
    USER_ALREADY_EXISTS = "USER_002"
    USER_INVALID_EMAIL = "USER_003"
    
    # Group errors (3xxx)
    GROUP_NOT_FOUND = "GROUP_001"
    GROUP_ACCESS_DENIED = "GROUP_002"
    GROUP_ALREADY_MEMBER = "GROUP_003"
    GROUP_INVITE_EXPIRED = "GROUP_004"
    
    # Game errors (4xxx)
    GAME_NOT_FOUND = "GAME_001"
    GAME_ACCESS_DENIED = "GAME_002"
    GAME_ALREADY_ENDED = "GAME_003"
    GAME_NOT_STARTED = "GAME_004"
    GAME_MAX_PLAYERS = "GAME_005"
    
    # Transaction errors (5xxx)
    TXN_INVALID_AMOUNT = "TXN_001"
    TXN_INSUFFICIENT_CHIPS = "TXN_002"
    TXN_ALREADY_CASHED_OUT = "TXN_003"
    
    # Server errors (9xxx)
    SERVER_ERROR = "SERVER_001"
    DATABASE_ERROR = "SERVER_002"
    EXTERNAL_SERVICE_ERROR = "SERVER_003"


class AppError(Exception):
    """Custom application error with user-friendly messages"""
    def __init__(
        self, 
        code: str, 
        message: str, 
        status_code: int = 400,
        details: Optional[Dict[str, Any]] = None,
        log_level: str = "warning"
    ):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        self.log_level = log_level
        super().__init__(message)


# User-friendly error messages
ERROR_MESSAGES = {
    # Auth
    ErrorCode.AUTH_INVALID_CREDENTIALS: "Invalid email or password. Please try again.",
    ErrorCode.AUTH_EMAIL_NOT_FOUND: "No account found with this email. Please sign up first.",
    ErrorCode.AUTH_WRONG_PASSWORD: "Incorrect password. Please try again or reset your password.",
    ErrorCode.AUTH_ACCOUNT_DISABLED: "This account has been disabled. Please contact support.",
    ErrorCode.AUTH_SESSION_EXPIRED: "Your session has expired. Please log in again.",
    ErrorCode.AUTH_TOKEN_INVALID: "Invalid authentication token. Please log in again.",
    ErrorCode.AUTH_EMAIL_NOT_VERIFIED: "Please verify your email before logging in.",
    ErrorCode.AUTH_SIGNUP_FAILED: "Unable to create account. Please try again.",
    ErrorCode.AUTH_RATE_LIMITED: "Too many attempts. Please wait a few minutes and try again.",
    
    # User
    ErrorCode.USER_NOT_FOUND: "User not found.",
    ErrorCode.USER_ALREADY_EXISTS: "An account with this email already exists.",
    ErrorCode.USER_INVALID_EMAIL: "Please enter a valid email address.",
    
    # Group
    ErrorCode.GROUP_NOT_FOUND: "Group not found.",
    ErrorCode.GROUP_ACCESS_DENIED: "You don't have permission to access this group.",
    ErrorCode.GROUP_ALREADY_MEMBER: "You're already a member of this group.",
    ErrorCode.GROUP_INVITE_EXPIRED: "This invite has expired or is no longer valid.",
    
    # Game
    ErrorCode.GAME_NOT_FOUND: "Game not found.",
    ErrorCode.GAME_ACCESS_DENIED: "You don't have permission to access this game.",
    ErrorCode.GAME_ALREADY_ENDED: "This game has already ended.",
    ErrorCode.GAME_NOT_STARTED: "This game hasn't started yet.",
    ErrorCode.GAME_MAX_PLAYERS: "This game has reached the maximum number of players.",
    
    # Transaction
    ErrorCode.TXN_INVALID_AMOUNT: "Invalid amount. Please enter a valid number.",
    ErrorCode.TXN_INSUFFICIENT_CHIPS: "Insufficient chips for this transaction.",
    ErrorCode.TXN_ALREADY_CASHED_OUT: "You've already cashed out of this game.",
    
    # Server
    ErrorCode.SERVER_ERROR: "Something went wrong. Please try again later.",
    ErrorCode.DATABASE_ERROR: "Unable to process your request. Please try again.",
    ErrorCode.EXTERNAL_SERVICE_ERROR: "An external service is unavailable. Please try again.",
}


def get_error_message(code: str) -> str:
    """Get user-friendly message for error code"""
    return ERROR_MESSAGES.get(code, "An unexpected error occurred.")


def log_error(
    error: Exception,
    request: Optional[Request] = None,
    user_id: Optional[str] = None,
    context: Optional[Dict[str, Any]] = None
):
    """Log error with context"""
    error_data = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "error_type": type(error).__name__,
        "message": str(error),
        "user_id": user_id,
        "context": context or {}
    }
    
    if request:
        error_data["request"] = {
            "method": request.method,
            "url": str(request.url),
            "client_ip": request.client.host if request.client else "unknown"
        }
    
    if isinstance(error, AppError):
        error_data["code"] = error.code
        error_data["details"] = error.details
        
        log_func = getattr(logger, error.log_level, logger.warning)
        log_func(f"AppError: {error.code} - {error.message}", extra=error_data)
    else:
        error_data["traceback"] = traceback.format_exc()
        logger.error(f"Unhandled error: {error}", extra=error_data)


def create_error_response(error: Exception) -> JSONResponse:
    """Create standardized error response"""
    if isinstance(error, AppError):
        return JSONResponse(
            status_code=error.status_code,
            content={
                "error": True,
                "code": error.code,
                "message": error.message,
                "details": error.details
            }
        )
    elif isinstance(error, HTTPException):
        return JSONResponse(
            status_code=error.status_code,
            content={
                "error": True,
                "code": "HTTP_ERROR",
                "message": error.detail,
                "details": {}
            }
        )
    else:
        return JSONResponse(
            status_code=500,
            content={
                "error": True,
                "code": ErrorCode.SERVER_ERROR,
                "message": get_error_message(ErrorCode.SERVER_ERROR),
                "details": {}
            }
        )


# Supabase error mapping
SUPABASE_ERROR_MAP = {
    "invalid_credentials": ErrorCode.AUTH_INVALID_CREDENTIALS,
    "user_not_found": ErrorCode.AUTH_EMAIL_NOT_FOUND,
    "invalid_grant": ErrorCode.AUTH_WRONG_PASSWORD,
    "user_banned": ErrorCode.AUTH_ACCOUNT_DISABLED,
    "session_expired": ErrorCode.AUTH_SESSION_EXPIRED,
    "invalid_token": ErrorCode.AUTH_TOKEN_INVALID,
    "email_not_confirmed": ErrorCode.AUTH_EMAIL_NOT_VERIFIED,
    "signup_disabled": ErrorCode.AUTH_SIGNUP_FAILED,
    "over_request_rate_limit": ErrorCode.AUTH_RATE_LIMITED,
    "email_exists": ErrorCode.USER_ALREADY_EXISTS,
}


def map_supabase_error(error_code: str, error_message: str = "") -> AppError:
    """Map Supabase error to AppError"""
    # Check for specific error codes
    app_code = SUPABASE_ERROR_MAP.get(error_code)
    
    if not app_code:
        # Try to infer from message
        error_lower = error_message.lower()
        if "email" in error_lower and "not found" in error_lower:
            app_code = ErrorCode.AUTH_EMAIL_NOT_FOUND
        elif "password" in error_lower and ("wrong" in error_lower or "invalid" in error_lower):
            app_code = ErrorCode.AUTH_WRONG_PASSWORD
        elif "rate" in error_lower or "limit" in error_lower:
            app_code = ErrorCode.AUTH_RATE_LIMITED
        elif "disabled" in error_lower or "banned" in error_lower:
            app_code = ErrorCode.AUTH_ACCOUNT_DISABLED
        elif "confirm" in error_lower or "verify" in error_lower:
            app_code = ErrorCode.AUTH_EMAIL_NOT_VERIFIED
        else:
            app_code = ErrorCode.AUTH_INVALID_CREDENTIALS
    
    return AppError(
        code=app_code,
        message=get_error_message(app_code),
        status_code=401 if app_code.startswith("AUTH") else 400
    )


# Request logging middleware helper
async def log_request(request: Request, response_status: int, duration_ms: float):
    """Log API request"""
    logger.info(
        f"{request.method} {request.url.path} - {response_status} ({duration_ms:.2f}ms)",
        extra={
            "method": request.method,
            "path": request.url.path,
            "status": response_status,
            "duration_ms": duration_ms,
            "client_ip": request.client.host if request.client else "unknown"
        }
    )
