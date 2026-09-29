package com.karsaaz.studyloop.common.security;

import java.util.regex.Pattern;

/** Patterns that must never appear in application logs or AI gateway payloads. */
public final class PiiPatterns {
  public static final Pattern EMAIL = Pattern.compile(
      "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}");
  public static final Pattern UK_PHONE = Pattern.compile(
      "(?:\\+44|0)\\s?\\d{4}\\s?\\d{6}");
  public static final Pattern DOB_ISO = Pattern.compile(
      "\\b(19|20)\\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])\\b");

  private PiiPatterns() {}

  public static boolean containsPii(String text) {
    if (text == null || text.isBlank()) {
      return false;
    }
    return EMAIL.matcher(text).find()
        || UK_PHONE.matcher(text).find()
        || DOB_ISO.matcher(text).find();
  }
}
