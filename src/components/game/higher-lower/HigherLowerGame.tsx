"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, Check, Copy, Flame, RefreshCw, Trophy, X } from "@/components/ui/icons";
import { useTranslation } from "@/i18n";
import { higherLowerCopy } from "@/i18n/higher-lower";
import { profileIntegrationCopy } from "@/i18n/profile-integrations";
import { useHigherLower } from "@/hooks/useHigherLower";
import HigherLowerMovie from "@/components/game/higher-lower/HigherLowerMovie";
import { useHigherLowerMotion } from "@/components/game/higher-lower/useHigherLowerMotion";
import styles from "@/components/game/higher-lower/higher-lower.module.css";

export default function HigherLowerGame() {
  const { locale } = useTranslation();
  const state = useHigherLower(locale);
  return <HigherLowerScreen key={state.scope} locale={locale} state={state} />;
}

function HigherLowerScreen({ locale, state }: { locale: "pl" | "en"; state: ReturnType<typeof useHigherLower> }) {
  const copy = higherLowerCopy[locale];
  const { game, preparedNext, pending, error, best, recordSaved, accountRecordStatus, isNewBest, answer, next, commitNext, restart, retry } = state;
  const { arena, revealed } = useHigherLowerMotion(game, preparedNext, commitNext);
  const outcome = revealed ? game?.outcome : null;
  const score = game ? game.score - (!revealed && game.status === "revealed" ? 1 : 0) : 0;
  const visibleBest = !revealed && isNewBest && game?.status === "revealed" && best === game.score ? Math.max(0, best - 1) : best;
  const recordHint = accountRecordStatus === "synced" ? profileIntegrationCopy[locale].accountRecord
    : accountRecordStatus === "unavailable" ? profileIntegrationCopy[locale].recordSyncUnavailable
      : recordSaved ? copy.recordHint : copy.recordUnavailable;
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "error">("idle");
  const page = useRef<HTMLElement>(null);
  const primaryAction = useRef<HTMLButtonElement>(null);
  const previousStatus = useRef<string | null>(null);
  const previousRound = useRef<number | null>(null);

  useEffect(() => {
    if (game?.status === "revealed" && !pending && !error && !preparedNext) next();
  }, [game?.status, pending, error, preparedNext, next]);

  useEffect(() => {
    if (!game || pending || (game.status !== "guessing" && !revealed)) return;
    if (previousStatus.current !== null && (previousStatus.current !== game.status || previousRound.current !== game.round)) {
      primaryAction.current?.focus({ preventScroll: true });
    }
    previousStatus.current = game.status;
    previousRound.current = game.round;
  }, [game, pending, revealed]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (pending || error || game?.status !== "guessing" || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && target !== document.body && !page.current?.contains(target)) return;
      if (target instanceof HTMLElement && (target.isContentEditable || target.closest("input, textarea, select, [role=dialog], nav, aside"))) return;
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
      event.preventDefault();
      answer(event.key === "ArrowUp" ? "higher" : "lower");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [answer, error, game?.status, pending]);

  const share = useCallback(async () => {
    if (!game || game.status !== "finished") return;
    try {
      await navigator.clipboard.writeText(`${copy.shareText(game.score)}\n${window.location.origin}/play/higher-lower`);
      setShareStatus("copied");
    } catch {
      setShareStatus("error");
    }
  }, [copy, game]);

  const feedback = outcome === "equal" ? copy.equal : outcome === "correct" ? copy.correct : outcome === "wrong" ? copy.wrong : "";
  const errorMessage = error === "invalid_session" ? copy.sessionExpired : error === "rate_limit" ? copy.rateLimited : copy.error;

  return (
    <section ref={page} className={styles.page} aria-label={copy.title}>
      <header className={styles.header}>
        <Link href="/play" className={styles.back} aria-label={copy.back} title={copy.back}><ArrowLeft size={19} /></Link>
        <div className={styles.stats}>
          <div className={styles.stat} role="group" aria-label={`${copy.streak}: ${score}`}><Flame size={17} aria-hidden="true" /><strong>{score}</strong></div>
          <div className={`${styles.stat} ${styles.best}`} role="group" aria-label={`${copy.best}: ${visibleBest}`} title={recordHint}><Trophy size={16} aria-hidden="true" /><strong>{visibleBest}</strong></div>
        </div>
      </header>

      <p className="sr-only">{copy.subtitle}</p>
      <div className={styles.liveStatus} role="status" aria-live="polite" aria-atomic="true">
        {feedback && game ? `${feedback} ${game.right.title}: ${game.right.year}. ${copy.streak}: ${game.score}.` : pending || (game?.outcome && !revealed) ? copy.checking : ""}
      </div>

      {game ? (
        <div ref={arena} className={styles.arena}>
          <div data-round-feedback className={`${styles.versus} ${outcome === "wrong" ? styles.versusWrong : outcome ? styles.versusCorrect : ""}`} aria-hidden="true">
            {outcome === "wrong" ? <X size={24} /> : outcome ? <Check size={24} /> : copy.versus}
          </div>
          {[game.left, game.right, ...(preparedNext ? [preparedNext.right] : [])].map((movie, index) => (
          <HigherLowerMovie key={`${movie.id}:${game.round + index - 1}`} movie={movie} copy={copy} side={index === 0 ? "left" : index === 1 ? "right" : "incoming"} revealing={index === 1 && game.right.year !== null && !revealed} outcome={index === 1 ? outcome : null}>
            {index === 0 ? null : index === 2 ? <div className={styles.answerArea} /> :
            game.status === "guessing" ? (
              <div className={styles.answerArea}>
                <div className={styles.actions}>
                  <button ref={primaryAction} type="button" className={styles.primary} disabled={pending || Boolean(error)} onClick={() => answer("higher")} aria-keyshortcuts="ArrowUp"><ArrowUp size={19} />{copy.higher}</button>
                  <button type="button" className={styles.secondary} disabled={pending || Boolean(error)} onClick={() => answer("lower")} aria-keyshortcuts="ArrowDown"><ArrowDown size={19} />{copy.lower}</button>
                </div>
                {pending && <p className={styles.hint}>{copy.checking}</p>}
              </div>
            ) : !revealed ? <div className={styles.answerArea}><p className={styles.hint}>{copy.checking}</p></div> : (
              <div className={styles.answerArea} data-round-feedback>
                <p className={`${styles.feedback} ${game.status === "finished" ? styles.loss : ""}`}>{feedback}</p>
                {game.status === "revealed" ? (pending ? <p className={styles.hint}>{copy.loading}</p> : null) : (
                  <div className={styles.result}>
                    <p className={styles.resultTitle}>{isNewBest ? copy.newBest : copy.gameOver} <span>· {game.score}</span></p>
                    <div className={styles.actions}>
                      <button ref={primaryAction} type="button" className={styles.primary} disabled={pending} onClick={() => { setShareStatus("idle"); restart(); }}><RefreshCw size={17} />{copy.playAgain}</button>
                      <button type="button" className={styles.iconButton} onClick={() => void share()} aria-label={copy.share} title={copy.share}><Copy size={18} /></button>
                    </div>
                    {shareStatus !== "idle" && <p className={styles.hint} role="status">{shareStatus === "copied" ? copy.shared : copy.shareError}</p>}
                  </div>
                )}
              </div>
            )}
          </HigherLowerMovie>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <div className={styles.emptyGlow} />
          <p>{error ? errorMessage : copy.loading}</p>
          {!error && <span className={styles.loadingLine} />}
        </div>
      )}

      {error && <div className={styles.error} role="alert"><p>{errorMessage}</p><button type="button" onClick={retry} disabled={pending}>{error === "invalid_session" ? copy.playAgain : copy.tryAgain}<RefreshCw size={15} /></button></div>}

      <footer className={styles.footer}>
        <p className={styles.round}>{copy.round} <strong>{game?.round ?? 1}</strong></p>
      </footer>
    </section>
  );
}
