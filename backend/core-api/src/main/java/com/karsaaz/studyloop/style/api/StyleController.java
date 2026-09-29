package com.karsaaz.studyloop.style.api;

import com.karsaaz.studyloop.identity.api.CatalogueRoles;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.style.application.StyleService;
import java.util.Map;
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
public class StyleController {
  private final StyleService styleService;

  public StyleController(StyleService styleService) {
    this.styleService = styleService;
  }

  @GetMapping("/internal/style-profiles")
  @CatalogueRoles(id = "STY-01", roles = "CNT")
  public Map<String, Object> list(@AuthenticationPrincipal AccountPrincipal principal) {
    return Map.of("items", styleService.list(principal));
  }

  @GetMapping("/internal/style-profiles/{specificationId}")
  @CatalogueRoles(id = "STY-02", roles = "CNT")
  public Map<String, Object> get(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable long specificationId) {
    return styleService.get(principal, specificationId);
  }

  @PutMapping("/internal/style-profiles/{specificationId}")
  @CatalogueRoles(id = "STY-03", roles = "CNT")
  public Map<String, Object> put(
      @AuthenticationPrincipal AccountPrincipal principal,
      @PathVariable long specificationId,
      @RequestBody Map<String, Object> body) {
    return styleService.put(principal, specificationId, body);
  }

  @PostMapping("/internal/style-profiles/{specificationId}/derive")
  @CatalogueRoles(id = "STY-04", roles = "CNT")
  public Map<String, Object> derive(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable long specificationId) {
    return styleService.derive(principal, specificationId);
  }
}
