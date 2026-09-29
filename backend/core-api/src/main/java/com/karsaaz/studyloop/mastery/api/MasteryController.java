package com.karsaaz.studyloop.mastery.api;

import com.karsaaz.studyloop.identity.api.CatalogueRoles;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.mastery.application.MasteryService;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class MasteryController {
  private final MasteryService masteryService;

  public MasteryController(MasteryService masteryService) {
    this.masteryService = masteryService;
  }

  @GetMapping("/students/{studentId}/mastery")
  @CatalogueRoles(id = "MAS-01", roles = "PAR,STU,TCH")
  public Map<String, Object> tree(
      @AuthenticationPrincipal AccountPrincipal principal,
      @PathVariable UUID studentId,
      @RequestParam(required = false) Long enrolmentId) {
    return masteryService.masteryTree(principal, studentId, enrolmentId);
  }

  @GetMapping("/students/{studentId}/predicted-grades")
  @CatalogueRoles(id = "MAS-02", roles = "PAR,STU")
  public Map<String, Object> predicted(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID studentId) {
    return masteryService.predictedGrades(principal, studentId);
  }

  @GetMapping("/students/{studentId}/review-due")
  @CatalogueRoles(id = "MAS-07", roles = "STU")
  public List<Map<String, Object>> reviewDue(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID studentId) {
    return masteryService.reviewDue(principal, studentId);
  }
}
