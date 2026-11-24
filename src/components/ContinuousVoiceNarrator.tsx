import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCcw, Square, Volume2 } from 'lucide-react';
import type { NarrationLine } from '../services/voiceNarrator';

export interface VoiceInterruptSignal {
  id: number;
  lines: NarrationLine[];
}

interface ContinuousVoiceNarratorProps {
  interruptSignal: VoiceInterruptSignal | null;
  isAnthemPlaying: boolean;
}

function selectPreferredVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  const preferredPatterns = [
    /Google US English/i,
    /Google UK English/i,
    /Microsoft Aria/i,
    /Microsoft Jenny/i,
    /Microsoft Guy/i,
    /Samantha/i,
    /Daniel/i,
    /Natural/i,
  ];
  for (const pattern of preferredPatterns) {
    const match = voices.find((v) => pattern.test(v.name) && v.lang.toLowerCase().startsWith('en'));
    if (match) return match;
  }
  return (
    voices.find((v) => v.lang.toLowerCase() === 'en-us') ||
    voices.find((v) => v.lang.toLowerCase().startsWith('en')) ||
    voices[0]
  );
}

/**
 * On-Demand AI Voice Assistant (Web Speech API, zero external API keys, zero background polling).
 * - Speaks ONLY when triggered by a user action (country click, tab/section switch,
 *   "Narrate Details", or "Read Overview").
 * - Plays all queued sentences in logical order, then stops cleanly until the next action.
 * - Strictly yields to any playing National Anthem (`isAnthemPlaying === true`) and
 *   automatically resumes the selected country's queued details when the anthem ends/pauses.
 */
export const ContinuousVoiceNarrator: React.FC<ContinuousVoiceNarratorProps> = ({
  interruptSignal,
  isAnthemPlaying,
}) => {
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [hasQueuedForAnthem, setHasQueuedForAnthem] = useState(false);
  const [activeLine, setActiveLine] = useState<NarrationLine>({
    topic: 'AI Voice Assistant',
    text: 'On-demand narrator ready. Click a country, section, or Narrate button to listen.',
  });

  const isAnthemPlayingRef = useRef<boolean>(isAnthemPlaying);
  isAnthemPlayingRef.current = isAnthemPlaying;
  const prevAnthemPlayingRef = useRef<boolean>(isAnthemPlaying);

  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const queueRef = useRef<NarrationLine[]>([]);
  const lastBatchRef = useRef<NarrationLine[]>([]);
  const currentLineRef = useRef<NarrationLine | null>(null);
  const speakTokenRef = useRef<number>(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const nextTimerRef = useRef<number | null>(null);
  const lastInterruptIdRef = useRef<number>(0);

  const clearPendingTimer = useCallback(() => {
    if (nextTimerRef.current !== null) {
      window.clearTimeout(nextTimerRef.current);
      nextTimerRef.current = null;
    }
  }, []);

  const stopSpeechCleanly = useCallback(() => {
    clearPendingTimer();
    speakTokenRef.current += 1;
    queueRef.current = [];
    currentLineRef.current = null;
    setHasQueuedForAnthem(false);
    setIsSpeaking(false);
    if (!isSupported) return;
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore cancel quirks on older mobile browsers
    }
  }, [clearPendingTimer, isSupported]);

  const speakLine = useCallback(
    (line: NarrationLine) => {
      if (!isSupported) return;

      // Never talk over an actively playing National Anthem — hold at front of queue
      if (isAnthemPlayingRef.current) {
        queueRef.current.unshift(line);
        setHasQueuedForAnthem(true);
        setIsSpeaking(false);
        return;
      }

      const synth = window.speechSynthesis;
      clearPendingTimer();

      const token = ++speakTokenRef.current;
      currentLineRef.current = line;
      setActiveLine(line);

      try {
        synth.cancel();
      } catch {
        // Ignore
      }

      const utterance = new SpeechSynthesisUtterance(line.text);
      utterance.lang = voiceRef.current?.lang || 'en-US';
      if (voiceRef.current) {
        utterance.voice = voiceRef.current;
      }
      utterance.rate = 1.02;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Strong reference prevents Chrome GC from dropping onend callbacks
      utteranceRef.current = utterance;

      utterance.onstart = () => {
        if (speakTokenRef.current !== token || isAnthemPlayingRef.current) {
          try {
            synth.cancel();
          } catch {
            // Ignore
          }
          return;
        }
        setHasQueuedForAnthem(false);
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        if (speakTokenRef.current !== token) return;
        setIsSpeaking(false);
        currentLineRef.current = null;
        clearPendingTimer();
        if (isAnthemPlayingRef.current) return;

        // Speak next sentence in this on-demand batch, OR stop cleanly when batch completes
        if (queueRef.current.length > 0) {
          nextTimerRef.current = window.setTimeout(() => {
            if (speakTokenRef.current !== token || isAnthemPlayingRef.current) return;
            const next = queueRef.current.shift();
            if (next) speakLine(next);
          }, 220);
        }
      };

      utterance.onerror = (event) => {
        if (speakTokenRef.current !== token) return;
        if (event.error === 'canceled' || event.error === 'interrupted') {
          return;
        }
        setIsSpeaking(false);
        currentLineRef.current = null;
        if (event.error === 'not-allowed' || isAnthemPlayingRef.current) {
          return;
        }
        // Advance past a single failed utterance if more lines remain in the current batch
        if (queueRef.current.length > 0) {
          clearPendingTimer();
          nextTimerRef.current = window.setTimeout(() => {
            if (speakTokenRef.current !== token || isAnthemPlayingRef.current) return;
            const next = queueRef.current.shift();
            if (next) speakLine(next);
          }, 320);
        }
      };

      try {
        if (synth.paused) synth.resume();
        synth.speak(utterance);
      } catch {
        setIsSpeaking(false);
      }
    },
    [clearPendingTimer, isSupported]
  );

  const speakNextFromQueue = useCallback(() => {
    if (isAnthemPlayingRef.current) return;
    const next = queueRef.current.shift();
    if (next) {
      setHasQueuedForAnthem(false);
      speakLine(next);
    } else {
      setIsSpeaking(false);
      setHasQueuedForAnthem(false);
    }
  }, [speakLine]);

  // Strict National Anthem Coordination:
  // - When isAnthemPlaying becomes true -> immediately cancel speech & preserve pending country queue
  // - When isAnthemPlaying transitions true -> false -> automatically narrate preserved country details, then stop cleanly
  useEffect(() => {
    if (!isSupported) return;
    const wasPlaying = prevAnthemPlayingRef.current;
    prevAnthemPlayingRef.current = isAnthemPlaying;

    if (isAnthemPlaying) {
      clearPendingTimer();
      speakTokenRef.current += 1;
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
      setIsSpeaking(false);
      if (currentLineRef.current && queueRef.current[0]?.text !== currentLineRef.current.text) {
        queueRef.current.unshift(currentLineRef.current);
      }
      currentLineRef.current = null;
      setHasQueuedForAnthem(queueRef.current.length > 0);
      return;
    }

    // Anthem just finished / paused / stopped / errored -> resume queued country details if any
    if (wasPlaying && !isAnthemPlaying && queueRef.current.length > 0) {
      clearPendingTimer();
      nextTimerRef.current = window.setTimeout(() => {
        if (!isAnthemPlayingRef.current && queueRef.current.length > 0) {
          speakNextFromQueue();
        }
      }, 340);
    }
  }, [clearPendingTimer, isAnthemPlaying, isSupported, speakNextFromQueue]);

  // Load browser speech voices cleanly
  useEffect(() => {
    if (!isSupported) return;
    const synth = window.speechSynthesis;

    const refreshVoices = () => {
      try {
        const list = synth.getVoices();
        if (list.length > 0) {
          voiceRef.current = selectPreferredVoice(list);
        }
      } catch {
        // Ignore
      }
    };

    refreshVoices();
    synth.addEventListener?.('voiceschanged', refreshVoices);
    return () => {
      synth.removeEventListener?.('voiceschanged', refreshVoices);
      clearPendingTimer();
      try {
        synth.cancel();
      } catch {
        // Ignore
      }
    };
  }, [clearPendingTimer, isSupported]);

  // On-Demand Trigger: Country click, Section/Tab switch, "Narrate Details", or "Read Overview"
  useEffect(() => {
    if (!isSupported || !interruptSignal || interruptSignal.lines.length === 0) return;
    if (interruptSignal.id === lastInterruptIdRef.current) return;
    lastInterruptIdRef.current = interruptSignal.id;

    lastBatchRef.current = [...interruptSignal.lines];
    queueRef.current = [...interruptSignal.lines];

    // If National Anthem is currently playing, hold details silently until anthem ends/pauses
    if (isAnthemPlayingRef.current) {
      setActiveLine(interruptSignal.lines[0]);
      setHasQueuedForAnthem(true);
      return;
    }

    speakNextFromQueue();
  }, [interruptSignal, isSupported, speakNextFromQueue]);

  const handleReplayBatch = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAnthemPlayingRef.current) return;
    if (lastBatchRef.current.length > 0) {
      queueRef.current = [...lastBatchRef.current];
      speakNextFromQueue();
    }
  };

  const handleStop = (e: React.MouseEvent) => {
    e.stopPropagation();
    stopSpeechCleanly();
  };

  if (!isSupported) return null;

  const canReplay = lastBatchRef.current.length > 0 && !isAnthemPlaying;

  return (
    <aside
      aria-label="On-Demand AI Voice Assistant"
      className="fixed bottom-4 left-4 z-40 flex max-w-[calc(100vw-2rem)] items-center gap-2.5 rounded-2xl border border-sky-400/30 bg-[#071022]/95 px-3 py-2 text-slate-100 shadow-[0_12px_36px_-10px_rgba(14,165,233,0.45)] sm:max-w-[440px] sm:gap-3 sm:px-3.5 sm:py-2.5"
    >
      {/* Active Voice Icon */}
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors ${
          isAnthemPlaying
            ? 'border-amber-400/45 bg-amber-400/15 text-amber-300'
            : isSpeaking
              ? 'border-cyan-400/50 bg-cyan-500/18 text-cyan-300'
              : 'border-sky-400/30 bg-sky-500/12 text-sky-300'
        }`}
      >
        <Volume2 className="h-4 w-4" aria-hidden="true" />
      </div>

      {/* Topic & Current Spoken Line */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-cyan-300">
          <span className="truncate">{activeLine.topic}</span>
          <span aria-hidden="true" className="text-slate-600">
            ·
          </span>
          <span
            className={`shrink-0 ${
              isAnthemPlaying
                ? 'text-amber-300'
                : isSpeaking
                  ? 'text-emerald-300'
                  : 'text-slate-400'
            }`}
          >
            {isAnthemPlaying
              ? hasQueuedForAnthem
                ? 'Waiting for Anthem'
                : 'Paused for Anthem'
              : isSpeaking
                ? 'Speaking'
                : 'On-Demand'}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs text-slate-200" title={activeLine.text}>
          {isAnthemPlaying
            ? 'Silent while National Anthem plays — details resume automatically when done.'
            : activeLine.text}
        </p>
      </div>

      {/* Controls: Replay Last Briefing & Stop Speaking */}
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={handleReplayBatch}
          disabled={!canReplay}
          aria-label="Replay last voice briefing"
          title={
            isAnthemPlaying
              ? 'Resumes automatically after anthem'
              : canReplay
                ? 'Replay last voice briefing'
                : 'Select a country or tap Narrate to listen'
          }
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/12 bg-white/[0.05] text-slate-200 transition-colors hover:border-sky-400/40 hover:bg-sky-500/15 hover:text-white disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        {isSpeaking && (
          <button
            type="button"
            onClick={handleStop}
            aria-label="Stop speaking"
            title="Stop speaking"
            className="inline-flex h-8 items-center gap-1 rounded-xl border border-rose-400/40 bg-rose-500/18 px-2.5 text-[11px] font-semibold text-rose-200 transition-colors hover:bg-rose-500/30 hover:text-white whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
          >
            <Square className="h-3 w-3 fill-current" aria-hidden="true" />
            <span className="hidden sm:inline">Stop</span>
          </button>
        )}
      </div>
    </aside>
  );
};
