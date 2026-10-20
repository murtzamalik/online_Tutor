package com.karsaaz.studyloop.platform.api;

import com.karsaaz.studyloop.common.error.ApiProblem;
import com.karsaaz.studyloop.common.error.AppException;
import com.karsaaz.studyloop.common.error.ProblemCode;
import com.karsaaz.studyloop.common.tracing.TraceIds;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {
  private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

  @ExceptionHandler(AppException.class)
  public ResponseEntity<ApiProblem> handleApp(AppException ex) {
    return problem(ex.getStatus(), ex.getCode(), ex.getMessage());
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ApiProblem> handleValidation(MethodArgumentNotValidException ex) {
    List<ApiProblem.FieldError> errors = ex.getBindingResult().getFieldErrors().stream()
        .map(fe -> new ApiProblem.FieldError(fe.getField(), fe.getDefaultMessage(), ProblemCode.VALIDATION_FAILED))
        .toList();
    ApiProblem body = new ApiProblem(
        "about:blank", "Validation failed", 400, ProblemCode.VALIDATION_FAILED,
        "Request validation failed", traceId(), errors);
    return ResponseEntity.status(400).contentType(MediaType.APPLICATION_PROBLEM_JSON).body(body);
  }

  @ExceptionHandler(ConstraintViolationException.class)
  public ResponseEntity<ApiProblem> handleConstraint(ConstraintViolationException ex) {
    return problem(400, ProblemCode.VALIDATION_FAILED, "Request validation failed");
  }

  @ExceptionHandler(BadCredentialsException.class)
  public ResponseEntity<ApiProblem> handleBadCreds(BadCredentialsException ex) {
    return problem(401, ProblemCode.AUTH_INVALID_CREDENTIALS, "Invalid credentials");
  }

  @ExceptionHandler(AccessDeniedException.class)
  public ResponseEntity<ApiProblem> handleDenied(AccessDeniedException ex) {
    return problem(403, ProblemCode.FORBIDDEN, "Forbidden");
  }

  /** Malformed client input (bad UUID in the path, unreadable JSON) is a 400, not a server error. */
  @ExceptionHandler({MethodArgumentTypeMismatchException.class, HttpMessageNotReadableException.class})
  public ResponseEntity<ApiProblem> handleBadInput(Exception ex) {
    return problem(400, ProblemCode.VALIDATION_FAILED, "Request could not be read");
  }

  @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
  public ResponseEntity<ApiProblem> handleMethod(HttpRequestMethodNotSupportedException ex) {
    return problem(405, ProblemCode.VALIDATION_FAILED, "Method not allowed");
  }

  @ExceptionHandler(NoResourceFoundException.class)
  public ResponseEntity<ApiProblem> handleNoRoute(NoResourceFoundException ex) {
    return problem(404, ProblemCode.NOT_FOUND, "Not found");
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ApiProblem> handleOther(Exception ex, HttpServletRequest req) {
    log.error("Unhandled error path={} code=INTERNAL", req.getRequestURI(), ex);
    return problem(500, ProblemCode.INTERNAL_ERROR, "An unexpected error occurred");
  }

  private ResponseEntity<ApiProblem> problem(int status, String code, String detail) {
    String title = switch (status) {
      case 400 -> "Bad Request";
      case 401 -> "Unauthorized";
      case 403 -> "Forbidden";
      case 404 -> "Not Found";
      case 409 -> "Conflict";
      case 501 -> "Not Implemented";
      default -> "Error";
    };
    return ResponseEntity.status(status)
        .contentType(MediaType.APPLICATION_PROBLEM_JSON)
        .body(ApiProblem.of(status, code, title, detail, traceId()));
  }

  private String traceId() {
    String id = MDC.get(TraceIds.MDC_KEY);
    return id != null ? id : "unknown";
  }
}
