package com.karsaaz.studyloop.support.api;

import com.karsaaz.studyloop.identity.api.CatalogueRoles;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.support.application.SupportService;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class SupportController {
  private final SupportService support;

  public SupportController(SupportService support) {
    this.support = support;
  }

  @GetMapping("/internal/support/accounts")
  @CatalogueRoles(id = "SUP-01", roles = "SUP")
  public Map<String, Object> search(
      @AuthenticationPrincipal AccountPrincipal p, @RequestParam(required = false) String q) {
    return support.searchAccounts(p, q);
  }

  @GetMapping("/internal/support/accounts/{accountId}")
  @CatalogueRoles(id = "SUP-02", roles = "SUP")
  public Map<String, Object> detail(@AuthenticationPrincipal AccountPrincipal p, @PathVariable UUID accountId) {
    return support.accountDetail(p, accountId);
  }

  @PostMapping("/internal/support/accounts/{accountId}/password-reset")
  @CatalogueRoles(id = "SUP-03", roles = "SUP")
  public Map<String, Object> reset(@AuthenticationPrincipal AccountPrincipal p, @PathVariable UUID accountId) {
    return support.passwordReset(p, accountId);
  }

  @PostMapping("/internal/support/accounts/{accountId}/refund")
  @CatalogueRoles(id = "SUP-04", roles = "SUP")
  public Map<String, Object> refund(
      @AuthenticationPrincipal AccountPrincipal p, @PathVariable UUID accountId, @RequestBody Map<String, Object> body) {
    return support.refund(p, accountId, body);
  }

  @PostMapping("/internal/support/accounts/{accountId}/notes")
  @CatalogueRoles(id = "SUP-05", roles = "SUP")
  public Map<String, Object> notes(
      @AuthenticationPrincipal AccountPrincipal p, @PathVariable UUID accountId, @RequestBody Map<String, Object> body) {
    return support.addNote(p, accountId, body);
  }

  @PostMapping("/internal/support/accounts/{accountId}/extend-trial")
  @CatalogueRoles(id = "SUP-06", roles = "SUP")
  public Map<String, Object> extend(
      @AuthenticationPrincipal AccountPrincipal p, @PathVariable UUID accountId, @RequestBody(required = false) Map<String, Object> body) {
    return support.extendTrial(p, accountId, body == null ? Map.of() : body);
  }

  @PostMapping("/internal/support/students/{studentId}/unlock-pin")
  @CatalogueRoles(id = "SUP-07", roles = "SUP")
  public Map<String, Object> unlock(@AuthenticationPrincipal AccountPrincipal p, @PathVariable UUID studentId) {
    return support.unlockPin(p, studentId);
  }

  @GetMapping("/internal/audit-log")
  @CatalogueRoles(id = "AUD-01", roles = "CMP")
  public Map<String, Object> audit(@AuthenticationPrincipal AccountPrincipal p) {
    return support.auditLog(p);
  }

  @GetMapping("/internal/audit-log/export")
  @CatalogueRoles(id = "AUD-02", roles = "CMP")
  public Map<String, Object> export(@AuthenticationPrincipal AccountPrincipal p) {
    return support.auditExport(p);
  }

  @GetMapping("/internal/audit-log/verify-chain")
  @CatalogueRoles(id = "AUD-03", roles = "CMP")
  public Map<String, Object> verify(@AuthenticationPrincipal AccountPrincipal p) {
    return support.verifyChain(p);
  }

  @GetMapping("/internal/vetting")
  @CatalogueRoles(id = "PLT-05", roles = "CMP")
  public Map<String, Object> vetting(@AuthenticationPrincipal AccountPrincipal p) {
    return support.listVetting(p);
  }

  @PostMapping("/webhooks/ucheck")
  @CatalogueRoles(id = "PLT-06", roles = "SYS")
  public Map<String, Object> ucheck(@RequestBody Map<String, Object> body) {
    return support.ucheckWebhook(body);
  }
}
