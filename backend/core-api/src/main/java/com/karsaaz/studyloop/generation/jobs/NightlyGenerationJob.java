package com.karsaaz.studyloop.generation.jobs;

import com.karsaaz.studyloop.generation.application.GenerationService;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * W1 nightly generation substitute. JobRunr is not on the classpath; this {@code @Scheduled}
 * job generates one item for the least-covered objective, then promotes pending items whose QC1
 * passed. Replace with a JobRunr recurring job when the dependency is added (noted in W1 gate report).
 */
@Component
public class NightlyGenerationJob {
  private static final Logger log = LoggerFactory.getLogger(NightlyGenerationJob.class);
  private final GenerationService generationService;

  public NightlyGenerationJob(GenerationService generationService) {
    this.generationService = generationService;
  }

  @Scheduled(cron = "${studyloop.generation.nightly-cron:0 15 2 * * *}")
  public void runNightly() {
    AccountPrincipal sys = new AccountPrincipal(null, null, List.of("SYS", "CNT"), true, null);
    try {
      var run = generationService.createRun(sys, Map.of("kind", "NIGHTLY"));
      log.info("Nightly generation runId={} status={}", run.get("runId"), run.get("status"));
    } catch (Exception e) {
      // One failed item must not stop promotion of already-checked items.
      log.warn("Nightly generation run failed: {}", e.getClass().getSimpleName());
    }
    int promoted = generationService.promoteApprovedPending(20);
    log.info("Nightly generation promoted={}", promoted);
  }
}
