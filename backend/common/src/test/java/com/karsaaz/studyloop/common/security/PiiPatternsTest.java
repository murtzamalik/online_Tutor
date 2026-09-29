package com.karsaaz.studyloop.common.security;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class PiiPatternsTest {
  @Test
  void detectsEmail() {
    assertThat(PiiPatterns.containsPii("user id=42 email=parent@example.com")).isTrue();
  }

  @Test
  void allowsIdsOnly() {
    assertThat(PiiPatterns.containsPii("accountId=550e8400-e29b-41d4-a716-446655440000")).isFalse();
  }
}
