package com.karsaaz.studyloop.platform;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.karsaaz.studyloop.common.security.PiiPatterns;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;

class PiiLogLintTest {
  @Test
  void capturedLogsMustNotContainPii() {
    Logger log = (Logger) LoggerFactory.getLogger("pii-lint-probe");
    ListAppender<ILoggingEvent> appender = new ListAppender<>();
    appender.start();
    log.addAppender(appender);
    log.info("Handled login accountId={}", "550e8400-e29b-41d4-a716-446655440000");
    for (ILoggingEvent event : appender.list) {
      assertThat(PiiPatterns.containsPii(event.getFormattedMessage())).isFalse();
    }
  }

  @Test
  void detectorFlagsEmailInLogLine() {
    assertThat(PiiPatterns.containsPii("login failed for parent@example.com")).isTrue();
  }
}
