"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

export type VoicePhase = "idle" | "listening" | "error";
export type VoiceErrorType = "denied" | "no-speech" | "no-mic" | "other";

interface UseSpeechInputOptions {
  /** Resolved BCP-47 language tag to start from (from profile / browser). */
  initialLang: string;
  /**
   * Called with the final transcript when a listening session ends (the user
   * pressed stop, or recognition ended on its own). Not called on error.
   */
  onCommit: (transcript: string) => void;
  /** Called when a listening session begins, before any transcript arrives. */
  onStart?: () => void;
}

export interface SpeechInput {
  phase: VoicePhase;
  /** Finalised transcript so far. */
  committed: string;
  /** In-flight (interim) words, shown greyed. */
  interim: string;
  /** Elapsed listening time in whole seconds. */
  seconds: number;
  errorType: VoiceErrorType | null;
  /** Active recognition language (BCP-47). */
  lang: string;
  /** Override the language; restarts recognition in place if listening. */
  setLang: (code: string) => void;
  /** Begin a fresh listening session. */
  start: () => void;
  /** Stop listening and commit the transcript. */
  stop: () => void;
  /** Recover from an error (restart on no-speech, otherwise return to idle). */
  retry: () => void;
  /** Dismiss an error and return to idle (e.g. "Type instead"). */
  dismissError: () => void;
}

function getCtor(): SpeechRecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
}

function mapError(error: string): VoiceErrorType {
  switch (error) {
    case "not-allowed":
    case "service-not-allowed":
      return "denied";
    case "no-speech":
      return "no-speech";
    case "audio-capture":
      return "no-mic";
    default:
      return "other";
  }
}

// API support never changes after load, so a no-op subscription is enough; the
// server snapshot is false, matching the first client render (avoids hydration
// mismatch) before the real value resolves.
const noopSubscribe = () => () => {};
const getSupported = () => Boolean(getCtor());
const getSupportedServer = () => false;

/**
 * Drives voice dictation via the browser-native Web Speech API as a small
 * state machine (idle → listening → idle, or → error). Transcription runs
 * entirely client-side; no audio or transcript touches our backend.
 *
 * Returns `null` when the API is unavailable (e.g. Firefox, or during SSR) so
 * callers can hide the mic affordance. Support is resolved in an effect to keep
 * the server and first client render identical and avoid a hydration mismatch.
 */
export default function useSpeechInput(
  options: UseSpeechInputOptions
): SpeechInput | null {
  const { initialLang, onCommit, onStart } = options;

  const supported = useSyncExternalStore(
    noopSubscribe,
    getSupported,
    getSupportedServer
  );
  const [phase, setPhase] = useState<VoicePhase>("idle");
  const [committed, setCommitted] = useState("");
  const [interim, setInterim] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [errorType, setErrorType] = useState<VoiceErrorType | null>(null);
  // Session-only language override. When null, the resolved profile default
  // (`initialLang`) applies — so `lang` tracks auth loading automatically and
  // needs no syncing effect.
  const [langOverride, setLangOverride] = useState<string | null>(null);
  const lang = langOverride ?? initialLang;

  // Latest callbacks, so the live recognition instance always calls current
  // closures. Updated in an effect (not render) per React's ref rules; the
  // recognition events that read them only fire after effects have run.
  const onCommitRef = useRef(onCommit);
  const onStartRef = useRef(onStart);
  useEffect(() => {
    onCommitRef.current = onCommit;
    onStartRef.current = onStart;
  });

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Transcript carried across a mid-session language switch (which tears down
  // and recreates the recognition instance).
  const carryRef = useRef("");
  // Latest full transcript, read synchronously when the session ends.
  const transcriptRef = useRef("");

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const openRecognition = useCallback(
    (langCode: string) => {
      const Ctor = getCtor();
      if (!Ctor) return;
      const recognition = new Ctor();
      recognition.lang = langCode;
      recognition.interimResults = true;
      recognition.continuous = true;

      recognition.onresult = (event) => {
        let final = "";
        let live = "";
        for (let i = 0; i < event.results.length; i++) {
          const text = event.results[i][0].transcript;
          if (event.results[i].isFinal) final += text;
          else live += text;
        }
        const nextCommitted = (carryRef.current + final)
          .replace(/\s+/g, " ")
          .trimStart();
        setCommitted(nextCommitted);
        setInterim(live);
        transcriptRef.current = `${nextCommitted} ${live}`.trim();
      };
      recognition.onerror = (event) => {
        clearTimer();
        recognitionRef.current = null;
        setInterim("");
        setErrorType(mapError(event.error));
        setPhase("error");
      };
      recognition.onend = () => {
        clearTimer();
        recognitionRef.current = null;
        const text = transcriptRef.current.trim();
        setCommitted("");
        setInterim("");
        setPhase("idle");
        if (text) onCommitRef.current(text);
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch {
        // start() throws if a prior session is still winding down.
        recognitionRef.current = null;
      }
    },
    [clearTimer]
  );

  const start = useCallback(() => {
    if (!getCtor() || recognitionRef.current) return;
    clearTimer();
    carryRef.current = "";
    transcriptRef.current = "";
    setCommitted("");
    setInterim("");
    setSeconds(0);
    setErrorType(null);
    setPhase("listening");
    onStartRef.current?.();
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    openRecognition(lang);
  }, [lang, clearTimer, openRecognition]);

  const stop = useCallback(() => {
    // stop() triggers onend, which commits the transcript.
    recognitionRef.current?.stop();
  }, []);

  const setLang = useCallback(
    (code: string) => {
      setLangOverride(code);
      const current = recognitionRef.current;
      if (phase !== "listening" || !current) return;
      // Carry the transcript so far, then restart recognition in the new
      // language. Detach handlers first so the abort can't commit or error.
      carryRef.current = transcriptRef.current
        ? `${transcriptRef.current} `
        : "";
      setCommitted(carryRef.current.trim());
      setInterim("");
      current.onend = null;
      current.onerror = null;
      current.onresult = null;
      recognitionRef.current = null;
      current.abort();
      openRecognition(code);
    },
    [phase, openRecognition]
  );

  const dismissError = useCallback(() => {
    setErrorType(null);
    setPhase("idle");
  }, []);

  const retry = useCallback(() => {
    if (errorType === "no-speech") start();
    else dismissError();
  }, [errorType, start, dismissError]);

  // Tear down any in-flight recognition and timer on unmount.
  useEffect(() => {
    return () => {
      clearTimer();
      const current = recognitionRef.current;
      if (current) {
        current.onend = null;
        current.onerror = null;
        current.abort();
      }
    };
  }, [clearTimer]);

  return supported
    ? {
        phase,
        committed,
        interim,
        seconds,
        errorType,
        lang,
        setLang,
        start,
        stop,
        retry,
        dismissError,
      }
    : null;
}
