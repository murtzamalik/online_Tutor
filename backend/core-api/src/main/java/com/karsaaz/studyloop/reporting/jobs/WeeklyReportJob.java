package com.karsaaz.studyloop.reporting.jobs;

import com.karsaaz.studyloop.reporting.application.ReportingService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** RPT-13: weekly reports, Sunday 18:00 Europe/London (endpoint catalogue). */
@Component
public class WeeklyReportJob {
  private static final Logger log = LoggerFactory.getLogger(WeeklyReportJob.class);
  private final ReportingService reportingService;

  public WeeklyReportJob(ReportingService reportingService) {
    this.reportingService = reportingService;
  }

  @Scheduled(cron = "${studyloop.reports.weekly-cron:0 0 18 * * SUN}", zone = "Europe/London")
  public void run() {
    try {
      log.info("Weekly reports: {}", reportingService.runWeeklyReports());
    } catch (Exception e) {
      log.error("Weekly report job failed: {}", e.getClass().getSimpleName());
    }
  }
}
