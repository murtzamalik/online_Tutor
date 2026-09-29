package com.karsaaz.studyloop.common.error;

public class AppException extends RuntimeException {
  private final String code;
  private final int status;

  public AppException(String code, int status, String message) {
    super(message);
    this.code = code;
    this.status = status;
  }

  public String getCode() { return code; }
  public int getStatus() { return status; }

  public static AppException unauthorized(String code, String message) {
    return new AppException(code, 401, message);
  }

  public static AppException forbidden(String message) {
    return new AppException(ProblemCode.FORBIDDEN, 403, message);
  }

  public static AppException notFound(String message) {
    return new AppException(ProblemCode.NOT_FOUND, 404, message);
  }

  public static AppException conflict(String code, String message) {
    return new AppException(code, 409, message);
  }

  public static AppException badRequest(String code, String message) {
    return new AppException(code, 400, message);
  }

  public static AppException featureDisabled(String message) {
    return new AppException(ProblemCode.FEATURE_DISABLED, 501, message);
  }
}
