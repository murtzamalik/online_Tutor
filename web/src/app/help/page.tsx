"use client";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ChatsCircle, FileText, MagnifyingGlass, Question, ThumbsDown, ThumbsUp } from "@phosphor-icons/react";
import { PublicFrame } from "@/components/shell/PublicFrame";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge, Callout, Card, Input } from "@/components/ui/primitives";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { MarketingPage } from "@/components/marketing/MarketingPage";
import { Markdown } from "@/components/marketing/Markdown";
import { humanise } from "@/components/marketing/format";
import { ApiError } from "@/lib/api/client";
import * as api from "@/lib/api/w3";

/** Rows of GET /help/articles (HelpChatService.searchArticles). */
type Article = { articleId?: number; slug?: string; title?: string; bodyMd?: string; audience?: string; tags?: string[] };
/** GET /help/articles/{slug}. */
type ArticleDetail = Article & { helpfulYes?: number; helpfulNo?: number };

/** P-01 — Help centre */
export default function Page() {
  const [items, setItems] = useState<Article[] | null>(null);
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [query, setQuery] = useState("");
  const [lastQuery, setLastQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);
  const [articleError, setArticleError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<"sent" | "error" | null>(null);

  async function search(q = "") {
    setError(null);
    setForbidden(false);
    setArticle(null);
    setArticleError(null);
    setSearching(true);
    try {
      const result = await api.helpSearch(q);
      setItems((result.items ?? []) as Article[]);
      setLastQuery(q);
    } catch (e: unknown) {
      const msg = e instanceof Error && e.message ? e.message : "Could not load";
      // /help/** is not public in SecurityConfig yet, and helpSearch sends no token, so 401 lands here too.
      if ((e instanceof ApiError && (e.status === 401 || e.status === 403)) || /forbidden|unauthori[sz]ed/i.test(msg)) {
        setForbidden(true);
        setItems([]);
      } else {
        setError(msg);
      }
    } finally {
      setSearching(false);
    }
  }

  useEffect(() => {
    void search("");
  }, []);

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    await search(query);
  }

  async function openArticle(a: Article) {
    if (!a.slug) return;
    setOpening(a.slug);
    setArticleError(null);
    setFeedback(null);
    try {
      setArticle((await api.helpArticle(a.slug)) as ArticleDetail);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: unknown) {
      setArticleError(err instanceof Error && err.message ? err.message : "Could not open article");
    } finally {
      setOpening(null);
    }
  }

  async function sendFeedback(helpful: boolean) {
    if (article?.articleId == null) return;
    try {
      await api.helpFeedback(article.articleId, helpful);
      setFeedback("sent");
    } catch {
      setFeedback("error");
    }
  }

  return (
    <PublicFrame>
      <MarketingPage
        width="narrow"
        eyebrow="Help centre"
        title="How can we help?"
        description="Guides for families, learners and schools. Can't find it? Our support team is a message away."
      >
        <div aria-live="polite">
          {!items && !error && !forbidden && <LoadingState label="Loading help articles…" lines={5} />}

          {forbidden && (
            <div className="animate-rise space-y-4">
              <EmptyState
                title="Help articles need a signed-in account"
                body="Some help topics are available after you log in as a parent. You can also browse the FAQ without signing in."
                action={
                  <div className="flex flex-wrap justify-center gap-3">
                    <ButtonLink href="/login">Parent login</ButtonLink>
                    <ButtonLink href="/faq" variant="secondary">Open FAQ</ButtonLink>
                    <ButtonLink href="/parent" variant="tertiary">Parent home</ButtonLink>
                  </div>
                }
              />
            </div>
          )}

          {error && (
            <ErrorState
              title="Help articles didn't load"
              body={`${error}. Try again, or browse the FAQ.`}
              action={
                <div className="flex flex-wrap justify-center gap-3">
                  <Button variant="secondary" onClick={() => search(lastQuery)} loading={searching}>Try again</Button>
                  <ButtonLink href="/faq" variant="tertiary">Open FAQ</ButtonLink>
                </div>
              }
            />
          )}

          {items && !forbidden && !error && (
            <div className="animate-rise space-y-6">
              {!article && (
                <form onSubmit={onSearch} className="flex flex-col gap-2 sm:flex-row" role="search">
                  <div className="relative flex-1">
                    <label className="sr-only" htmlFor="help-q">Search help</label>
                    <MagnifyingGlass size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" aria-hidden />
                    <Input
                      id="help-q"
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="pl-10"
                      placeholder="Search help, e.g. “add a child” or “billing”"
                    />
                  </div>
                  <Button type="submit" loading={searching}>Search</Button>
                </form>
              )}

              {articleError && <Callout tone="danger" title="That article didn't open">{articleError}. Please try again.</Callout>}

              {!article && (
                <>
                  {lastQuery && (
                    <p className="text-[14px] text-neutral-600">
                      {items.length} {items.length === 1 ? "result" : "results"} for “<span className="font-semibold text-neutral-900">{lastQuery}</span>”{" "}
                      <button
                        type="button"
                        className="ml-1 font-semibold text-brand-navy hover:underline"
                        onClick={() => {
                          setQuery("");
                          void search("");
                        }}
                      >
                        Clear
                      </button>
                    </p>
                  )}
                  {items.length === 0 ? (
                    <EmptyState title="No articles found" body="Try a different search, or open the FAQ." action={<ButtonLink href="/faq" variant="secondary">Open FAQ</ButtonLink>} />
                  ) : (
                    <ul className="divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200 bg-white">
                      {items.map((a) => (
                        <li key={a.slug ?? a.title}>
                          <button
                            type="button"
                            className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors duration-fast hover:bg-neutral-050 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-navy/30 disabled:opacity-60"
                            disabled={!a.slug || opening !== null}
                            aria-busy={opening === a.slug || undefined}
                            onClick={() => openArticle(a)}
                          >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-navySoft text-brand-navy">
                              <FileText size={18} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block font-semibold text-neutral-900">{a.title}</span>
                              {(a.audience || (a.tags && a.tags.length > 0)) && (
                                <span className="mt-1 flex flex-wrap gap-1.5">
                                  {a.audience && <Badge tone="neutral">{humanise(a.audience)}</Badge>}
                                  {(a.tags ?? []).slice(0, 3).map((t) => (
                                    <Badge key={t} tone="info">{t}</Badge>
                                  ))}
                                </span>
                              )}
                            </span>
                            {opening === a.slug ? (
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-navy border-r-transparent" aria-hidden />
                            ) : (
                              <ArrowRight size={18} className="shrink-0 text-neutral-400" aria-hidden />
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}

              {article && (
                <Card className="p-6 sm:p-8">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-brand-navy hover:underline"
                    onClick={() => setArticle(null)}
                  >
                    <ArrowLeft size={16} /> All articles
                  </button>
                  {article.audience && <Badge tone="neutral" className="ml-3">{humanise(article.audience)}</Badge>}
                  <h2 className="mt-4 text-h1 text-neutral-900">{article.title}</h2>
                  <article className="mt-5">
                    <Markdown source={article.bodyMd ?? ""} skipFirstH1 />
                  </article>
                  {article.articleId != null && (
                    <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-neutral-200 pt-5">
                      {feedback === "sent" ? (
                        <p className="text-[14px] font-medium text-answer-correct" role="status">Thanks for your feedback.</p>
                      ) : (
                        <>
                          <p className="text-[14px] font-medium text-neutral-700">Was this helpful?</p>
                          <Button size="sm" variant="secondary" icon={<ThumbsUp size={16} />} onClick={() => sendFeedback(true)}>Yes</Button>
                          <Button size="sm" variant="secondary" icon={<ThumbsDown size={16} />} onClick={() => sendFeedback(false)}>No</Button>
                          {feedback === "error" && <p className="text-caption text-answer-incorrect" role="alert">Couldn&apos;t send that — please try again.</p>}
                        </>
                      )}
                    </div>
                  )}
                </Card>
              )}
            </div>
          )}
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          <Link href="/help/chat" className="group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/30">
            <Card interactive className="h-full p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-tealSoft text-brand-teal">
                <ChatsCircle size={20} />
              </span>
              <h2 className="mt-4 text-[17px] font-semibold text-neutral-900 group-hover:text-brand-navy">Chat with support</h2>
              <p className="mt-1 text-[15px] text-neutral-600">Message a real person on our support team — not a chatbot.</p>
            </Card>
          </Link>
          <Link href="/faq" className="group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/30">
            <Card interactive className="h-full p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-navySoft text-brand-navy">
                <Question size={20} />
              </span>
              <h2 className="mt-4 text-[17px] font-semibold text-neutral-900 group-hover:text-brand-navy">Frequently asked questions</h2>
              <p className="mt-1 text-[15px] text-neutral-600">Quick answers about marking, boards, cost and accounts.</p>
            </Card>
          </Link>
        </div>
      </MarketingPage>
    </PublicFrame>
  );
}
