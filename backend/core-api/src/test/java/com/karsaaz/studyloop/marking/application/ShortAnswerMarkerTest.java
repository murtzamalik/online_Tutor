package com.karsaaz.studyloop.marking.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class ShortAnswerMarkerTest {
  private final ShortAnswerMarker marker = new ShortAnswerMarker(new ObjectMapper());

  @Test
  void exactModelAnswerGetsFullMarksEvenWithEmptyPoints() {
    McqMarker.ObjectiveResult r = marker.mark("SHORT_ANSWER", "Blue", "[]", "Blue", (short) 2);
    assertThat(r.applicable()).isTrue();
    assertThat(r.marksAwarded()).isEqualByComparingTo(BigDecimal.valueOf(2));
  }

  @Test
  void normalisesCaseArticlesAndPunctuation() {
    assertThat(marker.mark("SHORT_ANSWER", "  it's BLUE. ", null, "blue", (short) 1).applicable()).isTrue();
    assertThat(marker.mark("SHORT_ANSWER", "The nucleus", null, "nucleus", (short) 1).applicable()).isTrue();
  }

  @Test
  void everyPointMustAcceptTheAnswer() {
    String points = "[{\"id\":\"M1\",\"marks\":1,\"point\":\"blue\",\"accept\":[\"blue crystals\"]},"
        + "{\"id\":\"M2\",\"marks\":1,\"point\":\"Accept blue / cyan description\",\"accept\":[\"blue\",\"cyan\"]}]";
    assertThat(marker.mark("SHORT_ANSWER", "blue", points, null, (short) 2).applicable()).isTrue();
    assertThat(marker.mark("SHORT_ANSWER", "cyan", points, null, (short) 2).applicable()).isFalse();
  }

  @Test
  void rejectListWins() {
    String points = "[{\"id\":\"M1\",\"marks\":1,\"point\":\"blue\",\"reject\":[\"blue\"]}]";
    assertThat(marker.mark("SHORT_ANSWER", "blue", points, null, (short) 1).applicable()).isFalse();
  }

  @Test
  void neverAppliesToWrongAnswersLongItemsOrOtherTypes() {
    assertThat(marker.mark("SHORT_ANSWER", "green", "[]", "Blue", (short) 2).applicable()).isFalse();
    assertThat(marker.mark("SHORT_ANSWER", "Blue", "[]", "Blue", (short) 4).applicable()).isFalse();
    assertThat(marker.mark("EXTENDED_RESPONSE", "Blue", "[]", "Blue", (short) 2).applicable()).isFalse();
    assertThat(marker.mark("SHORT_ANSWER", "", "[]", "", (short) 1).applicable()).isFalse();
  }
}
