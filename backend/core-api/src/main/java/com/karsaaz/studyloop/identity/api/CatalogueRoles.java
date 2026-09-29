package com.karsaaz.studyloop.identity.api;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/** Declares the endpoint id and roles exactly as in api/endpoints.json for CI equality checks. */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface CatalogueRoles {
  String id();
  String roles();
}
