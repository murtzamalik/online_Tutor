package com.karsaaz.studyloop.consent.api;

import com.karsaaz.studyloop.consent.application.ConsentService;
import com.karsaaz.studyloop.identity.api.CatalogueRoles;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class ConsentController {
  private final ConsentService consentService;

  public ConsentController(ConsentService consentService) {
    this.consentService = consentService;
  }

  @PostMapping("/age-assurance/start")
  @CatalogueRoles(id = "AGE-01", roles = "PAR")
  public Map<String, Object> startAge(@AuthenticationPrincipal AccountPrincipal principal) {
    return consentService.startAgeAssurance(principal);
  }

  @PostMapping("/age-assurance/{recordId}/complete")
  @CatalogueRoles(id = "AGE-02", roles = "PAR")
  public void completeAge(
      @AuthenticationPrincipal AccountPrincipal principal,
      @PathVariable UUID recordId,
      @RequestBody Map<String, Boolean> body) {
    consentService.completeAgeAssurance(principal, recordId, Boolean.TRUE.equals(body.get("pass")));
  }

  @GetMapping("/age-assurance/status")
  @CatalogueRoles(id = "AGE-03", roles = "PAR")
  public Map<String, Object> ageStatus(@AuthenticationPrincipal AccountPrincipal principal) {
    return consentService.ageAssuranceStatus(principal);
  }

  @PostMapping("/students/{studentId}/consents/under13")
  @CatalogueRoles(id = "CON-02", roles = "PAR")
  public void under13(
      @AuthenticationPrincipal AccountPrincipal principal,
      @PathVariable UUID studentId,
      @RequestBody(required = false) Map<String, String> body) {
    String version = body == null ? null : body.get("documentVersion");
    consentService.under13Consent(principal, studentId, version);
  }

  @GetMapping("/legal/{slug}")
  @CatalogueRoles(id = "CON-05", roles = "PUB")
  public Map<String, Object> legal(@PathVariable String slug) {
    return consentService.legalDocument(slug);
  }

  @PostMapping("/cookie-consent")
  @CatalogueRoles(id = "CON-06", roles = "PUB")
  public Map<String, Object> cookies(@RequestBody Map<String, Object> body) {
    UUID visitorId = body.get("visitorId") != null ? UUID.fromString(body.get("visitorId").toString()) : null;
    @SuppressWarnings("unchecked")
    Map<String, Boolean> categories = (Map<String, Boolean>) body.get("categories");
    String policyVersion = body.get("policyVersion") != null ? body.get("policyVersion").toString() : null;
    return consentService.cookieConsent(visitorId, categories, policyVersion);
  }
}
