package com.karsaaz.studyloop.content.infra;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;

class PdfTextExtractorChunkTest {

  @Test
  void pagesAreGroupedWithoutSplittingAPage() {
    List<String> chunks = PdfTextExtractor.group(List.of("a".repeat(40), "b".repeat(40), "c".repeat(40)), 100);
    assertThat(chunks).hasSize(2);
    assertThat(chunks.get(0)).contains("a").contains("b").doesNotContain("c");
    assertThat(chunks.get(1)).isEqualTo("c".repeat(40));
  }

  @Test
  void oversizedPageIsCut() {
    List<String> chunks = PdfTextExtractor.group(List.of("x".repeat(250)), 100);
    assertThat(chunks).containsExactly("x".repeat(100));
  }
}
