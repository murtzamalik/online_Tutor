package com.karsaaz.studyloop.identity.domain;

import java.util.List;
import java.util.UUID;

public record AccountPrincipal(
    UUID accountId,
    UUID studentId,
    List<String> roles,
    boolean mfaSatisfied,
    UUID sessionId
) {}
