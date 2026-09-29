package com.karsaaz.studyloop.engagement.api;

import com.karsaaz.studyloop.engagement.application.EngagementService;
import com.karsaaz.studyloop.identity.api.CatalogueRoles;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class EngagementController {
  private final EngagementService engagement;

  public EngagementController(EngagementService engagement) {
    this.engagement = engagement;
  }

  @PostMapping("/engagement/events")
  @CatalogueRoles(id = "ENG-01", roles = "STU")
  public Map<String, Object> events(
      @AuthenticationPrincipal AccountPrincipal principal, @RequestBody Map<String, Object> body) {
    return engagement.ingestEvents(principal, body);
  }

  @PostMapping("/engagement/nudges/{nudgeId}/respond")
  @CatalogueRoles(id = "ENG-02", roles = "STU")
  public Map<String, Object> respond(
      @AuthenticationPrincipal AccountPrincipal principal,
      @PathVariable UUID nudgeId,
      @RequestBody Map<String, Object> body) {
    return engagement.respondNudge(principal, nudgeId, body);
  }
}
