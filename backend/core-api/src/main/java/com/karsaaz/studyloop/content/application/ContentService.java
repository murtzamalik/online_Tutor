package com.karsaaz.studyloop.content.application;

import com.karsaaz.studyloop.common.error.AppException;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.platform.access.StudentAccessHelper;
import java.time.Clock;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ContentService {
  private final JdbcTemplate jdbc;
  private final Clock clock;

  public ContentService(JdbcTemplate jdbc, Clock clock) {
    this.jdbc = jdbc;
    this.clock = clock;
  }

  @Transactional
  public void approveQuestion(AccountPrincipal principal, long questionId) {
    if (!StudentAccessHelper.hasContentRole(principal.roles())) {
      throw AppException.forbidden("Content admin required");
    }
    int updated = jdbc.update(
        """
        UPDATE question SET review_status = 'APPROVED', reviewed_by = ?, reviewed_at = ?
        WHERE question_id = ? AND review_status IN ('PENDING_QC','QC_FAILED')
        """,
        principal.accountId(),
        clock.instant(),
        questionId);
    if (updated == 0) {
      throw AppException.notFound("Question not found or not approvable");
    }
  }
}
