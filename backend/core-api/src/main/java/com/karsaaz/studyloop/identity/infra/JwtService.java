package com.karsaaz.studyloop.identity.infra;

import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
  private final SecretKey key;
  private final Clock clock;
  private final long accessTtlMinutes;

  public JwtService(
      @Value("${studyloop.jwt.secret}") String secret,
      @Value("${studyloop.jwt.access-ttl-minutes:15}") long accessTtlMinutes,
      Clock clock) {
    this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    this.clock = clock;
    this.accessTtlMinutes = accessTtlMinutes;
  }

  public String createAccessToken(AccountPrincipal principal) {
    Instant now = clock.instant();
    var builder = Jwts.builder()
        .subject(principal.accountId() != null ? principal.accountId().toString() : principal.studentId().toString())
        .claim("roles", principal.roles())
        .claim("mfa", principal.mfaSatisfied())
        .claim("sid", principal.sessionId().toString())
        .issuedAt(Date.from(now))
        .expiration(Date.from(now.plusSeconds(accessTtlMinutes * 60)))
        .signWith(key);
    if (principal.studentId() != null) {
      builder.claim("studentId", principal.studentId().toString());
    }
    return builder.compact();
  }

  public AccountPrincipal parse(String token) {
    Claims claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
    UUID accountId = UUID.fromString(claims.getSubject());
    @SuppressWarnings("unchecked")
    List<String> roles = claims.get("roles", List.class);
    boolean mfa = Boolean.TRUE.equals(claims.get("mfa", Boolean.class));
    UUID sid = UUID.fromString(claims.get("sid", String.class));
    UUID studentId = claims.get("studentId") != null ? UUID.fromString(claims.get("studentId", String.class)) : null;
    return new AccountPrincipal(accountId, studentId, roles, mfa, sid);
  }
}
