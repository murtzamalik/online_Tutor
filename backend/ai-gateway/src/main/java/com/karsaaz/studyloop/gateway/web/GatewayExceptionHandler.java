package com.karsaaz.studyloop.gateway.web;

import com.karsaaz.studyloop.gateway.error.GatewayException;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** RFC 7807 bodies with stable codes. Messages carry ids only — never payload text. */
@RestControllerAdvice
public class GatewayExceptionHandler {
  private static final Logger log = LoggerFactory.getLogger(GatewayExceptionHandler.class);

  @ExceptionHandler(GatewayException.class)
  public ResponseEntity<Map<String, Object>> gateway(GatewayException e) {
    log.warn("Gateway failure code={} status={} detail={}", e.code(), e.httpStatus(), e.getMessage());
    return problem(e.httpStatus(), e.code(), e.getMessage());
  }

  @ExceptionHandler({
    org.springframework.web.bind.MethodArgumentNotValidException.class,
    org.springframework.http.converter.HttpMessageNotReadableException.class
  })
  public ResponseEntity<Map<String, Object>> badRequest(Exception e) {
    return problem(400, "VALIDATION_FAILED", "Invalid gateway request");
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<Map<String, Object>> unexpected(Exception e) {
    log.error("Unexpected gateway error", e);
    return problem(500, "INTERNAL_ERROR", "Unexpected gateway error");
  }

  private static ResponseEntity<Map<String, Object>> problem(int status, String code, String detail) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("title", code);
    body.put("status", status);
    body.put("code", code);
    body.put("detail", detail);
    return ResponseEntity.status(status).contentType(MediaType.APPLICATION_PROBLEM_JSON).body(body);
  }
}
