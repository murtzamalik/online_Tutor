package com.karsaaz.studyloop.learning.mock.api;

import com.karsaaz.studyloop.identity.api.CatalogueRoles;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.learning.mock.application.MockService;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class MockController {
  private final MockService mockService;

  public MockController(MockService mockService) {
    this.mockService = mockService;
  }

  @PostMapping("/mock-papers")
  @ResponseStatus(HttpStatus.CREATED)
  @CatalogueRoles(id = "MOC-01", roles = "STU")
  public Map<String, Object> create(
      @AuthenticationPrincipal AccountPrincipal principal,
      @RequestBody(required = false) Map<String, Object> body) {
    Map<String, Object> req = body == null ? Map.of() : body;
    if (Boolean.TRUE.equals(req.get("completedDemo"))) {
      return mockService.createCompletedDemo(principal, req);
    }
    return mockService.createMock(principal, req);
  }

  @GetMapping("/mock-papers/{mockId}")
  @CatalogueRoles(id = "MOC-02", roles = "STU")
  public Map<String, Object> get(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID mockId) {
    return mockService.getMock(principal, mockId);
  }

  @PostMapping("/mock-papers/{mockId}/start")
  @CatalogueRoles(id = "MOC-03", roles = "STU")
  public Map<String, Object> start(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID mockId) {
    return mockService.start(principal, mockId);
  }

  @PutMapping("/mock-papers/{mockId}/answers/{seq}")
  @CatalogueRoles(id = "MOC-04", roles = "STU")
  public Map<String, Object> answer(
      @AuthenticationPrincipal AccountPrincipal principal,
      @PathVariable UUID mockId,
      @PathVariable int seq,
      @RequestBody Map<String, Object> body) {
    return mockService.saveAnswer(principal, mockId, seq, body);
  }

  @PostMapping("/mock-papers/{mockId}/submit")
  @CatalogueRoles(id = "MOC-05", roles = "STU")
  public Map<String, Object> submit(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID mockId) {
    return mockService.submit(principal, mockId);
  }

  @GetMapping("/students/{studentId}/mock-papers")
  @CatalogueRoles(id = "MOC-09", roles = "STU,PAR")
  public Map<String, Object> list(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID studentId) {
    return Map.of("items", mockService.listForStudent(principal, studentId));
  }

  @GetMapping("/mock-papers/{mockId}/results")
  @CatalogueRoles(id = "MOC-06", roles = "STU,PAR")
  public Map<String, Object> results(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID mockId) {
    return mockService.results(principal, mockId);
  }

  @PostMapping("/mock-papers/{mockId}/photo-pages")
  @CatalogueRoles(id = "MOC-07", roles = "STU")
  public Map<String, Object> photoPages(
      @AuthenticationPrincipal AccountPrincipal principal,
      @PathVariable UUID mockId,
      @RequestBody(required = false) Map<String, Object> body) {
    return mockService.photoPages(principal, mockId, body == null ? Map.of() : body);
  }

  @GetMapping("/mock-papers/{mockId}/pdf")
  @CatalogueRoles(id = "MOC-08", roles = "STU,PAR")
  public Map<String, Object> pdf(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID mockId) {
    return mockService.pdf(principal, mockId);
  }
}
