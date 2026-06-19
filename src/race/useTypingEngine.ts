import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface Options {
  text: string;
  startedAt: number | null;
  onProgress: (charIndex: number, wpm: number, accuracy: number) => void;
  onFinish: (wpm: number, accuracy: number) => void;
  throttleMs?: number;
  /**
   * When true, wrong keystrokes advance the cursor anyway (the wrong char is "skipped past"
   * and counted as a missed keystroke for accuracy). Used in Speed mode so errors don't
   * block forward progress.
   */
  allowSkipWrong?: boolean;
}

interface TypingState {
  charIndex: number;
  wrong: boolean;
  wpm: number;
  accuracy: number;
  totalKeystrokes: number;
  correctKeystrokes: number;
  finished: boolean;
}

const INITIAL: TypingState = {
  charIndex: 0,
  wrong: false,
  wpm: 0,
  accuracy: 1,
  totalKeystrokes: 0,
  correctKeystrokes: 0,
  finished: false,
};

export function useTypingEngine({ text, startedAt, onProgress, onFinish, throttleMs = 150, allowSkipWrong = false }: Options) {
  const [state, setState] = useState<TypingState>(INITIAL);
  const lastReportRef = useRef(0);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    setState(INITIAL);
    lastReportRef.current = 0;
  }, [text, startedAt]);

  const computeWpm = useCallback(
    (correct: number) => {
      if (!startedAt) return 0;
      const minutes = Math.max((Date.now() - startedAt) / 60000, 1 / 600);
      return (correct / 5) / minutes;
    },
    [startedAt],
  );

  const handleKey = useCallback(
    (event: KeyboardEvent) => {
      if (!startedAt) return;
      if (stateRef.current.finished) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      let key = event.key;
      if (key === "Enter") key = "\n";
      if (key === "Backspace") {
        event.preventDefault();
        setState((s) => {
          if (s.charIndex === 0 && !s.wrong) return s;
          if (s.wrong) return { ...s, wrong: false };
          return { ...s, charIndex: s.charIndex - 1 };
        });
        return;
      }
      if (key.length !== 1 && key !== "\n") return;

      event.preventDefault();
      setState((s) => {
        if (s.finished) return s;
        const expected = text[s.charIndex];
        const totalKeystrokes = s.totalKeystrokes + 1;
        if (s.wrong) {
          return {
            ...s,
            totalKeystrokes,
            accuracy: s.correctKeystrokes / totalKeystrokes,
          };
        }
        if (key === expected) {
          const charIndex = s.charIndex + 1;
          const correctKeystrokes = s.correctKeystrokes + 1;
          const accuracy = correctKeystrokes / totalKeystrokes;
          const finished = charIndex >= text.length;
          const wpm = computeWpm(correctKeystrokes);
          return {
            ...s,
            charIndex,
            correctKeystrokes,
            totalKeystrokes,
            accuracy,
            wpm,
            finished,
          };
        }
        // Wrong key — in Speed mode we advance past it so the racer isn't blocked;
        // it still counts as a miss and tanks accuracy. Otherwise we freeze the cursor
        // and force a Backspace before forward progress can continue.
        if (allowSkipWrong) {
          const charIndex = s.charIndex + 1;
          const accuracy = s.correctKeystrokes / totalKeystrokes;
          const finished = charIndex >= text.length;
          const wpm = computeWpm(s.correctKeystrokes);
          return {
            ...s,
            charIndex,
            totalKeystrokes,
            accuracy,
            wpm,
            finished,
            wrong: false,
          };
        }
        return {
          ...s,
          wrong: true,
          totalKeystrokes,
          accuracy: s.correctKeystrokes / totalKeystrokes,
        };
      });
    },
    [text, startedAt, computeWpm],
  );

  useEffect(() => {
    if (!startedAt) return;
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey, startedAt]);

  useEffect(() => {
    const blockPaste = (e: ClipboardEvent) => e.preventDefault();
    window.addEventListener("paste", blockPaste);
    return () => window.removeEventListener("paste", blockPaste);
  }, []);

  useEffect(() => {
    if (!startedAt) return;
    const interval = setInterval(() => {
      setState((s) => {
        if (s.finished) return s;
        const wpm = computeWpm(s.correctKeystrokes);
        return { ...s, wpm };
      });
    }, 500);
    return () => clearInterval(interval);
  }, [startedAt, computeWpm]);

  useEffect(() => {
    if (!startedAt || state.finished) return;
    const now = Date.now();
    if (now - lastReportRef.current < throttleMs) return;
    lastReportRef.current = now;
    onProgress(state.charIndex, state.wpm, state.accuracy);
  }, [state.charIndex, state.wpm, state.accuracy, startedAt, throttleMs, onProgress, state.finished]);

  useEffect(() => {
    if (state.finished) {
      onFinish(state.wpm, state.accuracy);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.finished]);

  return useMemo(
    () => ({
      charIndex: state.charIndex,
      wrong: state.wrong,
      wpm: state.wpm,
      accuracy: state.accuracy,
      finished: state.finished,
    }),
    [state],
  );
}
