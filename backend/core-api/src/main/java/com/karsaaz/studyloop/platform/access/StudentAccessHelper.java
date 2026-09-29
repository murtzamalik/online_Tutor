package com.karsaaz.studyloop.platform.access;

import com.karsaaz.studyloop.common.error.AppException;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class StudentAccessHelper {
  private final JdbcTemplate jdbc;

  public StudentAccessHelper(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public UUID resolveStudentId(AccountPrincipal principal, UUID pathStudentId) {
    if (hasStudentRole(principal.roles()) && principal.studentId() != null) {
      if (pathStudentId != null && !pathStudentId.equals(principal.studentId())) {
        throw AppException.forbidden("Cannot access another learner");
      }
      return principal.studentId();
    }
    if (pathStudentId == null) {
      throw AppException.badRequest("VALIDATION_FAILED", "studentId required");
    }
    return pathStudentId;
  }

  public void assertParentOwns(AccountPrincipal principal, UUID studentId) {
    requireParent(principal);
    Integer linked = jdbc.queryForObject(
        "SELECT COUNT(*) FROM parent_student_link WHERE parent_account_id = ? AND student_id = ?",
        Integer.class,
        principal.accountId(),
        studentId);
    if (linked == null || linked == 0) {
      throw AppException.forbidden("Not linked to this learner");
    }
  }

  public void assertParentOrStudent(AccountPrincipal principal, UUID studentId) {
    if (hasStudentRole(principal.roles()) && principal.studentId() != null) {
      if (!studentId.equals(principal.studentId())) {
        throw AppException.forbidden("Cannot access another learner");
      }
      return;
    }
    assertParentOwns(principal, studentId);
  }

  public void assertParentOrStudentOrTeacher(AccountPrincipal principal, UUID studentId) {
    if (hasStudentRole(principal.roles())) {
      assertParentOrStudent(principal, studentId);
      return;
    }
    if (hasTeacherRole(principal.roles())) {
      return;
    }
    assertParentOwns(principal, studentId);
  }

  public void requireParent(AccountPrincipal principal) {
    if (principal.accountId() == null || !hasParentRole(principal.roles())) {
      throw AppException.forbidden("Parent access required");
    }
  }

  public void requireStudent(AccountPrincipal principal) {
    if (!hasStudentRole(principal.roles()) || principal.studentId() == null) {
      throw AppException.forbidden("Student access required");
    }
  }

  public void requireOps(AccountPrincipal principal) {
    if (!hasOpsRole(principal.roles())) {
      throw AppException.forbidden("Operations access required");
    }
  }

  public static boolean hasParentRole(List<String> roles) {
    return roles.contains("PARENT") || roles.contains("PAR");
  }

  public static boolean hasStudentRole(List<String> roles) {
    return roles.contains("STUDENT") || roles.contains("STU");
  }

  public static boolean hasTeacherRole(List<String> roles) {
    return roles.contains("TEACHER") || roles.contains("TCH");
  }

  public static boolean hasOpsRole(List<String> roles) {
    return roles.contains("OPS_REVIEWER") || roles.contains("OPS");
  }

  public static boolean hasContentRole(List<String> roles) {
    return roles.contains("CONTENT_ADMIN") || roles.contains("CNT");
  }

  public static boolean hasAiEngineerRole(List<String> roles) {
    return roles.contains("AI_ENGINEER") || roles.contains("AIE");
  }

  public static boolean hasOwnerRole(List<String> roles) {
    return roles.contains("PRODUCT_OWNER") || roles.contains("BUSINESS_OWNER") || roles.contains("OWN");
  }
}
