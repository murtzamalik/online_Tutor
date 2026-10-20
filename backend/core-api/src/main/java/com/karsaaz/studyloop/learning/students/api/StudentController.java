package com.karsaaz.studyloop.learning.students.api;

import com.karsaaz.studyloop.identity.api.CatalogueRoles;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.learning.students.application.StudentService;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class StudentController {
  private final StudentService studentService;

  public StudentController(StudentService studentService) {
    this.studentService = studentService;
  }

  @GetMapping("/students")
  @CatalogueRoles(id = "STU-01", roles = "PAR")
  public Map<String, Object> list(@AuthenticationPrincipal AccountPrincipal principal) {
    return Map.of("items", studentService.listChildren(principal));
  }

  @PostMapping("/students")
  @ResponseStatus(HttpStatus.CREATED)
  @CatalogueRoles(id = "STU-02", roles = "PAR")
  public Map<String, Object> create(
      @AuthenticationPrincipal AccountPrincipal principal, @RequestBody Map<String, Object> body) {
    return studentService.createChild(principal, body);
  }

  @PutMapping("/students/{studentId}/picture-pin")
  @CatalogueRoles(id = "STU-04", roles = "PAR")
  public Map<String, Object> picturePin(
      @AuthenticationPrincipal AccountPrincipal principal,
      @PathVariable UUID studentId,
      @RequestBody Map<String, Object> body) {
    @SuppressWarnings("unchecked")
    List<String> seq = body.get("pictureSequence") != null
        ? (List<String>) body.get("pictureSequence")
        : (List<String>) body.get("pictureKeys");
    return studentService.setPicturePin(principal, studentId, seq);
  }

  @GetMapping("/students/{studentId}")
  @CatalogueRoles(id = "STU-05", roles = "PAR,STU,TCH")
  public Map<String, Object> get(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID studentId) {
    return studentService.getStudent(principal, studentId);
  }

  @GetMapping("/students/{studentId}/enrolments")
  @CatalogueRoles(id = "STU-06", roles = "PAR,STU")
  public Map<String, Object> enrolments(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID studentId) {
    return Map.of("items", studentService.listEnrolments(principal, studentId));
  }

  @PostMapping("/students/{studentId}/enrolments")
  @ResponseStatus(HttpStatus.CREATED)
  @CatalogueRoles(id = "STU-07", roles = "PAR,STU")
  public Map<String, Object> createEnrolment(
      @AuthenticationPrincipal AccountPrincipal principal,
      @PathVariable UUID studentId,
      @RequestBody Map<String, Object> body) {
    return studentService.createEnrolment(principal, studentId, body);
  }

  @GetMapping("/students/{studentId}/home")
  @CatalogueRoles(id = "STU-12", roles = "PAR,STU")
  public Map<String, Object> home(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID studentId) {
    return studentService.home(principal, studentId);
  }

  @GetMapping("/students/{studentId}/daily-goal")
  @CatalogueRoles(id = "STU-13", roles = "PAR,STU")
  public Map<String, Object> dailyGoal(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID studentId) {
    return studentService.dailyGoal(principal, studentId);
  }

  @PatchMapping("/students/{studentId}")
  @CatalogueRoles(id = "STU-03", roles = "PAR")
  public Map<String, Object> patchStudent(
      @AuthenticationPrincipal AccountPrincipal principal,
      @PathVariable UUID studentId,
      @RequestBody Map<String, Object> body) {
    return studentService.patchStudent(principal, studentId, body);
  }

  @PatchMapping("/enrolments/{enrolmentId}")
  @CatalogueRoles(id = "STU-08", roles = "PAR,STU")
  public Map<String, Object> patchEnrolment(
      @AuthenticationPrincipal AccountPrincipal principal,
      @PathVariable UUID enrolmentId,
      @RequestBody Map<String, Object> body) {
    return studentService.patchEnrolment(principal, enrolmentId, body);
  }

  @PutMapping("/students/{studentId}/daily-goal")
  @CatalogueRoles(id = "STU-14", roles = "PAR,STU")
  public Map<String, Object> putDailyGoal(
      @AuthenticationPrincipal AccountPrincipal principal,
      @PathVariable UUID studentId,
      @RequestBody Map<String, Object> body) {
    return studentService.putDailyGoal(principal, studentId, body);
  }

  @org.springframework.web.bind.annotation.DeleteMapping("/enrolments/{enrolmentId}")
  @CatalogueRoles(id = "STU-09", roles = "PAR")
  public Map<String, Object> deleteEnrolment(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID enrolmentId) {
    return studentService.deleteEnrolment(principal, enrolmentId);
  }

  @GetMapping("/students/{studentId}/accessibility")
  @CatalogueRoles(id = "STU-10", roles = "PAR,STU")
  public Map<String, Object> accessibility(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID studentId) {
    return studentService.accessibility(principal, studentId);
  }

  @PutMapping("/students/{studentId}/accessibility")
  @CatalogueRoles(id = "STU-11", roles = "PAR,STU")
  public Map<String, Object> putAccessibility(
      @AuthenticationPrincipal AccountPrincipal principal,
      @PathVariable UUID studentId,
      @RequestBody Map<String, Object> body) {
    return studentService.putAccessibility(principal, studentId, body);
  }
}
