package com.karsaaz.studyloop.identity.api;

import com.karsaaz.studyloop.identity.api.dto.AuthDtos;
import com.karsaaz.studyloop.identity.application.AuthService;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class AuthController {
  private final AuthService authService;

  public AuthController(AuthService authService) {
    this.authService = authService;
  }

  @PostMapping("/auth/register-parent")
  @ResponseStatus(HttpStatus.CREATED)
  @CatalogueRoles(id = "AUTH-01", roles = "PUB")
  public AuthDtos.RegisterParentResponse register(@Valid @RequestBody AuthDtos.RegisterParentRequest req) {
    return authService.registerParent(req);
  }

  @PostMapping("/auth/verify-email")
  @CatalogueRoles(id = "AUTH-02", roles = "PUB")
  public void verifyEmail(@Valid @RequestBody AuthDtos.VerifyEmailRequest req) {
    authService.verifyEmail(req);
  }

  @PostMapping("/auth/verify-email/resend")
  @ResponseStatus(HttpStatus.ACCEPTED)
  @CatalogueRoles(id = "AUTH-03", roles = "PUB")
  public void resend(@Valid @RequestBody AuthDtos.ForgotPasswordRequest req) {
    authService.resendVerification(req.email());
  }

  @PostMapping("/auth/login")
  @CatalogueRoles(id = "AUTH-04", roles = "PUB")
  public AuthDtos.TokenResponse login(@Valid @RequestBody AuthDtos.LoginRequest req) {
    return authService.login(req);
  }

  @PostMapping("/auth/mfa/verify")
  @CatalogueRoles(id = "AUTH-05", roles = "PUB")
  public AuthDtos.TokenResponse mfaVerify(@Valid @RequestBody AuthDtos.MfaVerifyRequest req) {
    return authService.verifyMfa(req);
  }

  @PostMapping("/auth/mfa/enroll/start")
  @CatalogueRoles(id = "AUTH-06", roles = "STAFF")
  public AuthDtos.MfaEnrollStartResponse mfaStart(@AuthenticationPrincipal AccountPrincipal principal) {
    AuthDtos.MeResponse me = authService.me(principal);
    return authService.startMfaEnroll(principal.accountId(), me.email());
  }

  @PostMapping("/auth/mfa/enroll/confirm")
  @CatalogueRoles(id = "AUTH-07", roles = "STAFF")
  public AuthDtos.MfaEnrollConfirmResponse mfaConfirm(
      @AuthenticationPrincipal AccountPrincipal principal,
      @Valid @RequestBody AuthDtos.MfaEnrollConfirmRequest req) {
    return authService.confirmMfaEnroll(principal.accountId(), req);
  }

  @PostMapping("/auth/mfa/recovery-codes/regenerate")
  @CatalogueRoles(id = "AUTH-08", roles = "STAFF")
  public AuthDtos.MfaEnrollConfirmResponse regenerate(@AuthenticationPrincipal AccountPrincipal principal) {
    return authService.regenerateRecoveryCodes(principal.accountId());
  }

  @PostMapping("/auth/refresh")
  @CatalogueRoles(id = "AUTH-09", roles = "PUB")
  public AuthDtos.TokenResponse refresh(@Valid @RequestBody AuthDtos.RefreshRequest req) {
    return authService.refresh(req);
  }

  @PostMapping("/auth/logout")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @CatalogueRoles(id = "AUTH-10", roles = "PAR,STU,TCH,SADM,SBM")
  public void logout(@RequestBody(required = false) AuthDtos.LogoutRequest req) {
    authService.logout(req == null ? null : req.refreshToken());
  }

  @PostMapping("/auth/password/forgot")
  @ResponseStatus(HttpStatus.ACCEPTED)
  @CatalogueRoles(id = "AUTH-11", roles = "PUB")
  public void forgot(@Valid @RequestBody AuthDtos.ForgotPasswordRequest req) {
    authService.forgotPassword(req);
  }

  @PostMapping("/auth/password/reset")
  @CatalogueRoles(id = "AUTH-12", roles = "PUB")
  public void reset(@Valid @RequestBody AuthDtos.ResetPasswordRequest req) {
    authService.resetPassword(req);
  }

  @GetMapping("/auth/oidc/{provider}/start")
  @CatalogueRoles(id = "AUTH-13", roles = "PUB")
  public void oidcStart(@PathVariable String provider) {
    authService.deferredOidc();
  }

  @GetMapping("/auth/oidc/{provider}/callback")
  @CatalogueRoles(id = "AUTH-14", roles = "PUB")
  public void oidcCallback(@PathVariable String provider) {
    authService.deferredOidc();
  }

  @PostMapping("/auth/student/picture-pin")
  @CatalogueRoles(id = "AUTH-15", roles = "PUB")
  public void picturePin() {
    authService.deferredPicturePin();
  }

  @PostMapping("/auth/student/register")
  @CatalogueRoles(id = "AUTH-16", roles = "PUB")
  public void studentRegister() {
    throw com.karsaaz.studyloop.common.error.AppException.featureDisabled("Standalone student signup is W3 (B-03)");
  }

  @GetMapping("/me")
  @CatalogueRoles(id = "AUTH-17", roles = "PAR,STU,TCH,SADM,SBM,STAFF")
  public AuthDtos.MeResponse me(@AuthenticationPrincipal AccountPrincipal principal) {
    return authService.me(principal);
  }
}
