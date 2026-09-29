package com.karsaaz.studyloop.identity.infra;

import java.util.Arrays;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

  @Bean
  SecurityFilterChain filterChain(HttpSecurity http, JwtAuthFilter jwtAuthFilter) throws Exception {
    http.csrf(csrf -> csrf.disable())
        .cors(Customizer.withDefaults())
        .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/actuator/health", "/actuator/info").permitAll()
            .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/v1/catalog/**").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/v1/legal/**").permitAll()
            .requestMatchers(HttpMethod.POST, "/api/v1/cookie-consent").permitAll()
            .requestMatchers("/api/v1/marketing/**").permitAll()
            .requestMatchers(HttpMethod.POST, "/api/v1/webhooks/stripe").permitAll()
            .requestMatchers(HttpMethod.POST, "/api/v1/webhooks/ucheck").permitAll()
            .requestMatchers(HttpMethod.POST, "/api/v1/billing/checkout/plan-preview").permitAll()
            .requestMatchers(HttpMethod.POST, "/api/v1/jobs/weekly-reports/run").permitAll()
            .requestMatchers(HttpMethod.POST, "/api/v1/internal-svc/safety/classify").permitAll()
            .requestMatchers(HttpMethod.POST, "/api/v1/tutor/rescue").permitAll()
            .requestMatchers(
                "/api/v1/auth/register-parent",
                "/api/v1/auth/verify-email",
                "/api/v1/auth/verify-email/resend",
                "/api/v1/auth/login",
                "/api/v1/auth/mfa/verify",
                "/api/v1/auth/refresh",
                "/api/v1/auth/password/forgot",
                "/api/v1/auth/password/reset",
                "/api/v1/auth/oidc/**",
                "/api/v1/auth/student/**")
            .permitAll()
            .requestMatchers(HttpMethod.POST, "/api/v1/auth/logout").authenticated()
            .requestMatchers("/api/v1/auth/mfa/enroll/**", "/api/v1/auth/mfa/recovery-codes/**").authenticated()
            .requestMatchers("/api/v1/me", "/api/v1/me/**").authenticated()
            .anyRequest().authenticated())
        .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
    return http.build();
  }

  @Bean
  CorsConfigurationSource corsConfigurationSource(
      @Value("${studyloop.cors.allowed-origins}") String origins) {
    CorsConfiguration config = new CorsConfiguration();
    config.setAllowedOrigins(Arrays.asList(origins.split(",")));
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    config.setAllowedHeaders(List.of("*"));
    config.setAllowCredentials(true);
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", config);
    return source;
  }
}
