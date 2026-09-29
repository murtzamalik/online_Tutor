package com.karsaaz.studyloop.revision.api;

import com.karsaaz.studyloop.identity.api.CatalogueRoles;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.revision.application.RevisionService;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class RevisionController {
  private final RevisionService revision;

  public RevisionController(RevisionService revision) {
    this.revision = revision;
  }

  @GetMapping("/revision/topics/{topicId}/notes")
  @CatalogueRoles(id = "RVN-01", roles = "STU")
  public Map<String, Object> notes(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable long topicId) {
    return revision.notes(principal, topicId);
  }

  @GetMapping("/revision/topics/{topicId}/decks")
  @CatalogueRoles(id = "RVN-02", roles = "STU")
  public Map<String, Object> topicDecks(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable long topicId) {
    return Map.of("items", revision.topicDecks(principal, topicId));
  }

  @PostMapping("/revision/decks")
  @ResponseStatus(HttpStatus.CREATED)
  @CatalogueRoles(id = "RVN-03", roles = "STU")
  public Map<String, Object> createDeck(
      @AuthenticationPrincipal AccountPrincipal principal, @RequestBody Map<String, Object> body) {
    return revision.createDeck(principal, body);
  }

  @PutMapping("/revision/decks/{deckId}")
  @CatalogueRoles(id = "RVN-04", roles = "STU")
  public Map<String, Object> updateDeck(
      @AuthenticationPrincipal AccountPrincipal principal,
      @PathVariable UUID deckId,
      @RequestBody Map<String, Object> body) {
    return revision.updateDeck(principal, deckId, body);
  }

  @GetMapping("/revision/decks")
  @CatalogueRoles(id = "RVN-05", roles = "STU")
  public Map<String, Object> myDecks(
      @AuthenticationPrincipal AccountPrincipal principal,
      @org.springframework.web.bind.annotation.RequestParam(required = false) UUID deckId) {
    if (deckId != null) {
      return revision.deckDetail(principal, deckId);
    }
    return Map.of("items", revision.myDecks(principal));
  }

  @PostMapping("/revision/cards/{cardId}/review")
  @CatalogueRoles(id = "RVN-06", roles = "STU")
  public Map<String, Object> reviewCard(
      @AuthenticationPrincipal AccountPrincipal principal,
      @PathVariable UUID cardId,
      @RequestBody Map<String, Object> body) {
    return revision.reviewCard(principal, cardId, body);
  }

  @GetMapping("/revision/topics/{topicId}/cheat-sheet")
  @CatalogueRoles(id = "RVN-07", roles = "STU")
  public Map<String, Object> cheatSheet(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable long topicId) {
    return revision.cheatSheet(principal, topicId);
  }

  @GetMapping("/revision/topics/{topicId}/cheat-sheet/pdf")
  @CatalogueRoles(id = "RVN-08", roles = "STU")
  public Map<String, Object> cheatSheetPdf(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable long topicId) {
    return revision.cheatSheetPdf(principal, topicId);
  }

  @PostMapping("/revision/decks/{deckId}/share")
  @ResponseStatus(HttpStatus.CREATED)
  @CatalogueRoles(id = "RVN-09", roles = "STU")
  public Map<String, Object> shareDeck(
      @AuthenticationPrincipal AccountPrincipal principal,
      @PathVariable UUID deckId,
      @RequestBody(required = false) Map<String, Object> body) {
    return revision.shareDeck(principal, deckId, body == null ? Map.of() : body);
  }

  @GetMapping("/revision/shared/{shareCode}")
  @CatalogueRoles(id = "RVN-10", roles = "STU")
  public Map<String, Object> openShared(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable String shareCode) {
    return revision.openShared(principal, shareCode);
  }

  @DeleteMapping("/revision/shares/{shareCode}")
  @CatalogueRoles(id = "RVN-11", roles = "STU")
  public Map<String, Object> revokeShare(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable String shareCode) {
    return revision.revokeShare(principal, shareCode);
  }

  @PostMapping("/internal/revision/generate")
  @CatalogueRoles(id = "RVC-01", roles = "CNT,SYS")
  public Map<String, Object> generate(
      @AuthenticationPrincipal AccountPrincipal principal,
      @RequestBody(required = false) Map<String, Object> body) {
    return revision.generate(principal, body == null ? Map.of() : body);
  }

  @GetMapping("/internal/revision/exceptions")
  @CatalogueRoles(id = "RVC-02", roles = "CNT")
  public Map<String, Object> exceptions(@AuthenticationPrincipal AccountPrincipal principal) {
    return Map.of("items", revision.exceptions(principal));
  }
}
