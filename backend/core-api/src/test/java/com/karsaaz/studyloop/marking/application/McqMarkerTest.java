package com.karsaaz.studyloop.marking.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class McqMarkerTest {
  private final McqMarker marker = new McqMarker(new ObjectMapper());

  @Test
  void marksCorrectMcqFullMarks() {
    String options =
        "[{\"key\":\"A\",\"text\":\"wrong\",\"correct\":false},{\"key\":\"B\",\"text\":\"right\",\"correct\":true}]";
    String answer = "{\"mcqKey\":\"B\"}";
    McqMarker.ObjectiveResult r = marker.mark(options, answer, (short) 1);
    assertThat(r.applicable()).isTrue();
    assertThat(r.marksAwarded()).isEqualByComparingTo(BigDecimal.ONE);
  }

  @Test
  void marksWrongMcqZero() {
    String options = "[{\"key\":\"A\",\"text\":\"right\",\"correct\":true}]";
    String answer = "{\"mcqKey\":\"B\"}";
    McqMarker.ObjectiveResult r = marker.mark(options, answer, (short) 2);
    assertThat(r.marksAwarded()).isEqualByComparingTo(BigDecimal.ZERO);
  }
}
