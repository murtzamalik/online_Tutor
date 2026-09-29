package com.karsaaz.studyloop.tutor.api;

import com.karsaaz.studyloop.identity.api.CatalogueRoles;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.tutor.application.VoiceService;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class VoiceController {
  private final VoiceService voice;

  public VoiceController(VoiceService voice) {
    this.voice = voice;
  }

  @PostMapping("/voice/sessions")
  @ResponseStatus(HttpStatus.CREATED)
  @CatalogueRoles(id = "VOX-01", roles = "STU")
  public Map<String, Object> start(
      @AuthenticationPrincipal AccountPrincipal principal, @RequestBody(required = false) Map<String, Object> body) {
    return voice.start(principal, body == null ? Map.of() : body);
  }

  @PostMapping("/voice/sessions/{voiceSessionId}/end")
  @CatalogueRoles(id = "VOX-03", roles = "STU")
  public Map<String, Object> end(
      @AuthenticationPrincipal AccountPrincipal principal,
      @PathVariable UUID voiceSessionId,
      @RequestBody(required = false) Map<String, Object> body) {
    return voice.end(principal, voiceSessionId, body == null ? Map.of() : body);
  }

  @PostMapping("/voice/connectivity-check")
  @CatalogueRoles(id = "VOX-04", roles = "STU,PAR")
  public Map<String, Object> connectivity(@AuthenticationPrincipal AccountPrincipal principal) {
    return voice.connectivityCheck(principal);
  }

  @PostMapping("/voice/sessions/{voiceSessionId}/fallback-to-text")
  @CatalogueRoles(id = "VOX-05", roles = "STU")
  public Map<String, Object> fallback(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID voiceSessionId) {
    return voice.fallbackToText(principal, voiceSessionId);
  }
}
