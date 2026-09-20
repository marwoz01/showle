"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, Copy, Flame, Loader2, RefreshCw, Trophy, X } from "@/components/ui/icons";
import { useTranslation } from "@/i18n";
import { higherLowerCopy } from "@/i18n/higher-lower";
import { useHigherLower } from "@/hooks/useHigherLower";
import HigherLowerMovie from "@/components/game/higher-lower/HigherLowerMovie";
import styles from "@/components/game/higher-lower/higher-lower.module.css";

export default function HigherLowerGame() {
  const { locale } = useTranslation();
  const copy = higherLowerCopy[locale];
  const { game, pending, error, best, recordSaved, isNewBest, answer, next, restart, retry } = useHigherLower(locale);
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "error">("idle");
  const page = useRef<HTMLElement>(null);
  const primaryAction = useRef<HTMLButtonElement>(null);
  const previousStatus = useRef<string | null>(null);
  const previousRound = useRef<number | null>(null);

  useEffect(() => {
    if (!game || pending) return;
    if (previousStatus.current !== null && (previousStatus.current !== game.status || previousRound.current !== game.round)) {
      primaryAction.current?.focus({ preventScroll: true });
    }
    previousStatus.current = game.status;
    previousRound.current = game.round;
  }, [game, pending]);

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

  const feedback = game?.outcome === "equal" ? copy.equal : game?.outcome === "correct" ? copy.correct : game?.outcome === "wrong" ? copy.wrong : "";
  const errorMessage = error === "invalid_session" ? copy.sessionExpired : error === "rate_limit" ? copy.rateLimited : copy.error;

  return (
    <section ref={page} className={styles.page} aria-label={copy.title}>
      <header className={styles.header}>
        <Link href="/play" className={styles.back} aria-label={copy.back} title={copy.back}><ArrowLeft size={19} /></Link>
        <div className={styles.stats}>
          <div className={styles.stat} role="group" aria-label={`${copy.streak}: ${game?.score ?? 0}`}><Flame size={17} aria-hidden="true" /><strong>{game?.score ?? 0}</strong></div>
          <div className={`${styles.stat} ${styles.best}`} role="group" aria-label={`${copy.best}: ${best}`} title={recordSaved ? copy.recordHint : copy.recordUnavailable}><Trophy size={16} aria-hidden="true" /><strong>{best}</strong></div>
        </div>
      </header>

      <p className="sr-only">{copy.subtitle}</p>
      <div className={styles.liveStatus} role="status" aria-live="polite" aria-atomic="true">
        {pending ? copy.checking : feedback && game ? `${feedback} ${game.right.title}: ${game.right.year}. ${copy.streak}: ${game.score}.` : ""}
      </div>

      {game ? (
        <div className={styles.arena}>
          <HigherLowerMovie key={`left-${game.round}`} movie={game.left} copy={copy} side="left" carried={game.round > 1 && game.status === "guessing"} />
          <div className={`${styles.versus} ${game.outcome === "wrong" ? styles.versusWrong : game.outcome ? styles.versusCorrect : ""}`} aria-hidden="true">
            {game.outcome === "wrong" ? <X size={24} /> : game.outcome ? <Check size={24} /> : copy.versus}
          </div>
          <HigherLowerMovie key={`right-${game.round}`} movie={game.right} copy={copy} side="right" outcome={game.outcome}>
            {game.status === "guessing" ? (
              <div className={styles.answerArea}>
                <div className={styles.actions}>
                  <button ref={primaryAction} type="button" className={styles.primary} disabled={pending || Boolean(error)} onClick={() => answer("higher")} aria-keyshortcuts="ArrowUp"><ArrowUp size={19} />{copy.higher}</button>
                  <button type="button" className={styles.secondary} disabled={pending || Boolean(error)} onClick={() => answer("lower")} aria-keyshortcuts="ArrowDown"><ArrowDown size={19} />{copy.lower}</button>
                </div>
                {pending && <p className={styles.hint}>{copy.checking}</p>}
              </div>
            ) : (
              <div className={styles.answerArea}>
                <p className={`${styles.feedback} ${game.status === "finished" ? styles.loss : ""}`}>{feedback}</p>
                {game.status === "revealed" ? (
                  <button ref={primaryAction} type="button" className={styles.primary} disabled={pending || Boolean(error)} onClick={next}>{pending ? <Loader2 size={18} /> : <ArrowRight size={18} />}{copy.continue}</button>
                ) : (
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
