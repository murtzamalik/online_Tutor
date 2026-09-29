package com.karsaaz.studyloop.marketing.api;

import com.karsaaz.studyloop.identity.api.CatalogueRoles;
import com.karsaaz.studyloop.marketing.application.MarketingService;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class MarketingController {
  private final MarketingService marketingService;

  public MarketingController(MarketingService marketingService) {
    this.marketingService = marketingService;
  }

  @GetMapping("/marketing/faq")
  @CatalogueRoles(id = "MKT-01", roles = "PUB")
  public Map<String, Object> faq() {
    return Map.of("items", marketingService.faq());
  }

  @PostMapping("/marketing/leads")
  @ResponseStatus(HttpStatus.CREATED)
  @CatalogueRoles(id = "MKT-02", roles = "PUB")
  public Map<String, Object> leads(@RequestBody Map<String, Object> body) {
    return marketingService.captureLead(body);
  }

  @GetMapping("/marketing/resources")
  @CatalogueRoles(id = "MKT-03", roles = "PUB")
  public Map<String, Object> resources() {
    return Map.of("items", marketingService.resources());
  }

  @GetMapping("/marketing/case-studies")
  @CatalogueRoles(id = "MKT-04", roles = "PUB")
  public Map<String, Object> caseStudies() {
    return Map.of("items", marketingService.caseStudies());
  }

  @GetMapping("/marketing/outcomes")
  @CatalogueRoles(id = "MKT-05", roles = "PUB")
  public Map<String, Object> outcomes() {
    return Map.of("items", marketingService.outcomes());
  }

  @PostMapping("/marketing/plan-quiz")
  @CatalogueRoles(id = "MKT-06", roles = "PUB")
  public Map<String, Object> planQuiz(@RequestBody(required = false) Map<String, Object> body) {
    return marketingService.planQuiz(body == null ? Map.of() : body);
  }

  @GetMapping("/marketing/sample-question")
  @CatalogueRoles(id = "MKT-07", roles = "PUB")
  public Map<String, Object> sampleQuestion() {
    return marketingService.sampleQuestion();
  }

  @PostMapping("/marketing/sample-question/{questionId}/answer")
  @CatalogueRoles(id = "MKT-08", roles = "PUB")
  public Map<String, Object> sampleAnswer(
      @PathVariable long questionId, @RequestBody Map<String, Object> body) {
    return marketingService.answerSample(questionId, body);
  }

  @PostMapping("/marketing/school-demo-request")
  @ResponseStatus(HttpStatus.CREATED)
  @CatalogueRoles(id = "MKT-09", roles = "PUB")
  public Map<String, Object> schoolDemo(@RequestBody Map<String, Object> body) {
    return marketingService.schoolDemo(body);
  }

  @GetMapping("/marketing/pages/{slug}")
  @CatalogueRoles(id = "MKT-10", roles = "PUB")
  public Map<String, Object> page(@PathVariable String slug) {
    return marketingService.page(slug);
  }
}
