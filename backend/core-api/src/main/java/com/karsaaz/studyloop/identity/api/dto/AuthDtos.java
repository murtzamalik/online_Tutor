package com.karsaaz.studyloop.identity.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class AuthDtos {
  private AuthDtos() {}

  public record RegisterParentRequest(
      @Email @NotBlank String email,
      @NotBlank @Size(min = 10, max = 128) String password,
      @NotBlank @Size(min = 1, max = 80) String displayName,
      boolean acceptTerms
  ) {}

  public record RegisterParentResponse(UUID accountId, String status) {}

  public record VerifyEmailRequest(@Email @NotBlank String email, @NotBlank String code) {}

  public record LoginRequest(@Email @NotBlank String email, @NotBlank String password) {}

  public record TokenResponse(
      String accessToken,
      String refreshToken,
      String tokenType,
      long expiresInSeconds,
      boolean mfaRequired,
      String mfaChallengeToken
  ) {
    public static TokenResponse tokens(String access, String refresh, long expires) {
      return new TokenResponse(access, refresh, "Bearer", expires, false, null);
    }

    public static TokenResponse mfaChallenge(String challenge) {
      return new TokenResponse(null, null, "Bearer", 0, true, challenge);
    }
  }

  public record RefreshRequest(@NotBlank String refreshToken) {}

  public record LogoutRequest(String refreshToken) {}

  public record ForgotPasswordRequest(@Email @NotBlank String email) {}

  public record ResetPasswordRequest(@NotBlank String token, @NotBlank @Size(min = 10, max = 128) String newPassword) {}

  public record MfaVerifyRequest(@NotBlank String mfaChallengeToken, @NotBlank String code) {}

  public record MfaEnrollStartResponse(String otpauthUri, String factorId) {}

  public record MfaEnrollConfirmRequest(@NotBlank String factorId, @NotBlank String code) {}

  public record MfaEnrollConfirmResponse(List<String> recoveryCodes) {}

  public record PicturePinLoginRequest(
      @NotBlank String loginHandle,
      @NotEmpty @Size(min = 3, max = 12) List<String> pictureSequence
  ) {}

  public record MeResponse(
      UUID accountId,
      String email,
      String displayName,
      String kind,
      String status,
      List<String> roles,
      List<Map<String, Object>> children,
      List<Map<String, Object>> entitlements,
      Map<String, Boolean> featureFlags,
      boolean mfaSatisfied
  ) {}
}
