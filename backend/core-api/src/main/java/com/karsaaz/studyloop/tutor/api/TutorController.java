package com.karsaaz.studyloop.tutor.api;

import com.karsaaz.studyloop.identity.api.CatalogueRoles;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.tutor.application.TutorService;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class TutorController {
  private final TutorService tutor;

  public TutorController(TutorService tutor) {
    this.tutor = tutor;
  }

  @PostMapping("/tutor/sessions")
  @ResponseStatus(HttpStatus.CREATED)
  @CatalogueRoles(id = "TUT-01", roles = "STU")
  public Map<String, Object> start(
      @AuthenticationPrincipal AccountPrincipal principal, @RequestBody(required = false) Map<String, Object> body) {
    return tutor.startSession(principal, body == null ? Map.of() : body);
  }

  @PostMapping("/tutor/sessions/{tutorSessionId}/messages")
  @CatalogueRoles(id = "TUT-02", roles = "STU")
  public Map<String, Object> message(
      @AuthenticationPrincipal AccountPrincipal principal,
      @PathVariable UUID tutorSessionId,
      @RequestBody Map<String, Object> body) {
    return tutor.postMessage(principal, tutorSessionId, body);
  }

  @GetMapping("/tutor/sessions/{tutorSessionId}")
  @CatalogueRoles(id = "TUT-03", roles = "STU,PAR")
  public Map<String, Object> get(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID tutorSessionId) {
    return tutor.getSession(principal, tutorSessionId);
  }

  @PostMapping("/tutor/sessions/{tutorSessionId}/end")
  @CatalogueRoles(id = "TUT-04", roles = "STU")
  public Map<String, Object> end(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID tutorSessionId) {
    return tutor.endSession(principal, tutorSessionId);
  }

  @PostMapping("/tutor/reexplain")
  @CatalogueRoles(id = "TUT-05", roles = "STU")
  public Map<String, Object> reexplain(
      @AuthenticationPrincipal AccountPrincipal principal, @RequestBody Map<String, Object> body) {
    return tutor.reexplain(principal, body);
  }

  @PostMapping("/tutor/sessions/{tutorSessionId}/explain-back")
  @CatalogueRoles(id = "TUT-07", roles = "STU")
  public Map<String, Object> explainBack(
      @AuthenticationPrincipal AccountPrincipal principal,
      @PathVariable UUID tutorSessionId,
      @RequestBody Map<String, Object> body) {
    return tutor.explainBack(principal, tutorSessionId, body);
  }

  @PostMapping("/tutor/rescue")
  @CatalogueRoles(id = "TUT-08", roles = "SYS")
  public Map<String, Object> rescue(@RequestBody Map<String, Object> body) {
    return tutor.rescue(body);
  }
}
