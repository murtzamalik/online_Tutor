package com.karsaaz.studyloop.common.error;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;
import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiProblem(
    String type,
    String title,
    int status,
    String code,
    String detail,
    String traceId,
    List<FieldError> errors
) {
  public record FieldError(String field, String message, String code) {}

  public static ApiProblem of(int status, String code, String title, String detail, String traceId) {
    return new ApiProblem("about:blank", title, status, code, detail, traceId, null);
  }
}
