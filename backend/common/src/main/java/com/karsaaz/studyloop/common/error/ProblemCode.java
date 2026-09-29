package com.karsaaz.studyloop.common.error;

public final class ProblemCode {
  public static final String AUTH_INVALID_CREDENTIALS = "AUTH_INVALID_CREDENTIALS";
  public static final String AUTH_ACCOUNT_LOCKED = "AUTH_ACCOUNT_LOCKED";
  public static final String AUTH_MFA_REQUIRED = "AUTH_MFA_REQUIRED";
  public static final String AUTH_MFA_INVALID = "AUTH_MFA_INVALID";
  public static final String AUTH_TOKEN_INVALID = "AUTH_TOKEN_INVALID";
  public static final String AUTH_EMAIL_NOT_VERIFIED = "AUTH_EMAIL_NOT_VERIFIED";
  public static final String VALIDATION_FAILED = "VALIDATION_FAILED";
  public static final String NOT_FOUND = "NOT_FOUND";
  public static final String FORBIDDEN = "FORBIDDEN";
  public static final String CONFLICT = "CONFLICT";
  public static final String RATE_LIMITED = "RATE_LIMITED";
  public static final String FEATURE_DISABLED = "FEATURE_DISABLED";
  public static final String INTERNAL_ERROR = "INTERNAL_ERROR";

  private ProblemCode() {}
}
