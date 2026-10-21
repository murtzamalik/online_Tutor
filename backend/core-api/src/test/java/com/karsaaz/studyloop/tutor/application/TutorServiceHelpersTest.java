package com.karsaaz.studyloop.tutor.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.karsaaz.studyloop.common.error.AppException;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class TutorServiceHelpersTest {

  @Test
  void strategyFollowsTheMasteryBands() {
    assertThat(TutorService.strategyFor(null)).isEqualTo("GUIDED_HINTS");
    assertThat(TutorService.strategyFor(0.2)).isEqualTo("DIRECT_INSTRUCTION");
    assertThat(TutorService.strategyFor(0.5)).isEqualTo("WORKED_EXAMPLE");
    assertThat(TutorService.strategyFor(0.7)).isEqualTo("GUIDED_HINTS");
    assertThat(TutorService.strategyFor(0.9)).isEqualTo("FULL_QUESTION");
  }

  @Test
  void historyKeepsOnlyTheLastTurnsOldestFirst() {
    List<Map<String, String>> h =
        List.of(
            Map.of("role", "STUDENT", "text", "a"),
            Map.of("role", "TUTOR", "text", "b"),
            Map.of("role", "STUDENT", "text", "c"));
    assertThat(TutorService.formatHistory(h, 2)).isEqualTo("Tutor: b\nStudent: c");
    assertThat(TutorService.formatHistory(List.of(), 8)).isEmpty();
  }

  @Test
  void photoMustBeJpegOrPngUnderTheLimit() {
    byte[] jpeg = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0x00, 0x01};
    String dataUrl = "data:image/jpeg;base64," + Base64.getEncoder().encodeToString(jpeg);
    assertThat(TutorService.decodeImage(dataUrl)).hasSize(5);

    String gif = Base64.getEncoder().encodeToString("GIF89a....".getBytes());
    assertThatThrownBy(() -> TutorService.decodeImage(gif)).isInstanceOf(AppException.class);
    assertThatThrownBy(() -> TutorService.decodeImage("not base64!!")).isInstanceOf(AppException.class);
    assertThatThrownBy(() -> TutorService.decodeImage(null)).isInstanceOf(AppException.class);

    byte[] big = new byte[TutorService.MAX_PHOTO_BYTES + 1];
    big[0] = (byte) 0xFF;
    big[1] = (byte) 0xD8;
    big[2] = (byte) 0xFF;
    assertThatThrownBy(() -> TutorService.decodeImage(Base64.getEncoder().encodeToString(big)))
        .isInstanceOf(AppException.class);
  }
}
