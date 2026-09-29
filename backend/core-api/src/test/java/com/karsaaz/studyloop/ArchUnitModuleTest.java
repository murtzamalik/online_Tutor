package com.karsaaz.studyloop;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

@AnalyzeClasses(packages = "com.karsaaz.studyloop", importOptions = ImportOption.DoNotIncludeTests.class)
class ArchUnitModuleTest {
  @ArchTest
  static final ArchRule noVendorSdksInFeatureModules =
      noClasses()
          .that().resideOutsideOfPackages("com.karsaaz.studyloop.gatewayclient..", "com.karsaaz.studyloop.gateway..")
          .should().dependOnClassesThat().resideInAnyPackage(
              "com.anthropic..", "com.google.cloud..", "com.google.genai..");

  @ArchTest
  static final ArchRule identityMustNotTouchBillingInfra =
      noClasses()
          .that().resideInAPackage("com.karsaaz.studyloop.identity..")
          .should().dependOnClassesThat().resideInAnyPackage("com.karsaaz.studyloop.billing..");
}
