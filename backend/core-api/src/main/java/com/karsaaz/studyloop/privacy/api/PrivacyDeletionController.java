package com.karsaaz.studyloop.privacy.api;

import com.karsaaz.studyloop.identity.api.CatalogueRoles;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.privacy.application.PrivacyDeletionService;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class PrivacyDeletionController {
  private final PrivacyDeletionService privacy;

  public PrivacyDeletionController(PrivacyDeletionService privacy) {
    this.privacy = privacy;
  }

  @PostMapping("/students/{studentId}/deletion-request")
  @ResponseStatus(HttpStatus.CREATED)
  @CatalogueRoles(id = "PRV-03", roles = "PAR")
  public Map<String, Object> requestDeletion(
      @AuthenticationPrincipal AccountPrincipal principal,
      @PathVariable UUID studentId,
      @RequestBody(required = false) Map<String, Object> body) {
    return privacy.requestDeletion(principal, studentId, body == null ? Map.of() : body);
  }

  @GetMapping("/students/{studentId}/deletion-request")
  @CatalogueRoles(id = "PRV-04", roles = "PAR")
  public Map<String, Object> getDeletion(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID studentId) {
    return privacy.getDeletion(principal, studentId);
  }

  @DeleteMapping("/students/{studentId}/deletion-request")
  @CatalogueRoles(id = "PRV-05", roles = "PAR")
  public Map<String, Object> cancelDeletion(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID studentId) {
    return privacy.cancelDeletion(principal, studentId);
  }

  @PostMapping("/students/{studentId}/data-export")
  @ResponseStatus(HttpStatus.ACCEPTED)
  @CatalogueRoles(id = "PRV-06", roles = "PAR")
  public Map<String, Object> requestExport(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID studentId) {
    return privacy.requestExport(principal, studentId);
  }

  @GetMapping("/students/{studentId}/data-export/{exportId}")
  @CatalogueRoles(id = "PRV-07", roles = "PAR")
  public Map<String, Object> getExport(
      @AuthenticationPrincipal AccountPrincipal principal,
      @PathVariable UUID studentId,
      @PathVariable UUID exportId) {
    return privacy.getExport(principal, studentId, exportId);
  }
}
