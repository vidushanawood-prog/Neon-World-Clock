import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCcw, SkipForward, Volume2 } from 'lucide-react';
import {
  buildNextContinuousCycleLines,
  type NarrationLine,
  type VoiceNarratorContext,
} from '../services/voiceNarrator';

export interface VoiceInterruptSignal {
  id: number;
  lines: NarrationLine[];
}

interface ContinuousVoiceNarratorProps {
  context: VoiceNarratorContext;
  interruptSignal: VoiceInterruptSignal | null;
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

export const ContinuousVoiceNarrator: React.FC<ContinuousVoiceNarratorProps> = ({
  context,
  interruptSignal,
}) => {
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeLine, setActiveLine] = useState<NarrationLine>({
    topic: 'AI Voice Narrator',
    text: 'Tap anywhere to start continuous live global voice narration.',
  });

  // Always-fresh ref snapshot of live telemetry so continuous loop reads current values
  const contextRef = useRef<VoiceNarratorContext>(context);
  contextRef.current = context;

  const unlockedRef = useRef<boolean>(false);
  const gestureReceivedRef = useRef<boolean>(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const queueRef = useRef<NarrationLine[]>([]);
  const currentLineRef = useRef<NarrationLine | null>(null);
  const cycleStepRef = useRef<number>(0);
  const speakTokenRef = useRef<number>(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const lastSpeakStartRef = useRef<number>(0);
  const lastAdvanceAtRef = useRef<number>(0);
  const nextTimerRef = useRef<number | null>(null);
  const lastInterruptIdRef = useRef<number>(0);

  const clearPendingTimer = useCallback(() => {
    if (nextTimerRef.current !== null) {
      window.clearTimeout(nextTimerRef.current);
      nextTimerRef.current = null;
    }
  }, []);

  const ensureQueuePopulated = useCallback(() => {
    if (queueRef.current.length > 0) return;
    const generated = buildNextContinuousCycleLines(
      contextRef.current,
      cycleStepRef.current
    );
    cycleStepRef.current += 1;
    if (generated.length > 0) {
      queueRef.current.push(...generated);
    } else {
      queueRef.current.push({
        topic: 'World Clock Live',
        text: 'Meridian global clock and orbital tracking are active.',
      });
    }
  }, []);

  const speakLine = useCallback(
    (line: NarrationLine) => {
      if (!isSupported) return;
      const synth = window.speechSynthesis;
      clearPendingTimer();

      const token = ++speakTokenRef.current;
      currentLineRef.current = line;
      setActiveLine(line);
      lastSpeakStartRef.current = Date.now();
      lastAdvanceAtRef.current = Date.now();

      try {
        synth.cancel();
      } catch {
        // Ignore cancel quirks on older mobile browsers
      }

      const utterance = new SpeechSynthesisUtterance(line.text);
      utterance.lang = voiceRef.current?.lang || 'en-US';
      if (voiceRef.current) {
        utterance.voice = voiceRef.current;
      }
      utterance.rate = 1.02;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Hold a strong reference so Chrome does not GC utterance before onend
      utteranceRef.current = utterance;

      utterance.onstart = () => {
        if (speakTokenRef.current !== token) return;
        unlockedRef.current = true;
        setIsUnlocked(true);
        setIsSpeaking(true);
        lastSpeakStartRef.current = Date.now();
      };

      utterance.onend = () => {
        if (speakTokenRef.current !== token) return;
        setIsSpeaking(false);
        lastAdvanceAtRef.current = Date.now();
        clearPendingTimer();
        nextTimerRef.current = window.setTimeout(() => {
          if (speakTokenRef.current !== token) return;
          ensureQueuePopulated();
          const next = queueRef.current.shift();
          if (next) speakLine(next);
        }, 260);
      };

      utterance.onerror = (event) => {
        if (speakTokenRef.current !== token) return;
        // If browser blocked autoplay before gesture, stay armed for first click/tap
        if (event.error === 'not-allowed') {
          setIsSpeaking(false);
          if (!gestureReceivedRef.current) {
            unlockedRef.current = false;
            setIsUnlocked(false);
          }
          // Re-queue this line at the front so it speaks immediately once unlocked
          queueRef.current.unshift(line);
          return;
        }
        if (event.error === 'canceled' || event.error === 'interrupted') {
          return;
        }
        // Recover automatically on any transient synthesis error
        setIsSpeaking(false);
        lastAdvanceAtRef.current = Date.now();
        clearPendingTimer();
        nextTimerRef.current = window.setTimeout(() => {
          if (speakTokenRef.current !== token) return;
          ensureQueuePopulated();
          const next = queueRef.current.shift();
          if (next) speakLine(next);
        }, 500);
      };

      try {
        if (synth.paused) synth.resume();
        synth.speak(utterance);
      } catch {
        // Watchdog will recover cleanly on next tick
      }
    },
    [clearPendingTimer, ensureQueuePopulated, isSupported]
  );

  const speakNextFromQueue = useCallback(() => {
    ensureQueuePopulated();
    const next = queueRef.current.shift();
    if (next) {
      speakLine(next);
    }
  }, [ensureQueuePopulated, speakLine]);

  // Load voices & react to voiceschanged
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
    };
  }, [isSupported]);

  // Unlock synchronously on first user gesture anywhere on the page
  useEffect(() => {
    if (!isSupported) return;

    const unlockAndStart = () => {
      if (gestureReceivedRef.current) return;
      gestureReceivedRef.current = true;
      unlockedRef.current = true;
      setIsUnlocked(true);
      const synth = window.speechSynthesis;
      if (!synth.speaking) {
        speakNextFromQueue();
      }
    };

    // Attempt optimistic start right away (if browser allows autoplay, onstart flips unlockedRef=true;
    // if blocked, gestureReceivedRef stays false so the very first click/tap unlocks synchronously)
    const initialTimer = window.setTimeout(() => {
      if (!unlockedRef.current && !gestureReceivedRef.current) {
        speakNextFromQueue();
      }
    }, 450);

    const events: Array<keyof WindowEventMap> = ['pointerdown', 'click', 'touchstart', 'keydown'];
    events.forEach((evt) =>
      window.addEventListener(evt, unlockAndStart, { capture: true, passive: true })
    );

    return () => {
      window.clearTimeout(initialTimer);
      events.forEach((evt) => window.removeEventListener(evt, unlockAndStart, { capture: true }));
    };
  }, [isSupported, speakNextFromQueue]);

  // Immediate Interrupt on Country Click, Panel Open, or Layer Toggle
  useEffect(() => {
    if (!isSupported || !interruptSignal || interruptSignal.lines.length === 0) return;
    if (interruptSignal.id === lastInterruptIdRef.current) return;
    lastInterruptIdRef.current = interruptSignal.id;

    // Replace pending queue with newly opened item's details so it speaks first,
    // then continuous cycle seamlessly resumes afterward.
    queueRef.current = [...interruptSignal.lines];

    unlockedRef.current = true;
    gestureReceivedRef.current = true;
    setIsUnlocked(true);
    speakNextFromQueue();
  }, [interruptSignal, isSupported, speakNextFromQueue]);

  // Periodic Watchdog Interval: guarantees narration NEVER stops or stalls on its own
  useEffect(() => {
    if (!isSupported) return;

    const watchdog = window.setInterval(() => {
      if (!unlockedRef.current) return;
      const synth = window.speechSynthesis;
      const nowMs = Date.now();

      // Chrome/Android recovery: unpause if synthesis spontaneously paused
      if (synth.paused) {
        try {
          synth.resume();
        } catch {
          // Ignore
        }
      }

      // Chrome long-utterance stall recovery: if speaking > 18s without onend, force next line
      if (synth.speaking && lastSpeakStartRef.current > 0 && nowMs - lastSpeakStartRef.current > 18000) {
        speakNextFromQueue();
        return;
      }

      // If both speaking and pending went false and no timer is waiting, immediately feed next line
      if (!synth.speaking && !synth.pending && nextTimerRef.current === null && nowMs - lastAdvanceAtRef.current > 950) {
        speakNextFromQueue();
      }
    }, 1250);

    return () => {
      window.clearInterval(watchdog);
      clearPendingTimer();
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    };
  }, [clearPendingTimer, isSupported, speakNextFromQueue]);

  const handleReplayCurrent = (e: React.MouseEvent) => {
    e.stopPropagation();
    unlockedRef.current = true;
    setIsUnlocked(true);
    if (currentLineRef.current) {
      speakLine(currentLineRef.current);
    } else {
      speakNextFromQueue();
    }
  };

  const handleNextLine = (e: React.MouseEvent) => {
    e.stopPropagation();
    unlockedRef.current = true;
    setIsUnlocked(true);
    speakNextFromQueue();
  };

  if (!isSupported) return null;

  return (
    <aside
      aria-label="Continuous AI Voice Assistant"
      onClick={() => {
        if (!unlockedRef.current) {
          unlockedRef.current = true;
          setIsUnlocked(true);
          speakNextFromQueue();
        }
      }}
      className="fixed bottom-4 left-4 z-40 flex max-w-[calc(100vw-2rem)] items-center gap-2.5 rounded-2xl border border-sky-400/30 bg-[#071022]/95 px-3 py-2 text-slate-100 shadow-[0_12px_36px_-10px_rgba(14,165,233,0.45)] sm:max-w-[430px] sm:gap-3 sm:px-3.5 sm:py-2.5"
    >
      {/* Active Voice Icon */}
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors ${
          isSpeaking
            ? 'border-cyan-400/50 bg-cyan-500/18 text-cyan-300'
            : 'border-sky-400/30 bg-sky-500/12 text-sky-300'
        }`}
      >
        <Volume2 className="h-4 w-4" aria-hidden="true" />
      </div>

      {/* Live Spoken Topic & Current Line */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-cyan-300">
          <span className="truncate">{activeLine.topic}</span>
          <span aria-hidden="true" className="text-slate-600">
            ·
          </span>
          <span className="shrink-0 text-slate-400">
            {isUnlocked ? (isSpeaking ? 'Speaking' : 'Continuous') : 'Tap to Start'}
          </span>
        </div>
        <p
          className="mt-0.5 truncate text-xs text-slate-200"
          title={activeLine.text}
        >
          {activeLine.text}
        </p>
      </div>

      {/* Minimal Controls: Replay Current & Next Line (No Stop/Mute Dead-End) */}
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={handleReplayCurrent}
          aria-label="Replay current narration line"
          title="Replay current line"
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/12 bg-white/[0.05] text-slate-200 transition-colors hover:border-sky-400/40 hover:bg-sky-500/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={handleNextLine}
          aria-label="Next narration line"
          title="Next narration line"
          className="inline-flex h-8 items-center gap-1 rounded-xl border border-sky-400/35 bg-sky-500/18 px-2.5 text-[11px] font-semibold text-sky-200 transition-colors hover:bg-sky-500/28 hover:text-white whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          <span className="hidden sm:inline">Next</span>
          <SkipForward className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
};
