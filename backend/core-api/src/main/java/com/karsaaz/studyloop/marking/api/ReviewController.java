package com.karsaaz.studyloop.marking.api;

import com.karsaaz.studyloop.identity.api.CatalogueRoles;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.marking.application.ReviewService;
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
public class ReviewController {
  private final ReviewService reviewService;

  public ReviewController(ReviewService reviewService) {
    this.reviewService = reviewService;
  }

  @GetMapping("/internal/reviews/queue")
  @CatalogueRoles(id = "REV-01", roles = "REV")
  public Map<String, Object> queue(@AuthenticationPrincipal AccountPrincipal principal) {
    return Map.of("items", reviewService.queue(principal));
  }

  @GetMapping("/internal/reviews/{reviewId}")
  @CatalogueRoles(id = "REV-02", roles = "REV")
  public Map<String, Object> detail(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID reviewId) {
    return reviewService.detail(principal, reviewId);
  }

  @PostMapping("/internal/reviews/{reviewId}/claim")
  @CatalogueRoles(id = "REV-03", roles = "REV")
  public Map<String, Object> claim(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID reviewId) {
    return reviewService.claim(principal, reviewId);
  }

  @PostMapping("/internal/reviews/{reviewId}/confirm")
  @CatalogueRoles(id = "REV-04", roles = "REV")
  public Map<String, Object> confirm(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID reviewId) {
    return reviewService.confirm(principal, reviewId);
  }

  @PostMapping("/internal/reviews/{reviewId}/adjust")
  @CatalogueRoles(id = "REV-05", roles = "REV")
  public Map<String, Object> adjust(
      @AuthenticationPrincipal AccountPrincipal principal,
      @PathVariable UUID reviewId,
      @RequestBody Map<String, Object> body) {
    return reviewService.adjust(principal, reviewId, body);
  }

  @PostMapping("/internal/reviews/{reviewId}/release")
  @CatalogueRoles(id = "REV-06", roles = "REV")
  public Map<String, Object> release(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID reviewId) {
    return reviewService.release(principal, reviewId);
  }

  @GetMapping("/internal/reviews/sla")
  @CatalogueRoles(id = "REV-07", roles = "REV,OWN")
  public Map<String, Object> sla(@AuthenticationPrincipal AccountPrincipal principal) {
    return reviewService.sla(principal);
  }
}
