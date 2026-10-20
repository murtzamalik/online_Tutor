package com.karsaaz.studyloop.identity;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.karsaaz.studyloop.identity.api.dto.AuthDtos;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.json.JsonTest;
import org.springframework.test.context.TestPropertySource;

@JsonTest
@TestPropertySource(properties = "spring.jackson.default-property-inclusion=non_null")
class TokenResponseSerializationTest {

  @Autowired
  private ObjectMapper objectMapper;

  @Test
  void tokensResponseOmitsNullMfaChallengeToken() throws Exception {
    AuthDtos.TokenResponse response = AuthDtos.TokenResponse.tokens("access", "refresh", 900L);

    String json = objectMapper.writeValueAsString(response);
    JsonNode node = objectMapper.readTree(json);

    assertThat(node.has("mfaChallengeToken"))
        .as("Jackson non_null contract JSON: %s", json)
        .isFalse();
    assertThat(node.get("accessToken").asText()).isEqualTo("access");
    assertThat(node.get("refreshToken").asText()).isEqualTo("refresh");
    assertThat(node.get("tokenType").asText()).isEqualTo("Bearer");
    assertThat(node.get("expiresInSeconds").asLong()).isEqualTo(900L);
    assertThat(node.get("mfaRequired").asBoolean()).isFalse();
  }

  @Test
  void mfaChallengeResponseOmitsNullTokenFields() throws Exception {
    AuthDtos.TokenResponse response = AuthDtos.TokenResponse.mfaChallenge("challenge-id");

    String json = objectMapper.writeValueAsString(response);
    JsonNode node = objectMapper.readTree(json);

    assertThat(node.has("accessToken"))
        .as("Jackson non_null contract JSON: %s", json)
        .isFalse();
    assertThat(node.has("refreshToken")).as("contract JSON: %s", json).isFalse();
    assertThat(node.get("mfaRequired").asBoolean()).isTrue();
    assertThat(node.get("mfaChallengeToken").asText()).isEqualTo("challenge-id");
    assertThat(node.get("tokenType").asText()).isEqualTo("Bearer");
    assertThat(node.get("expiresInSeconds").asLong()).isZero();
  }
}
