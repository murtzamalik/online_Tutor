package com.karsaaz.studyloop.identity.application;

import com.karsaaz.studyloop.common.error.AppException;
import com.karsaaz.studyloop.common.error.ProblemCode;
import com.karsaaz.studyloop.identity.api.dto.AuthDtos;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.identity.infra.JwtService;
import com.karsaaz.studyloop.identity.infra.PasswordHasher;
import com.karsaaz.studyloop.identity.infra.SecretBox;
import com.karsaaz.studyloop.identity.infra.TotpService;
import com.karsaaz.studyloop.platform.application.AuditLogService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
  private final JdbcTemplate jdbc;
  private final PasswordHasher passwordHasher;
  private final JwtService jwtService;
  private final TotpService totpService;
  private final SecretBox secretBox;
  private final AuditLogService auditLogService;
  private final JavaMailSender mailSender;
  private final Clock clock;
  private final SecureRandom random = new SecureRandom();
  private final Map<String, MfaChallenge> mfaChallenges = new HashMap<>();

  private record MfaChallenge(UUID accountId, Instant expiresAt) {}

  public AuthService(
      JdbcTemplate jdbc,
      PasswordHasher passwordHasher,
      JwtService jwtService,
      TotpService totpService,
      SecretBox secretBox,
      AuditLogService auditLogService,
      JavaMailSender mailSender,
      Clock clock) {
    this.jdbc = jdbc;
    this.passwordHasher = passwordHasher;
    this.jwtService = jwtService;
    this.totpService = totpService;
    this.secretBox = secretBox;
    this.auditLogService = auditLogService;
    this.mailSender = mailSender;
    this.clock = clock;
  }

  @Transactional
  public AuthDtos.RegisterParentResponse registerParent(AuthDtos.RegisterParentRequest req) {
    if (!req.acceptTerms()) {
      throw AppException.badRequest(ProblemCode.VALIDATION_FAILED, "Terms must be accepted");
    }
    Integer exists = jdbc.queryForObject(
        "SELECT COUNT(*) FROM account WHERE email = ?", Integer.class, req.email().toLowerCase());
    if (exists != null && exists > 0) {
      throw AppException.conflict(ProblemCode.CONFLICT, "Unable to register with that email");
    }
    UUID accountId = UUID.randomUUID();
    String hash = passwordHasher.hash(req.password().toCharArray());
    jdbc.update(
        "INSERT INTO account (account_id, email, password_hash, display_name, kind, status, mfa_required) "
            + "VALUES (?, ?, ?, ?, 'PARENT', 'PENDING_VERIFICATION', FALSE)",
        accountId, req.email().toLowerCase(), hash, req.displayName());
    jdbc.update("INSERT INTO account_role (account_id, role) VALUES (?, 'PARENT')", accountId);
    jdbc.update(
        "INSERT INTO consent_record (account_id, consent_type, document_version, granted, method) "
            + "VALUES (?, 'TERMS', 'v1', TRUE, 'CHECKBOX')",
        accountId);
    String code = String.format("%06d", random.nextInt(1_000_000));
    jdbc.update(
        "INSERT INTO email_verification (account_id, code_hash, expires_at) VALUES (?, ?, ?)",
        accountId, sha256(code), clock.instant().plus(15, ChronoUnit.MINUTES));
    sendMail(req.email(), "Verify your Study Loop email", "Your verification code is: " + code);
    auditLogService.append(accountId, "PARENT", "ACCOUNT_REGISTER", "account", accountId.toString(), Map.of());
    return new AuthDtos.RegisterParentResponse(accountId, "PENDING_VERIFICATION");
  }

  @Transactional
  public void verifyEmail(AuthDtos.VerifyEmailRequest req) {
    var row = jdbc.query(
        "SELECT a.account_id, ev.verification_id, ev.code_hash, ev.attempts, ev.expires_at, ev.verified_at "
            + "FROM account a JOIN email_verification ev ON ev.account_id = a.account_id "
            + "WHERE a.email = ? ORDER BY ev.sent_at DESC LIMIT 1",
        rs -> {
          if (!rs.next()) return null;
          return new Object[] {
              (UUID) rs.getObject("account_id"),
              (UUID) rs.getObject("verification_id"),
              rs.getString("code_hash"),
              rs.getShort("attempts"),
              rs.getTimestamp("expires_at").toInstant(),
              rs.getTimestamp("verified_at")
          };
        },
        req.email().toLowerCase());
    if (row == null) {
      throw AppException.badRequest(ProblemCode.VALIDATION_FAILED, "Invalid verification");
    }
    UUID accountId = (UUID) row[0];
    UUID verificationId = (UUID) row[1];
    String codeHash = (String) row[2];
    short attempts = (Short) row[3];
    Instant expires = (Instant) row[4];
    if (row[5] != null) {
      return;
    }
    if (attempts >= 5) {
      throw AppException.badRequest(ProblemCode.RATE_LIMITED, "Too many attempts");
    }
    if (expires.isBefore(clock.instant())) {
      throw AppException.badRequest(ProblemCode.VALIDATION_FAILED, "Code expired");
    }
    jdbc.update("UPDATE email_verification SET attempts = attempts + 1 WHERE verification_id = ?", verificationId);
    if (!sha256(req.code()).equals(codeHash)) {
      throw AppException.badRequest(ProblemCode.VALIDATION_FAILED, "Invalid verification");
    }
    jdbc.update("UPDATE email_verification SET verified_at = ? WHERE verification_id = ?", clock.instant(), verificationId);
    jdbc.update(
        "UPDATE account SET status = 'ACTIVE', email_verified_at = ? WHERE account_id = ?",
        clock.instant(), accountId);
  }

  @Transactional
  public void resendVerification(String email) {
    var accountId = jdbc.query(
        "SELECT account_id FROM account WHERE email = ? AND status = 'PENDING_VERIFICATION'",
        rs -> rs.next() ? (UUID) rs.getObject(1) : null,
        email.toLowerCase());
    if (accountId == null) {
      return;
    }
    String code = String.format("%06d", random.nextInt(1_000_000));
    jdbc.update(
        "INSERT INTO email_verification (account_id, code_hash, expires_at) VALUES (?, ?, ?)",
        accountId, sha256(code), clock.instant().plus(15, ChronoUnit.MINUTES));
    sendMail(email, "Verify your Study Loop email", "Your verification code is: " + code);
  }

  @Transactional
  public AuthDtos.TokenResponse login(AuthDtos.LoginRequest req) {
    var account = jdbc.query(
        "SELECT account_id, password_hash, status, mfa_required, locked_until, failed_login_count, kind "
            + "FROM account WHERE email = ?",
        rs -> {
          if (!rs.next()) return null;
          return Map.of(
              "accountId", rs.getObject("account_id"),
              "passwordHash", rs.getString("password_hash") == null ? "" : rs.getString("password_hash"),
              "status", rs.getString("status"),
              "mfaRequired", rs.getBoolean("mfa_required"),
              "lockedUntil", rs.getTimestamp("locked_until") == null ? "" : rs.getTimestamp("locked_until").toInstant().toString(),
              "failed", rs.getShort("failed_login_count"),
              "kind", rs.getString("kind"));
        },
        req.email().toLowerCase());
    if (account == null) {
      throw AppException.unauthorized(ProblemCode.AUTH_INVALID_CREDENTIALS, "Invalid credentials");
    }
    UUID accountId = (UUID) account.get("accountId");
    String locked = (String) account.get("lockedUntil");
    if (!locked.isEmpty() && Instant.parse(locked).isAfter(clock.instant())) {
      throw AppException.unauthorized(ProblemCode.AUTH_ACCOUNT_LOCKED, "Account locked");
    }
    String hash = (String) account.get("passwordHash");
    if (hash.isEmpty() || !passwordHasher.verify(hash, req.password().toCharArray())) {
      jdbc.update(
          "UPDATE account SET failed_login_count = failed_login_count + 1, "
              + "locked_until = CASE WHEN failed_login_count + 1 >= 5 THEN ? ELSE locked_until END WHERE account_id = ?",
          clock.instant().plus(15, ChronoUnit.MINUTES), accountId);
      throw AppException.unauthorized(ProblemCode.AUTH_INVALID_CREDENTIALS, "Invalid credentials");
    }
    String status = (String) account.get("status");
    if ("PENDING_VERIFICATION".equals(status)) {
      throw AppException.unauthorized(ProblemCode.AUTH_EMAIL_NOT_VERIFIED, "Email not verified");
    }
    if (!"ACTIVE".equals(status)) {
      throw AppException.unauthorized(ProblemCode.AUTH_ACCOUNT_LOCKED, "Account not active");
    }
    jdbc.update("UPDATE account SET failed_login_count = 0, locked_until = NULL, last_login_at = ? WHERE account_id = ?",
        clock.instant(), accountId);
    boolean mfaRequired = (Boolean) account.get("mfaRequired");
    if (mfaRequired) {
      String challenge = UUID.randomUUID().toString();
      mfaChallenges.put(challenge, new MfaChallenge(accountId, clock.instant().plus(5, ChronoUnit.MINUTES)));
      return AuthDtos.TokenResponse.mfaChallenge(challenge);
    }
    return issueTokens(accountId, false);
  }

  @Transactional
  public AuthDtos.TokenResponse verifyMfa(AuthDtos.MfaVerifyRequest req) {
    MfaChallenge challenge = mfaChallenges.remove(req.mfaChallengeToken());
    if (challenge == null || challenge.expiresAt().isBefore(clock.instant())) {
      throw AppException.unauthorized(ProblemCode.AUTH_MFA_INVALID, "MFA challenge invalid");
    }
    boolean ok = verifyTotpOrRecovery(challenge.accountId(), req.code());
    if (!ok) {
      throw AppException.unauthorized(ProblemCode.AUTH_MFA_INVALID, "MFA code invalid");
    }
    auditLogService.append(challenge.accountId(), "STAFF", "MFA_VERIFY", "account", challenge.accountId().toString(), Map.of());
    return issueTokens(challenge.accountId(), true);
  }

  @Transactional
  public AuthDtos.MfaEnrollStartResponse startMfaEnroll(UUID accountId, String email) {
    String secret = totpService.generateSecret();
    UUID factorId = UUID.randomUUID();
    byte[] enc = secretBox.encrypt(secret.getBytes(StandardCharsets.UTF_8));
    jdbc.update(
        "INSERT INTO mfa_factor (factor_id, account_id, type, secret_enc) VALUES (?, ?, 'TOTP', ?)",
        factorId, accountId, enc);
    return new AuthDtos.MfaEnrollStartResponse(totpService.otpAuthUri(email, secret), factorId.toString());
  }

  @Transactional
  public AuthDtos.MfaEnrollConfirmResponse confirmMfaEnroll(UUID accountId, AuthDtos.MfaEnrollConfirmRequest req) {
    var row = jdbc.query(
        "SELECT secret_enc FROM mfa_factor WHERE factor_id = ? AND account_id = ? AND confirmed_at IS NULL",
        rs -> rs.next() ? rs.getBytes(1) : null,
        UUID.fromString(req.factorId()), accountId);
    if (row == null) {
      throw AppException.notFound("MFA factor not found");
    }
    String secret = new String(secretBox.decrypt(row), StandardCharsets.UTF_8);
    if (!totpService.verify(secret, req.code())) {
      throw AppException.unauthorized(ProblemCode.AUTH_MFA_INVALID, "MFA code invalid");
    }
    jdbc.update("UPDATE mfa_factor SET confirmed_at = ? WHERE factor_id = ?", clock.instant(), UUID.fromString(req.factorId()));
    jdbc.update("UPDATE account SET mfa_required = TRUE WHERE account_id = ?", accountId);
    List<String> codes = new ArrayList<>();
    for (int i = 0; i < 10; i++) {
      String code = HexFormat.of().formatHex(randomBytes(5));
      codes.add(code);
      jdbc.update(
          "INSERT INTO mfa_recovery_code (account_id, code_hash) VALUES (?, ?)",
          accountId, sha256(code));
    }
    auditLogService.append(accountId, "STAFF", "MFA_ENROLL", "account", accountId.toString(), Map.of());
    return new AuthDtos.MfaEnrollConfirmResponse(codes);
  }

  @Transactional
  public AuthDtos.TokenResponse refresh(AuthDtos.RefreshRequest req) {
    String hash = sha256(req.refreshToken());
    var session = jdbc.query(
        "SELECT session_id, account_id, student_id, token_family_id, revoked_at, expires_at, mfa_satisfied "
            + "FROM auth_session WHERE refresh_hash = ?",
        rs -> {
          if (!rs.next()) return null;
          return Map.of(
              "sessionId", rs.getObject("session_id"),
              "accountId", rs.getObject("account_id"),
              "studentId", rs.getObject("student_id"),
              "family", rs.getObject("token_family_id"),
              "revoked", rs.getTimestamp("revoked_at") != null,
              "expires", rs.getTimestamp("expires_at").toInstant(),
              "mfa", rs.getBoolean("mfa_satisfied"));
        },
        hash);
    if (session == null) {
      // possible reuse of rotated token — revoke family if we can parse nothing; fail closed
      throw AppException.unauthorized(ProblemCode.AUTH_TOKEN_INVALID, "Invalid refresh token");
    }
    if ((Boolean) session.get("revoked") || ((Instant) session.get("expires")).isBefore(clock.instant())) {
      UUID family = (UUID) session.get("family");
      jdbc.update("UPDATE auth_session SET revoked_at = ? WHERE token_family_id = ? AND revoked_at IS NULL",
          clock.instant(), family);
      throw AppException.unauthorized(ProblemCode.AUTH_TOKEN_INVALID, "Refresh token reused or expired");
    }
    UUID sessionId = (UUID) session.get("sessionId");
    jdbc.update("UPDATE auth_session SET revoked_at = ? WHERE session_id = ?", clock.instant(), sessionId);
    UUID accountId = (UUID) session.get("accountId");
    UUID studentId = (UUID) session.get("studentId");
    if (accountId != null) {
      return issueTokens(accountId, (Boolean) session.get("mfa"), (UUID) session.get("family"));
    }
    return issueStudentTokens(studentId, (UUID) session.get("family"));
  }

  @Transactional
  public void logout(String refreshToken) {
    if (refreshToken == null || refreshToken.isBlank()) {
      return;
    }
    jdbc.update(
        "UPDATE auth_session SET revoked_at = ? WHERE refresh_hash = ? AND revoked_at IS NULL",
        clock.instant(), sha256(refreshToken));
  }

  @Transactional
  public void forgotPassword(AuthDtos.ForgotPasswordRequest req) {
    var accountId = jdbc.query(
        "SELECT account_id FROM account WHERE email = ?",
        rs -> rs.next() ? (UUID) rs.getObject(1) : null,
        req.email().toLowerCase());
    // Always 202 — no enumeration
    if (accountId == null) {
      return;
    }
    String token = HexFormat.of().formatHex(randomBytes(32));
    jdbc.update(
        "INSERT INTO password_reset (account_id, token_hash, expires_at) VALUES (?, ?, ?)",
        accountId, sha256(token), clock.instant().plus(1, ChronoUnit.HOURS));
    sendMail(req.email(), "Reset your Study Loop password", "Reset token: " + token);
  }

  @Transactional
  public void resetPassword(AuthDtos.ResetPasswordRequest req) {
    var row = jdbc.query(
        "SELECT reset_id, account_id, expires_at, used_at FROM password_reset WHERE token_hash = ?",
        rs -> {
          if (!rs.next()) return null;
          return new Object[] {
              (UUID) rs.getObject("reset_id"),
              (UUID) rs.getObject("account_id"),
              rs.getTimestamp("expires_at").toInstant(),
              rs.getTimestamp("used_at")
          };
        },
        sha256(req.token()));
    if (row == null || row[3] != null || ((Instant) row[2]).isBefore(clock.instant())) {
      throw AppException.badRequest(ProblemCode.VALIDATION_FAILED, "Invalid reset token");
    }
    UUID accountId = (UUID) row[1];
    String hash = passwordHasher.hash(req.newPassword().toCharArray());
    jdbc.update("UPDATE account SET password_hash = ? WHERE account_id = ?", hash, accountId);
    jdbc.update("UPDATE password_reset SET used_at = ? WHERE reset_id = ?", clock.instant(), row[0]);
    jdbc.update("UPDATE auth_session SET revoked_at = ? WHERE account_id = ? AND revoked_at IS NULL",
        clock.instant(), accountId);
    auditLogService.append(accountId, null, "PASSWORD_RESET", "account", accountId.toString(), Map.of());
  }

  public AuthDtos.MeResponse me(AccountPrincipal principal) {
    if (principal.accountId() == null && principal.studentId() != null) {
      var student = jdbc.query(
          "SELECT display_name, status FROM student_profile WHERE student_id = ?",
          rs -> rs.next()
              ? Map.of("displayName", rs.getString("display_name"), "status", rs.getString("status"))
              : null,
          principal.studentId());
      if (student == null) {
        throw AppException.notFound("Student not found");
      }
      Map<String, Boolean> flags = loadFeatureFlags();
      return new AuthDtos.MeResponse(
          null,
          null,
          (String) student.get("displayName"),
          "STUDENT",
          (String) student.get("status"),
          principal.roles(),
          List.of(),
          List.of(),
          flags,
          principal.mfaSatisfied());
    }
    var account = jdbc.query(
        "SELECT email, display_name, kind, status FROM account WHERE account_id = ?",
        rs -> {
          if (!rs.next()) return null;
          return Map.of(
              "email", rs.getString("email"),
              "displayName", rs.getString("display_name"),
              "kind", rs.getString("kind"),
              "status", rs.getString("status"));
        },
        principal.accountId());
    if (account == null) {
      throw AppException.notFound("Account not found");
    }
    List<String> roles = jdbc.query(
        "SELECT role FROM account_role WHERE account_id = ?",
        (rs, i) -> rs.getString(1),
        principal.accountId());
    List<Map<String, Object>> children = List.of();
    if (roles.contains("PARENT")) {
      children = jdbc.query(
          """
          SELECT sp.student_id, sp.display_name, sp.year_group, sp.age_band, sp.status
          FROM student_profile sp
          JOIN parent_student_link psl ON psl.student_id = sp.student_id
          WHERE psl.parent_account_id = ?
          ORDER BY sp.created_at
          """,
          (rs, i) -> {
            Map<String, Object> m = new HashMap<>();
            m.put("studentId", rs.getObject("student_id"));
            m.put("displayName", rs.getString("display_name"));
            m.put("yearGroup", rs.getString("year_group"));
            m.put("ageBand", rs.getString("age_band"));
            m.put("status", rs.getString("status"));
            return m;
          },
          principal.accountId());
    }
    return new AuthDtos.MeResponse(
        principal.accountId(),
        (String) account.get("email"),
        (String) account.get("displayName"),
        (String) account.get("kind"),
        (String) account.get("status"),
        roles,
        children,
        List.of(),
        loadFeatureFlags(),
        principal.mfaSatisfied());
  }

  @Transactional
  public AuthDtos.MeResponse patchMe(AccountPrincipal principal, Map<String, Object> body) {
    if (principal.accountId() == null) {
      throw AppException.forbidden("Account required");
    }
    if (body.get("displayName") != null) {
      jdbc.update(
          "UPDATE account SET display_name = ? WHERE account_id = ?",
          body.get("displayName").toString(),
          principal.accountId());
    }
    if (body.get("locale") != null) {
      jdbc.update(
          "UPDATE account SET locale = ? WHERE account_id = ?",
          body.get("locale").toString(),
          principal.accountId());
    }
    if (body.get("marketingOptIn") != null) {
      jdbc.update(
          "UPDATE account SET marketing_opt_in = ? WHERE account_id = ?",
          Boolean.TRUE.equals(body.get("marketingOptIn")) || "true".equalsIgnoreCase(body.get("marketingOptIn").toString()),
          principal.accountId());
    }
    return me(principal);
  }

  @Transactional
  public void changePassword(AccountPrincipal principal, String currentPassword, String newPassword) {
    if (principal.accountId() == null) {
      throw AppException.forbidden("Account required");
    }
    if (currentPassword == null || newPassword == null || newPassword.length() < 10) {
      throw AppException.badRequest(ProblemCode.VALIDATION_FAILED, "Password requirements not met");
    }
    String hash = jdbc.query(
        "SELECT password_hash FROM account WHERE account_id = ?",
        rs -> rs.next() ? rs.getString(1) : null,
        principal.accountId());
    if (hash == null || !passwordHasher.verify(hash, currentPassword.toCharArray())) {
      throw AppException.forbidden("Current password incorrect");
    }
    jdbc.update(
        "UPDATE account SET password_hash = ? WHERE account_id = ?",
        passwordHasher.hash(newPassword.toCharArray()),
        principal.accountId());
    auditLogService.append(
        principal.accountId(), null, "PASSWORD_CHANGE", "account", principal.accountId().toString(), Map.of());
  }

  public List<Map<String, Object>> listSessions(AccountPrincipal principal) {
    if (principal.accountId() != null) {
      return jdbc.query(
          """
          SELECT session_id, user_agent, created_at, last_used_at, expires_at, mfa_satisfied
          FROM auth_session
          WHERE account_id = ? AND revoked_at IS NULL AND expires_at > ?
          ORDER BY last_used_at DESC
          """,
          (rs, i) -> {
            Map<String, Object> m = new HashMap<>();
            m.put("sessionId", rs.getObject("session_id"));
            m.put("userAgent", rs.getString("user_agent"));
            m.put("createdAt", rs.getTimestamp("created_at"));
            m.put("lastUsedAt", rs.getTimestamp("last_used_at"));
            m.put("expiresAt", rs.getTimestamp("expires_at"));
            m.put("mfaSatisfied", rs.getBoolean("mfa_satisfied"));
            return m;
          },
          principal.accountId(),
          clock.instant());
    }
    return jdbc.query(
        """
        SELECT session_id, user_agent, created_at, last_used_at, expires_at, mfa_satisfied
        FROM auth_session
        WHERE student_id = ? AND revoked_at IS NULL AND expires_at > ?
        ORDER BY last_used_at DESC
        """,
        (rs, i) -> {
          Map<String, Object> m = new HashMap<>();
          m.put("sessionId", rs.getObject("session_id"));
          m.put("userAgent", rs.getString("user_agent"));
          m.put("createdAt", rs.getTimestamp("created_at"));
          m.put("lastUsedAt", rs.getTimestamp("last_used_at"));
          m.put("expiresAt", rs.getTimestamp("expires_at"));
          m.put("mfaSatisfied", rs.getBoolean("mfa_satisfied"));
          return m;
        },
        principal.studentId(),
        clock.instant());
  }

  @Transactional
  public void revokeSession(AccountPrincipal principal, UUID sessionId) {
    int updated;
    if (principal.accountId() != null) {
      updated = jdbc.update(
          "UPDATE auth_session SET revoked_at = ? WHERE session_id = ? AND account_id = ? AND revoked_at IS NULL",
          clock.instant(),
          sessionId,
          principal.accountId());
    } else {
      updated = jdbc.update(
          "UPDATE auth_session SET revoked_at = ? WHERE session_id = ? AND student_id = ? AND revoked_at IS NULL",
          clock.instant(),
          sessionId,
          principal.studentId());
    }
    if (updated == 0) {
      throw AppException.notFound("Session not found");
    }
  }

  @Transactional
  public AuthDtos.MfaEnrollConfirmResponse regenerateRecoveryCodes(UUID accountId) {
    jdbc.update("DELETE FROM mfa_recovery_code WHERE account_id = ? AND used_at IS NULL", accountId);
    List<String> codes = new ArrayList<>();
    for (int i = 0; i < 10; i++) {
      String code = HexFormat.of().formatHex(randomBytes(5));
      codes.add(code);
      jdbc.update(
          "INSERT INTO mfa_recovery_code (account_id, code_hash) VALUES (?, ?)",
          accountId, sha256(code));
    }
    auditLogService.append(accountId, "STAFF", "MFA_RECOVERY_REGEN", "account", accountId.toString(), Map.of());
    return new AuthDtos.MfaEnrollConfirmResponse(codes);
  }

  public void deferredOidc() {
    throw AppException.featureDisabled("OIDC deferred to W1 configuration");
  }

  @Transactional
  public AuthDtos.TokenResponse loginPicturePin(AuthDtos.PicturePinLoginRequest req) {
    var cred = jdbc.query(
        """
        SELECT sc.credential_id, sc.student_id, sc.secret_hash, sc.failed_attempts, sc.locked_until, sp.status
        FROM student_credential sc
        JOIN student_profile sp ON sp.student_id = sc.student_id
        WHERE sc.login_handle = ? AND sc.kind = 'PICTURE_PIN'
        """,
        rs -> {
          if (!rs.next()) {
            return null;
          }
          return Map.of(
              "credentialId", rs.getObject("credential_id"),
              "studentId", rs.getObject("student_id"),
              "secretHash", rs.getString("secret_hash"),
              "failed", rs.getShort("failed_attempts"),
              "lockedUntil", rs.getTimestamp("locked_until"),
              "status", rs.getString("status"));
        },
        req.loginHandle().toLowerCase());
    if (cred == null) {
      throw AppException.unauthorized(ProblemCode.AUTH_INVALID_CREDENTIALS, "Invalid credentials");
    }
    UUID studentId = (UUID) cred.get("studentId");
    if (!"ACTIVE".equals(cred.get("status"))) {
      throw AppException.unauthorized(ProblemCode.AUTH_ACCOUNT_LOCKED, "Account not active");
    }
    var lockedUntil = (java.sql.Timestamp) cred.get("lockedUntil");
    if (lockedUntil != null && lockedUntil.toInstant().isAfter(clock.instant())) {
      throw AppException.unauthorized(ProblemCode.AUTH_ACCOUNT_LOCKED, "Picture PIN locked");
    }
    String joined = String.join("|", req.pictureSequence());
    String hash = (String) cred.get("secretHash");
    if (!passwordHasher.verify(hash, joined.toCharArray())) {
      short failed = (Short) cred.get("failed");
      short next = (short) (failed + 1);
      jdbc.update(
          """
          UPDATE student_credential SET failed_attempts = ?,
            locked_until = CASE WHEN ? >= 5 THEN ? ELSE locked_until END
          WHERE credential_id = ?
          """,
          next,
          next,
          clock.instant().plus(15, ChronoUnit.MINUTES),
          cred.get("credentialId"));
      if (next >= 5) {
        notifyParentLockout(studentId);
      }
      throw AppException.unauthorized(ProblemCode.AUTH_INVALID_CREDENTIALS, "Invalid credentials");
    }
    jdbc.update(
        "UPDATE student_credential SET failed_attempts = 0, locked_until = NULL WHERE credential_id = ?",
        cred.get("credentialId"));
    return issueStudentTokens(studentId);
  }

  private AuthDtos.TokenResponse issueStudentTokens(UUID studentId) {
    return issueStudentTokens(studentId, UUID.randomUUID());
  }

  private AuthDtos.TokenResponse issueStudentTokens(UUID studentId, UUID familyId) {
    UUID sessionId = UUID.randomUUID();
    String refresh = HexFormat.of().formatHex(randomBytes(32));
    Instant expires = clock.instant().plus(30, ChronoUnit.DAYS);
    jdbc.update(
        """
        INSERT INTO auth_session (session_id, student_id, token_family_id, refresh_hash, mfa_satisfied, expires_at)
        VALUES (?, ?, ?, ?, FALSE, ?)
        """,
        sessionId,
        studentId,
        familyId,
        sha256(refresh),
        expires);
    AccountPrincipal principal = new AccountPrincipal(null, studentId, List.of("STU"), false, sessionId);
    String access = jwtService.createAccessToken(principal);
    auditLogService.append(null, "STU", "LOGIN", "student", studentId.toString(), Map.of());
    return AuthDtos.TokenResponse.tokens(access, refresh, 15 * 60);
  }

  private void notifyParentLockout(UUID studentId) {
    jdbc.query(
        """
        SELECT psl.parent_account_id FROM parent_student_link psl WHERE psl.student_id = ? AND psl.is_primary = TRUE LIMIT 1
        """,
        rs -> {
          if (rs.next()) {
            UUID parentId = (UUID) rs.getObject(1);
            jdbc.update(
                """
                INSERT INTO notification (notification_id, recipient_account_id, kind, title, body, data_json)
                VALUES (?, ?, 'SECURITY', 'Picture PIN locked', 'Too many failed picture PIN attempts.', '{}'::jsonb)
                """,
                UUID.randomUUID(),
                parentId);
          }
          return null;
        },
        studentId);
  }

  private Map<String, Boolean> loadFeatureFlags() {
    Map<String, Boolean> flags = new HashMap<>();
    jdbc.query("SELECT flag_key, enabled FROM feature_flag", rs -> {
      while (rs.next()) {
        flags.put(rs.getString(1), rs.getBoolean(2));
      }
    });
    return flags;
  }

  private AuthDtos.TokenResponse issueTokens(UUID accountId, boolean mfaSatisfied) {
    return issueTokens(accountId, mfaSatisfied, UUID.randomUUID());
  }

  private AuthDtos.TokenResponse issueTokens(UUID accountId, boolean mfaSatisfied, UUID familyId) {
    List<String> roles = jdbc.query(
        "SELECT role FROM account_role WHERE account_id = ?",
        (rs, i) -> rs.getString(1),
        accountId);
    UUID sessionId = UUID.randomUUID();
    String refresh = HexFormat.of().formatHex(randomBytes(32));
    Instant expires = clock.instant().plus(30, ChronoUnit.DAYS);
    jdbc.update(
        "INSERT INTO auth_session (session_id, account_id, token_family_id, refresh_hash, mfa_satisfied, expires_at) "
            + "VALUES (?, ?, ?, ?, ?, ?)",
        sessionId, accountId, familyId, sha256(refresh), mfaSatisfied, expires);
    AccountPrincipal principal = new AccountPrincipal(accountId, null, roles, mfaSatisfied, sessionId);
    String access = jwtService.createAccessToken(principal);
    auditLogService.append(accountId, roles.isEmpty() ? null : roles.get(0), "LOGIN", "account", accountId.toString(), Map.of());
    return AuthDtos.TokenResponse.tokens(access, refresh, 15 * 60);
  }

  private boolean verifyTotpOrRecovery(UUID accountId, String code) {
    var secrets = jdbc.query(
        "SELECT secret_enc FROM mfa_factor WHERE account_id = ? AND confirmed_at IS NOT NULL",
        (rs, i) -> rs.getBytes(1),
        accountId);
    for (byte[] enc : secrets) {
      String secret = new String(secretBox.decrypt(enc), StandardCharsets.UTF_8);
      if (totpService.verify(secret, code)) {
        return true;
      }
    }
    Integer updated = jdbc.update(
        "UPDATE mfa_recovery_code SET used_at = ? WHERE account_id = ? AND code_hash = ? AND used_at IS NULL",
        clock.instant(), accountId, sha256(code));
    return updated != null && updated > 0;
  }

  private void sendMail(String to, String subject, String body) {
    try {
      SimpleMailMessage msg = new SimpleMailMessage();
      msg.setTo(to);
      msg.setSubject(subject);
      msg.setText(body);
      msg.setFrom("noreply@studyloop.local");
      mailSender.send(msg);
    } catch (Exception e) {
      // local/dev: mailpit may be down; do not fail the flow for W0 skeleton
    }
  }

  private byte[] randomBytes(int n) {
    byte[] b = new byte[n];
    random.nextBytes(b);
    return b;
  }

  private static String sha256(String input) {
    try {
      MessageDigest md = MessageDigest.getInstance("SHA-256");
      return HexFormat.of().formatHex(md.digest(input.getBytes(StandardCharsets.UTF_8)));
    } catch (Exception e) {
      throw new IllegalStateException(e);
    }
  }

  /** B-03 standalone student (13+) signup with age gate. */
  @Transactional
  public Map<String, Object> registerStandaloneStudent(Map<String, Object> body) {
    int ageYears = body.get("ageYears") instanceof Number n
        ? n.intValue()
        : Integer.parseInt(body.getOrDefault("ageYears", "0").toString());
    if (ageYears < 13) {
      throw AppException.badRequest(
          ProblemCode.VALIDATION_FAILED,
          "Under-13 learners must be registered by a parent. Use parent signup instead.");
    }
    if (ageYears < 16 && !Boolean.TRUE.equals(body.get("parentAware"))) {
      throw AppException.badRequest(
          ProblemCode.VALIDATION_FAILED,
          "Ages 13–15 need a parent-aware confirmation before standalone signup.");
    }
    if (!Boolean.TRUE.equals(body.get("acceptTerms"))) {
      throw AppException.badRequest(ProblemCode.VALIDATION_FAILED, "Terms must be accepted");
    }
    String email = body.getOrDefault("email", "").toString().toLowerCase().trim();
    String password = body.getOrDefault("password", "").toString();
    String displayName = body.getOrDefault("displayName", "Student").toString();
    if (email.isBlank() || password.length() < 10) {
      throw AppException.badRequest(ProblemCode.VALIDATION_FAILED, "Valid email and password required");
    }
    Integer exists = jdbc.queryForObject(
        "SELECT COUNT(*) FROM account WHERE email = ?", Integer.class, email);
    if (exists != null && exists > 0) {
      throw AppException.conflict(ProblemCode.CONFLICT, "Unable to register with that email");
    }
    UUID accountId = UUID.randomUUID();
    UUID studentId = UUID.randomUUID();
    String hash = passwordHasher.hash(password.toCharArray());
    jdbc.update(
        """
        INSERT INTO account (account_id, email, password_hash, display_name, kind, status, mfa_required, email_verified_at)
        VALUES (?, ?, ?, ?, 'STUDENT', 'ACTIVE', FALSE, now())
        """,
        accountId,
        email,
        hash,
        displayName);
    jdbc.update("INSERT INTO account_role (account_id, role) VALUES (?, 'STUDENT')", accountId);
    jdbc.update(
        """
        INSERT INTO student_profile (student_id, display_name, year_group, login_account_id, age_band)
        VALUES (?, ?, ?, ?, ?)
        """,
        studentId,
        displayName,
        body.get("yearGroup") == null ? null : body.get("yearGroup").toString(),
        accountId,
        ageYears >= 18 ? "18_PLUS" : ageYears >= 16 ? "16_17" : "13_15");
    jdbc.update("INSERT INTO privacy_settings (student_id) VALUES (?) ON CONFLICT DO NOTHING", studentId);
    jdbc.update(
        """
        INSERT INTO age_assurance_record (record_id, account_id, method, outcome, completed_at)
        VALUES (?, ?, 'SELF_DECLARED_AGE', 'PASS', now())
        """,
        UUID.randomUUID(),
        accountId);
    jdbc.update(
        """
        INSERT INTO consent_record (account_id, consent_type, document_version, granted, method)
        VALUES (?, 'TERMS', 'v1', TRUE, 'CHECKBOX')
        """,
        accountId);
    auditLogService.append(
        accountId, "STUDENT", "STUDENT_STANDALONE_REGISTER", "account", accountId.toString(), Map.of("ageYears", ageYears));
    return Map.of(
        "accountId", accountId,
        "studentId", studentId,
        "status", "ACTIVE",
        "ageGate", ageYears >= 16 ? "16_PLUS" : "13_TO_15");
  }
}
