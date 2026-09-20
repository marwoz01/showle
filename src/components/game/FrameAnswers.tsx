"use client";
import { useTranslation } from "@/i18n";
import experience from "@/i18n/experience";
import { normalizeDisplayText } from "@/lib/typography";
import type { DuelRoomView } from "@/types/duel";
import type { FrameRoomController } from "@/hooks/useFrameRoom";
interface Props { room: DuelRoomView; game: FrameRoomController; startsAt: number | null; countdown: number; playable: boolean; resolved: boolean; selectedIndex: number | null }
export default function FrameAnswers({ room, game, startsAt, countdown, playable, resolved, selectedIndex }: Props) {
  const { locale } = useTranslation();
  const copy = experience[locale];
  const { pending, me, roundKey, request, setSelected } = game;
  return (
              <div
                className="grid grid-cols-2 auto-rows-fr gap-2 p-3 sm:gap-3 sm:p-5"
                data-testid="frame-answers"
              >
                {(room.question?.options ?? Array.from({ length: 4 }, () => ({ title: "", year: 0 }))).map((option, index) => (
                  <button
                    key={index}
                    title={
                      room.question && startsAt && countdown === 0
                        ? `${normalizeDisplayText(option.title)} (${option.year})`
                        : undefined
                    }
                    aria-label={
                      !room.question || !startsAt || countdown > 0
                        ? String.fromCharCode(65 + index)
                        : undefined
                    }
                    disabled={!playable || Boolean(me?.answered) || pending}
                    onClick={() => {
                      setSelected({ key: roundKey, index });
                      void request(`/api/duel/rooms/${room.code}/answer`, {
                        answerIndex: index,
                        round: room.currentRound,
                        match: room.matchNumber,
                      });
                    }}
                    className={`frame-answer flex min-h-24 min-w-0 flex-col justify-between gap-2 rounded-2xl px-3 py-3 text-left text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-purple sm:px-4 sm:text-sm ${resolved && room.question?.correctIndex === index ? "bg-match-exact/15 text-match-exact" : selectedIndex === index ? (resolved ? "bg-match-miss/15 text-match-miss" : "bg-accent-purple/20 text-foreground") : "bg-white/5 text-foreground hover:enabled:bg-white/10"}`}
                  >
                    {room.question && startsAt && countdown === 0 ? (
                      <span className="line-clamp-3 leading-snug">
                        {normalizeDisplayText(option.title)}{" "}
                        <span className="text-[10px] font-normal text-muted sm:text-xs">
                          ({option.year})
                        </span>
                      </span>
                    ) : (
                      <span aria-hidden="true" className="text-muted/30">
                        {String.fromCharCode(65 + index)}
                      </span>
                    )}
                    <span
                      className="flex min-h-4 w-full gap-1"
                      data-testid={`answer-players-${index}`}
                    >
                      {resolved &&
                        room.players
                          .filter((player) => player.answerIndex === index)
                          .map((player) => (
                            <span
                              key={player.role}
                              title={normalizeDisplayText(player.name)}
                              className={`min-w-0 truncate rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${player.role === room.you ? "bg-accent-purple/20 text-[#bb9dff]" : "bg-cyan-400/15 text-cyan-200"}`}
                            >
                              {player.role === room.you
                                ? copy.you
                                : normalizeDisplayText(player.name)}
                            </span>
                          ))}
                    </span>
                  </button>
                ))}
              </div>
  );
}
