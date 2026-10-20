package com.karsaaz.studyloop.gateway.error;

/** Failure with a stable problem code; mapped to problem+json by {@code GatewayExceptionHandler}. */
public class GatewayException extends RuntimeException {
  public static final String PROMPT_NOT_FOUND = "PROMPT_NOT_FOUND";
  public static final String PROMPT_VARIABLES_MISSING = "PROMPT_VARIABLES_MISSING";
  public static final String SCHEMA_FAIL = "SCHEMA_FAIL";
  public static final String VENDOR_ERROR = "VENDOR_ERROR";
  public static final String VENDOR_NOT_CONFIGURED = "VENDOR_NOT_CONFIGURED";
  public static final String ROUTE_NOT_FOUND = "ROUTE_NOT_FOUND";

  private final String code;
  private final int httpStatus;

  public GatewayException(String code, int httpStatus, String message) {
    super(message);
    this.code = code;
    this.httpStatus = httpStatus;
  }

  public GatewayException(String code, int httpStatus, String message, Throwable cause) {
    super(message, cause);
    this.code = code;
    this.httpStatus = httpStatus;
  }

  public String code() {
    return code;
  }

  public int httpStatus() {
    return httpStatus;
  }

  /** Status value written to {@code ai_gateway_log.status} for this failure. */
  public String logStatus() {
    return SCHEMA_FAIL.equals(code) ? "SCHEMA_FAIL" : "ERROR";
  }
}
