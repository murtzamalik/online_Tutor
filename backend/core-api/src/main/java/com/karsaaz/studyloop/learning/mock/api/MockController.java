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
    return mockService.createCompletedDemo(principal, body == null ? Map.of() : body);
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
}
