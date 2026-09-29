package com.karsaaz.studyloop.platform.infra;

import com.karsaaz.studyloop.common.tracing.TraceIds;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CorrelationIdFilter extends OncePerRequestFilter {
  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {
    String incoming = request.getHeader(TraceIds.HEADER);
    String id = (incoming == null || incoming.isBlank()) ? TraceIds.newId() : incoming;
    MDC.put(TraceIds.MDC_KEY, id);
    response.setHeader(TraceIds.HEADER, id);
    try {
      filterChain.doFilter(request, response);
    } finally {
      MDC.remove(TraceIds.MDC_KEY);
    }
  }
}
