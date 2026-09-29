package com.karsaaz.studyloop.gateway.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(1)
public class GatewayAuthFilter extends OncePerRequestFilter {
  @Value("${studyloop.gateway.service-token}")
  private String expectedToken;

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {
    String path = request.getRequestURI();
    if (path.startsWith("/actuator")) {
      filterChain.doFilter(request, response);
      return;
    }
    String token = request.getHeader("X-Service-Token");
    if (token == null || !token.equals(expectedToken)) {
      response.setStatus(401);
      response.setContentType("application/problem+json");
      response.getWriter().write("{\"title\":\"Unauthorized\",\"status\":401,\"code\":\"AUTH_TOKEN_INVALID\"}");
      return;
    }
    filterChain.doFilter(request, response);
  }
}
