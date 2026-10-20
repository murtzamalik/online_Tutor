package com.karsaaz.studyloop.gateway.audit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Purges outbound payload copies after {@code retention.ai_gateway_payload_days} (14 days, Q-02). */
@Component
public class PayloadRetentionJob {
  private static final Logger log = LoggerFactory.getLogger(PayloadRetentionJob.class);
  private final JdbcTemplate jdbc;

  public PayloadRetentionJob(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  @Scheduled(cron = "${studyloop.gateway.payload-purge-cron:0 30 3 * * *}")
  public void purgeExpired() {
    try {
      int n = jdbc.update("DELETE FROM ai_gateway_payload WHERE expires_at < now()");
      log.info("ai_gateway_payload purge removed {} rows", n);
    } catch (Exception e) {
      log.error("ai_gateway_payload purge failed: {}", e.toString());
    }
  }
}
