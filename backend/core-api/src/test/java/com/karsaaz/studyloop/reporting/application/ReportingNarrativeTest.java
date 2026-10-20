package com.karsaaz.studyloop.reporting.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class ReportingNarrativeTest {

  @Test
  void narrativeIsRenderedFromSchemaFieldsNotAMapDump() {
    String md =
        ReportingService.reportMarkdown(
            Map.of(
                "status", "ok",
                "headline", "A steady week",
                "paragraphs", List.of("{{child_name}} practised on 3 days."),
                "wins", List.of("3 active days"),
                "focus_areas", List.of(),
                "suggested_parent_actions", List.of("Ask about one answer"),
                "used_fact_ids", List.of("F3")));
    assertThat(md).startsWith("## A steady week");
    assertThat(md).contains("**Wins**").doesNotContain("Focus areas").doesNotContain("headline=");
  }

  @Test
  void childNameIsFilledByCodeAfterTheModel() {
    assertThat(ReportingService.withChildName("{{child_name}} did well.", "Alex")).isEqualTo("Alex did well.");
    assertThat(ReportingService.withChildName("{{child_name}} did well.", null)).isEqualTo("Your child did well.");
  }
}
