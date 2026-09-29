package com.karsaaz.studyloop.school.api;

import com.karsaaz.studyloop.identity.api.CatalogueRoles;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.school.application.SchoolService;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class SchoolController {
  private final SchoolService school;

  public SchoolController(SchoolService school) {
    this.school = school;
  }

  @GetMapping("/schools/{schoolId}")
  @CatalogueRoles(id = "SCH-01", roles = "TCH,SADM,SBM")
  public Map<String, Object> get(@AuthenticationPrincipal AccountPrincipal p, @PathVariable UUID schoolId) {
    return school.getSchool(p, schoolId);
  }

  @GetMapping("/schools/{schoolId}/classes")
  @CatalogueRoles(id = "SCH-02", roles = "TCH,SADM")
  public Map<String, Object> classes(@AuthenticationPrincipal AccountPrincipal p, @PathVariable UUID schoolId) {
    return school.listClasses(p, schoolId);
  }

  @PostMapping("/schools/{schoolId}/classes")
  @ResponseStatus(HttpStatus.CREATED)
  @CatalogueRoles(id = "SCH-03", roles = "TCH,SADM")
  public Map<String, Object> createClass(
      @AuthenticationPrincipal AccountPrincipal p, @PathVariable UUID schoolId, @RequestBody Map<String, Object> body) {
    return school.createClass(p, schoolId, body);
  }

  @PatchMapping("/classes/{classId}")
  @CatalogueRoles(id = "SCH-04", roles = "TCH,SADM")
  public Map<String, Object> patchClass(
      @AuthenticationPrincipal AccountPrincipal p, @PathVariable UUID classId, @RequestBody Map<String, Object> body) {
    return school.patchClass(p, classId, body);
  }

  @GetMapping("/classes/{classId}/pupils")
  @CatalogueRoles(id = "SCH-05", roles = "TCH,SADM")
  public Map<String, Object> pupils(@AuthenticationPrincipal AccountPrincipal p, @PathVariable UUID classId) {
    return school.listPupils(p, classId);
  }

  @PostMapping("/classes/{classId}/pupils")
  @CatalogueRoles(id = "SCH-06", roles = "TCH,SADM")
  public Map<String, Object> addPupils(
      @AuthenticationPrincipal AccountPrincipal p, @PathVariable UUID classId, @RequestBody Map<String, Object> body) {
    return school.addPupils(p, classId, body);
  }

  @DeleteMapping("/classes/{classId}/pupils/{studentId}")
  @CatalogueRoles(id = "SCH-07", roles = "TCH,SADM")
  public Map<String, Object> removePupil(
      @AuthenticationPrincipal AccountPrincipal p, @PathVariable UUID classId, @PathVariable UUID studentId) {
    return school.removePupil(p, classId, studentId);
  }

  @PostMapping("/classes/{classId}/assignments")
  @ResponseStatus(HttpStatus.CREATED)
  @CatalogueRoles(id = "ASG-01", roles = "TCH")
  public Map<String, Object> createAsg(
      @AuthenticationPrincipal AccountPrincipal p, @PathVariable UUID classId, @RequestBody Map<String, Object> body) {
    return school.createAssignment(p, classId, body);
  }

  @GetMapping("/classes/{classId}/assignments")
  @CatalogueRoles(id = "ASG-02", roles = "TCH")
  public Map<String, Object> listAsg(@AuthenticationPrincipal AccountPrincipal p, @PathVariable UUID classId) {
    return school.listAssignments(p, classId);
  }

  @GetMapping("/assignments/{assignmentId}")
  @CatalogueRoles(id = "ASG-03", roles = "TCH")
  public Map<String, Object> getAsg(@AuthenticationPrincipal AccountPrincipal p, @PathVariable UUID assignmentId) {
    return school.getAssignment(p, assignmentId);
  }

  @PatchMapping("/assignments/{assignmentId}")
  @CatalogueRoles(id = "ASG-04", roles = "TCH")
  public Map<String, Object> patchAsg(
      @AuthenticationPrincipal AccountPrincipal p, @PathVariable UUID assignmentId, @RequestBody Map<String, Object> body) {
    return school.patchAssignment(p, assignmentId, body);
  }

  @GetMapping("/students/{studentId}/assignments")
  @CatalogueRoles(id = "ASG-05", roles = "STU")
  public Map<String, Object> stuAsg(@AuthenticationPrincipal AccountPrincipal p, @PathVariable UUID studentId) {
    return school.studentAssignments(p, studentId);
  }

  @PostMapping("/assignments/{assignmentId}/publish")
  @CatalogueRoles(id = "ASG-06", roles = "TCH")
  public Map<String, Object> publish(@AuthenticationPrincipal AccountPrincipal p, @PathVariable UUID assignmentId) {
    return school.publishAssignment(p, assignmentId);
  }

  @GetMapping("/classes/{classId}/mastery")
  @CatalogueRoles(id = "INS-01", roles = "TCH,SADM")
  public Map<String, Object> mastery(@AuthenticationPrincipal AccountPrincipal p, @PathVariable UUID classId) {
    return school.classMastery(p, classId);
  }

  @GetMapping("/classes/{classId}/engagement")
  @CatalogueRoles(id = "INS-02", roles = "TCH,SADM")
  public Map<String, Object> eng(@AuthenticationPrincipal AccountPrincipal p, @PathVariable UUID classId) {
    return school.classEngagement(p, classId);
  }

  @GetMapping("/classes/{classId}/pupils/{studentId}/drilldown")
  @CatalogueRoles(id = "INS-03", roles = "TCH")
  public Map<String, Object> drill(
      @AuthenticationPrincipal AccountPrincipal p, @PathVariable UUID classId, @PathVariable UUID studentId) {
    return school.pupilDrilldown(p, classId, studentId);
  }

  @GetMapping("/schools/{schoolId}/dashboard")
  @CatalogueRoles(id = "INS-04", roles = "SADM")
  public Map<String, Object> dash(@AuthenticationPrincipal AccountPrincipal p, @PathVariable UUID schoolId) {
    return school.dashboard(p, schoolId);
  }

  @GetMapping("/classes/{classId}/misconceptions")
  @CatalogueRoles(id = "INS-05", roles = "TCH")
  public Map<String, Object> misc(@AuthenticationPrincipal AccountPrincipal p, @PathVariable UUID classId) {
    return school.misconceptions(p, classId);
  }

  @GetMapping("/classes/{classId}/insight-summary")
  @CatalogueRoles(id = "INS-06", roles = "TCH")
  public Map<String, Object> insight(@AuthenticationPrincipal AccountPrincipal p, @PathVariable UUID classId) {
    return school.insightSummary(p, classId);
  }

  @PostMapping("/schools/{schoolId}/roster-imports")
  @CatalogueRoles(id = "ONB-01", roles = "SADM")
  public Map<String, Object> roster(
      @AuthenticationPrincipal AccountPrincipal p, @PathVariable UUID schoolId, @RequestBody Map<String, Object> body) {
    return school.rosterImport(p, schoolId, body);
  }

  @GetMapping("/schools/{schoolId}/roster-imports/{importId}")
  @CatalogueRoles(id = "ONB-02", roles = "SADM")
  public Map<String, Object> getRoster(
      @AuthenticationPrincipal AccountPrincipal p, @PathVariable UUID schoolId, @PathVariable UUID importId) {
    return school.getRosterImport(p, schoolId, importId);
  }

  @PostMapping("/schools/{schoolId}/roster-imports/{importId}/commit")
  @CatalogueRoles(id = "ONB-03", roles = "SADM")
  public Map<String, Object> commitRoster(
      @AuthenticationPrincipal AccountPrincipal p, @PathVariable UUID schoolId, @PathVariable UUID importId) {
    return school.commitRoster(p, schoolId, importId);
  }

  @PostMapping("/schools/{schoolId}/mis-connection")
  @CatalogueRoles(id = "ONB-04", roles = "SADM")
  public Map<String, Object> mis(
      @AuthenticationPrincipal AccountPrincipal p, @PathVariable UUID schoolId, @RequestBody(required = false) Map<String, Object> body) {
    return school.misConnect(p, schoolId, body == null ? Map.of() : body);
  }

  @GetMapping("/schools/{schoolId}/sso")
  @CatalogueRoles(id = "ONB-05", roles = "SADM")
  public Map<String, Object> getSso(@AuthenticationPrincipal AccountPrincipal p, @PathVariable UUID schoolId) {
    return school.getSso(p, schoolId);
  }

  @PutMapping("/schools/{schoolId}/sso")
  @CatalogueRoles(id = "ONB-06", roles = "SADM")
  public Map<String, Object> putSso(
      @AuthenticationPrincipal AccountPrincipal p, @PathVariable UUID schoolId, @RequestBody Map<String, Object> body) {
    return school.putSso(p, schoolId, body);
  }

  @GetMapping("/schools/{schoolId}/dpa")
  @CatalogueRoles(id = "DPA-01", roles = "SADM,SBM")
  public Map<String, Object> dpa(@AuthenticationPrincipal AccountPrincipal p, @PathVariable UUID schoolId) {
    return school.getDpa(p, schoolId);
  }

  @PostMapping("/schools/{schoolId}/dpa/sign")
  @CatalogueRoles(id = "DPA-02", roles = "SADM,SBM")
  public Map<String, Object> signDpa(
      @AuthenticationPrincipal AccountPrincipal p, @PathVariable UUID schoolId, @RequestBody Map<String, Object> body) {
    return school.signDpa(p, schoolId, body);
  }

  @GetMapping("/schools/{schoolId}/dpa/pdf")
  @CatalogueRoles(id = "DPA-03", roles = "SADM,SBM")
  public Map<String, Object> dpaPdf(@AuthenticationPrincipal AccountPrincipal p, @PathVariable UUID schoolId) {
    return school.dpaPdf(p, schoolId);
  }

  @GetMapping("/schools/{schoolId}/billing")
  @CatalogueRoles(id = "SCB-01", roles = "SBM")
  public Map<String, Object> billing(@AuthenticationPrincipal AccountPrincipal p, @PathVariable UUID schoolId) {
    return school.schoolBilling(p, schoolId);
  }

  @PostMapping("/schools/{schoolId}/purchase-orders")
  @CatalogueRoles(id = "SCB-02", roles = "SBM")
  public Map<String, Object> po(
      @AuthenticationPrincipal AccountPrincipal p, @PathVariable UUID schoolId, @RequestBody Map<String, Object> body) {
    return school.createPo(p, schoolId, body);
  }

  @GetMapping("/schools/{schoolId}/invoices")
  @CatalogueRoles(id = "SCB-03", roles = "SBM")
  public Map<String, Object> invoices(@AuthenticationPrincipal AccountPrincipal p, @PathVariable UUID schoolId) {
    return school.schoolInvoices(p, schoolId);
  }

  @GetMapping("/schools/{schoolId}/invoices/{invoiceId}/pdf")
  @CatalogueRoles(id = "SCB-04", roles = "SBM")
  public Map<String, Object> invPdf(
      @AuthenticationPrincipal AccountPrincipal p, @PathVariable UUID schoolId, @PathVariable UUID invoiceId) {
    return school.schoolInvoicePdf(p, schoolId, invoiceId);
  }

  @GetMapping("/schools/{schoolId}/kcsie-pack")
  @CatalogueRoles(id = "KCS-01", roles = "SADM")
  public Map<String, Object> kcsie(@AuthenticationPrincipal AccountPrincipal p, @PathVariable UUID schoolId) {
    return school.kcsiePack(p, schoolId);
  }

  @PostMapping("/schools/{schoolId}/kcsie-confirmation")
  @CatalogueRoles(id = "KCS-02", roles = "SADM")
  public Map<String, Object> kcsieConfirm(
      @AuthenticationPrincipal AccountPrincipal p, @PathVariable UUID schoolId, @RequestBody Map<String, Object> body) {
    return school.kcsieConfirm(p, schoolId, body);
  }

  @PostMapping("/internal/schools")
  @ResponseStatus(HttpStatus.CREATED)
  @CatalogueRoles(id = "SCH-10", roles = "OWN,SUP")
  public Map<String, Object> createSchool(
      @AuthenticationPrincipal AccountPrincipal p, @RequestBody Map<String, Object> body) {
    return school.createInternalSchool(p, body);
  }

  @GetMapping("/internal/schools")
  @CatalogueRoles(id = "SCH-11", roles = "OWN,SUP,CMP")
  public Map<String, Object> listSchools(@AuthenticationPrincipal AccountPrincipal p) {
    return school.listInternalSchools(p);
  }
}
