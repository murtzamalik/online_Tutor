package com.karsaaz.studyloop.reporting.api;

import com.karsaaz.studyloop.identity.api.CatalogueRoles;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.reporting.application.ReportingService;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
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

  @GetMapping("/parents/home")
  @CatalogueRoles(id = "RPT-01", roles = "PAR")
  public Map<String, Object> parentHome(@AuthenticationPrincipal AccountPrincipal principal) {
    return reportingService.parentHome(principal);
  }

  @GetMapping("/students/{studentId}/reports/weekly")
  @CatalogueRoles(id = "RPT-02", roles = "PAR,STU")
  public Map<String, Object> weeklyList(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID studentId) {
    return reportingService.weeklyList(principal, studentId);
  }

  @GetMapping("/students/{studentId}/reports/weekly/{reportId}")
  @CatalogueRoles(id = "RPT-03", roles = "PAR,STU")
  public Map<String, Object> weeklyOne(
      @AuthenticationPrincipal AccountPrincipal principal,
      @PathVariable UUID studentId,
      @PathVariable UUID reportId) {
    return reportingService.weeklyOne(principal, studentId, reportId);
  }

  @GetMapping("/students/{studentId}/action-plan")
  @CatalogueRoles(id = "RPT-04", roles = "PAR")
  public Map<String, Object> actionPlan(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID studentId) {
    return reportingService.actionPlan(principal, studentId);
  }

  @GetMapping("/students/{studentId}/alerts")
  @CatalogueRoles(id = "RPT-05", roles = "PAR")
  public Map<String, Object> alerts(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID studentId) {
    return reportingService.alerts(principal, studentId);
  }

  @PostMapping("/alerts/{alertId}/ack")
  @CatalogueRoles(id = "RPT-06", roles = "PAR")
  public Map<String, Object> ack(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID alertId) {
    return reportingService.ackAlert(principal, alertId);
  }

  @GetMapping("/notifications")
  @CatalogueRoles(id = "RPT-07", roles = "PAR,STU")
  public Map<String, Object> notifications(@AuthenticationPrincipal AccountPrincipal principal) {
    return reportingService.notifications(principal);
  }

  @PostMapping("/notifications/{notificationId}/read")
  @CatalogueRoles(id = "RPT-08", roles = "PAR,STU")
  public Map<String, Object> markRead(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID notificationId) {
    return reportingService.markRead(principal, notificationId);
  }

  @PostMapping("/notifications/read-all")
  @CatalogueRoles(id = "RPT-09", roles = "PAR,STU")
  public Map<String, Object> markAll(@AuthenticationPrincipal AccountPrincipal principal) {
    return reportingService.markAllRead(principal);
  }

  @PostMapping("/devices")
  @CatalogueRoles(id = "RPT-12", roles = "PAR,STU")
  public Map<String, Object> devices(
      @AuthenticationPrincipal AccountPrincipal principal, @RequestBody Map<String, Object> body) {
    return reportingService.registerDevice(principal, body);
  }

  @PostMapping("/jobs/weekly-reports/run")
  @CatalogueRoles(id = "RPT-13", roles = "SYS")
  public Map<String, Object> weeklyJob(@AuthenticationPrincipal AccountPrincipal principal) {
    return reportingService.runWeeklyReports(principal);
  }

  @GetMapping("/students/{studentId}/ai-transcripts")
  @CatalogueRoles(id = "TRN-01", roles = "PAR")
  public Map<String, Object> transcripts(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID studentId) {
    return reportingService.aiTranscripts(principal, studentId);
  }

  @GetMapping("/students/{studentId}/ai-transcripts/{tutorSessionId}")
  @CatalogueRoles(id = "TRN-02", roles = "PAR")
  public Map<String, Object> transcript(
      @AuthenticationPrincipal AccountPrincipal principal,
      @PathVariable UUID studentId,
      @PathVariable UUID tutorSessionId) {
    return reportingService.aiTranscript(principal, studentId, tutorSessionId);
  }
}
