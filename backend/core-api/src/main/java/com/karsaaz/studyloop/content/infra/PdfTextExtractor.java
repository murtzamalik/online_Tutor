package com.karsaaz.studyloop.content.infra;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Component;

/** Extracts plain text from past-paper PDFs for P-IN prompts (text path when vision images absent). */
@Component
public class PdfTextExtractor {
  private static final int MAX_CHARS = 120_000;

  public String extract(Path pdfPath) {
    if (pdfPath == null || !Files.isRegularFile(pdfPath)) {
      return "";
    }
    try (PDDocument doc = Loader.loadPDF(pdfPath.toFile())) {
      PDFTextStripper stripper = new PDFTextStripper();
      stripper.setSortByPosition(true);
      String text = stripper.getText(doc);
      return truncate(text == null ? "" : text.trim());
    } catch (IOException e) {
      throw new IllegalStateException("PDF text extract failed: " + e.getMessage(), e);
    }
  }

  public String extract(InputStream in) {
    try {
      byte[] bytes = in.readAllBytes();
      try (PDDocument doc = Loader.loadPDF(bytes)) {
        PDFTextStripper stripper = new PDFTextStripper();
        stripper.setSortByPosition(true);
        return truncate(stripper.getText(doc).trim());
      }
    } catch (IOException e) {
      throw new IllegalStateException("PDF text extract failed: " + e.getMessage(), e);
    }
  }

  public String firstPages(String fullText, int approxChars) {
    if (fullText == null || fullText.isBlank()) {
      return "";
    }
    int n = Math.min(Math.max(approxChars, 500), fullText.length());
    return fullText.substring(0, n);
  }

  private static String truncate(String text) {
    if (text.length() <= MAX_CHARS) {
      return text;
    }
    return text.substring(0, MAX_CHARS) + "\n…[truncated]";
  }

  /**
   * Page-aligned chunks of at most {@code maxChars} each (a single oversized page is cut). Each page
   * starts with {@code [page N]} so the segmenter can report page numbers. One model call per chunk
   * keeps the JSON output under the token limit for full-length papers.
   */
  public java.util.List<String> pageChunks(Path path, int maxChars) {
    java.util.List<String> pages = new java.util.ArrayList<>();
    if (path == null || !Files.isRegularFile(path)) {
      return pages;
    }
    if (path.getFileName().toString().toLowerCase(java.util.Locale.ROOT).endsWith(".pdf")) {
      try (PDDocument doc = Loader.loadPDF(path.toFile())) {
        PDFTextStripper stripper = new PDFTextStripper();
        stripper.setSortByPosition(true);
        for (int p = 1; p <= doc.getNumberOfPages(); p++) {
          stripper.setStartPage(p);
          stripper.setEndPage(p);
          String text = stripper.getText(doc);
          pages.add("[page " + p + "]\n" + (text == null ? "" : text.trim()));
        }
      } catch (IOException e) {
        throw new IllegalStateException("PDF text extract failed: " + e.getMessage(), e);
      }
    } else {
      pages.add(extractOrRaw(path));
    }
    return group(pages, maxChars);
  }

  static java.util.List<String> group(java.util.List<String> pages, int maxChars) {
    java.util.List<String> chunks = new java.util.ArrayList<>();
    StringBuilder current = new StringBuilder();
    for (String page : pages) {
      String p = page.length() > maxChars ? page.substring(0, maxChars) : page;
      if (current.length() > 0 && current.length() + p.length() + 1 > maxChars) {
        chunks.add(current.toString());
        current.setLength(0);
      }
      if (current.length() > 0) {
        current.append('\n');
      }
      current.append(p);
    }
    if (current.toString().isBlank()) {
      return chunks;
    }
    chunks.add(current.toString());
    return chunks;
  }

  /** Fallback when file is not a PDF — return UTF-8 text if plausible. */
  public String extractOrRaw(Path path) {
    if (path == null || !Files.isRegularFile(path)) {
      return "";
    }
    String name = path.getFileName().toString().toLowerCase(java.util.Locale.ROOT);
    if (name.endsWith(".pdf")) {
      return extract(path);
    }
    try {
      return truncate(Files.readString(path, StandardCharsets.UTF_8));
    } catch (IOException e) {
      return "";
    }
  }
}
