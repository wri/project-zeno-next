"use client";
import { useCallback, useEffect, useRef, useState } from "react";

interface UseSpeechInputOptions {
  /** Called with the full transcript of the current dictation session as it grows. */
  onResult: (transcript: string) => void;
  /** Called when a dictation session begins (mic granted, listening started). */
  onStart?: () => void;
  /** BCP-47 language tag for recognition, e.g. "en-US", "pt-BR". Defaults to "en-US". */
  lang?: string;
}

export interface SpeechInput {
  listening: boolean;
  /** Start listening if idle, stop if already listening. */
  toggle: () => void;
  /** Stop listening (no-op if idle). */
  stop: () => void;
}

/**
 * Wraps the browser-native Web Speech API (SpeechRecognition) so the chat input
 * can be dictated. Runs entirely client-side — the browser's own speech service
 * does the transcription and no backend call is involved.
 *
 * Returns `null` when the API is unavailable (e.g. Firefox, or during SSR) so
 * callers can hide the mic affordance rather than render a dead control. Support
 * is resolved in an effect to keep the server and first client render identical
 * and avoid a hydration mismatch.
 */
export default function useSpeechInput(
  options: UseSpeechInputOptions
): SpeechInput | null {
  const { onResult, onStart, lang } = options;
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Keep the latest callbacks in refs so the live recognition instance always
  // calls the current closures without needing `toggle` to be re-created (which
  // would otherwise churn on every parent render).
  const onResultRef = useRef(onResult);
  const onStartRef = useRef(onStart);
  onResultRef.current = onResult;
  onStartRef.current = onStart;

  useEffect(() => {
    setSupported(
      typeof window !== "undefined" &&
        Boolean(window.SpeechRecognition ?? window.webkitSpeechRecognition)
    );
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const toggle = useCallback(() => {
    // A live instance means we're recording — toggling stops it. Teardown
    // happens in `onend`, which fires for both stop() and a natural end.
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }
    const Ctor =
      typeof window !== "undefined"
        ? (window.SpeechRecognition ?? window.webkitSpeechRecognition)
        : undefined;
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.lang = lang ?? "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => {
      setListening(true);
      onStartRef.current?.();
    };
    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      onResultRef.current(transcript);
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
    };
    recognition.onerror = () => {
      recognitionRef.current = null;
      setListening(false);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      // start() throws if invoked while a prior session is still winding down;
      // reset so the UI doesn't get stuck showing a listening state.
      recognitionRef.current = null;
      setListening(false);
    }
  }, [lang]);

  // Stop any in-flight recognition when the component unmounts.
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  return supported ? { listening, toggle, stop } : null;
}
