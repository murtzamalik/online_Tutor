package com.karsaaz.studyloop.tutor.jobs;

import com.karsaaz.studyloop.common.db.Rows;
import com.karsaaz.studyloop.content.infra.ObjectStorageService;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Deletes learner photos (and their rows) once {@code answer_photo.retention_until} has passed. */
@Component
public class PhotoRetentionJob {
  private static final Logger log = LoggerFactory.getLogger(PhotoRetentionJob.class);

  private final JdbcTemplate jdbc;
  private final ObjectStorageService storage;

  public PhotoRetentionJob(JdbcTemplate jdbc, ObjectStorageService storage) {
    this.jdbc = jdbc;
    this.storage = storage;
  }

  @Scheduled(cron = "${studyloop.photos.purge-cron:0 45 3 * * *}")
  public void purgeExpired() {
    List<Map<String, Object>> expired =
        jdbc.query(
            "SELECT photo_id, storage_key FROM answer_photo WHERE retention_until < now() LIMIT 500",
            (rs, i) -> Rows.of("id", rs.getObject(1), "key", rs.getString(2)));
    int removed = 0;
    for (Map<String, Object> row : expired) {
      try {
        storage.delete(String.valueOf(row.get("key")));
        // Marks stay; only the link to the deleted image goes.
        jdbc.update("UPDATE student_response SET photo_id = NULL WHERE photo_id = ?", (UUID) row.get("id"));
        removed +=jdbc.update("DELETE FROM answer_photo WHERE photo_id = ?", (UUID) row.get("id"));
      } catch (Exception e) {
        log.warn("Photo purge failed for {}: {}", row.get("id"), e.toString());
      }
    }
    if (removed > 0) {
      log.info("answer_photo purge removed {} photos", removed);
    }
  }
}
