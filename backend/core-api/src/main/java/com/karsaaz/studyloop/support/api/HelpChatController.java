package com.karsaaz.studyloop.support.api;

import com.karsaaz.studyloop.identity.api.CatalogueRoles;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.support.application.HelpChatService;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class HelpChatController {
  private final HelpChatService help;

  public HelpChatController(HelpChatService help) {
    this.help = help;
  }

  @GetMapping("/help/articles")
  @CatalogueRoles(id = "HLP-01", roles = "PUB,PAR,STU")
  public Map<String, Object> search(@RequestParam(required = false) String q) {
    return Map.of("items", help.searchArticles(q));
  }

  @GetMapping("/help/articles/{slug}")
  @CatalogueRoles(id = "HLP-02", roles = "PUB,PAR,STU")
  public Map<String, Object> article(@PathVariable String slug) {
    return help.article(slug);
  }

  @PostMapping("/help/articles/{articleId}/feedback")
  @CatalogueRoles(id = "HLP-03", roles = "PUB,PAR,STU")
  public Map<String, Object> feedback(
      @PathVariable long articleId, @RequestBody Map<String, Object> body) {
    return help.feedback(articleId, body);
  }

  @PostMapping("/support/chat")
  @ResponseStatus(HttpStatus.CREATED)
  @CatalogueRoles(id = "HLP-04", roles = "PAR")
  public Map<String, Object> startChat(
      @AuthenticationPrincipal AccountPrincipal principal,
      @RequestBody(required = false) Map<String, Object> body) {
    return help.startChat(principal, body == null ? Map.of() : body);
  }

  @PostMapping("/support/chat/{chatId}/messages")
  @CatalogueRoles(id = "HLP-05", roles = "PAR,SUP")
  public Map<String, Object> postMessage(
      @AuthenticationPrincipal AccountPrincipal principal,
      @PathVariable UUID chatId,
      @RequestBody Map<String, Object> body) {
    return help.postMessage(principal, chatId, body);
  }

  @GetMapping("/internal/support/chats")
  @CatalogueRoles(id = "HLP-06", roles = "SUP")
  public Map<String, Object> inbox(@AuthenticationPrincipal AccountPrincipal principal) {
    return Map.of("items", help.agentInbox(principal));
  }
}
