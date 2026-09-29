package com.karsaaz.studyloop.reporting.api;

import com.karsaaz.studyloop.identity.api.CatalogueRoles;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.reporting.application.ReportingService;
import java.util.Map;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class ReportingController {
  private final ReportingService reportingService;

  public ReportingController(ReportingService reportingService) {
    this.reportingService = reportingService;
  }

  @GetMapping("/notification-preferences")
  @CatalogueRoles(id = "RPT-10", roles = "PAR")
  public Map<String, Object> getPrefs(@AuthenticationPrincipal AccountPrincipal principal) {
    return Map.of("items", reportingService.getNotificationPreferences(principal));
  }

  @PutMapping("/notification-preferences")
  @CatalogueRoles(id = "RPT-11", roles = "PAR")
  public Map<String, Object> putPrefs(
      @AuthenticationPrincipal AccountPrincipal principal, @RequestBody Map<String, Object> body) {
    return Map.of("items", reportingService.putNotificationPreferences(principal, body));
  }
}
