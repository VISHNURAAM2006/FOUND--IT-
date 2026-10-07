"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface SpeechRecognitionButtonProps {
  onTranscript: (newText: string) => void;
  currentText?: string;
}

export default function SpeechRecognitionButton({
  onTranscript,
  currentText = "",
}: SpeechRecognitionButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<"ta-IN" | "en-IN">("en-IN");
  const [interimText, setInterimText] = useState("");
  const [isSupported, setIsSupported] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check browser support for Web Speech API
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimText("");
  }, []);

  const startListening = () => {
    setErrorMessage("");
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      setErrorMessage("Voice recognition not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = selectedLanguage; // "ta-IN" for Tamil or "en-IN" for English

      recognition.onstart = () => {
        setIsListening(true);
        setInterimText("Listening... Speak now");
      };

      recognition.onresult = (event: any) => {
        let finalTrans = "";
        let interimTrans = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTrans += event.results[i][0].transcript;
          } else {
            interimTrans += event.results[i][0].transcript;
          }
        }

        if (finalTrans) {
          const separator = currentText && !currentText.endsWith(" ") ? " " : "";
          onTranscript(currentText + separator + finalTrans);
        }

        setInterimText(interimTrans || "Listening...");
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === "not-allowed") {
          setErrorMessage("Microphone access denied. Please allow microphone permissions.");
        } else if (event.error === "no-speech") {
          setInterimText("No speech detected. Try speaking closer to mic.");
        } else {
          setErrorMessage(`Speech recognition error: ${event.error}`);
        }
        stopListening();
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimText("");
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error("Failed to start speech recognition:", err);
      setErrorMessage(err.message || "Could not start microphone.");
      setIsListening(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Microphone Toggle Button */}
        <button
          type="button"
          onClick={toggleListening}
          className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 shadow-2xs cursor-pointer ${
            isListening
              ? "bg-red-600 text-white animate-pulse"
              : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
          }`}
          title="Click to speak your description"
        >
          <span className={isListening ? "animate-bounce" : ""}>🎙️</span>
          <span>{isListening ? "Stop Listening" : "Speak Description"}</span>
        </button>

        {/* Language Selector (Tamil vs English) */}
        <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 text-[11px]">
          <button
            type="button"
            onClick={() => {
              if (isListening) stopListening();
              setSelectedLanguage("en-IN");
            }}
            className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
              selectedLanguage === "en-IN"
                ? "bg-white text-blue-700 shadow-2xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            🇬🇧 English
          </button>
          <button
            type="button"
            onClick={() => {
              if (isListening) stopListening();
              setSelectedLanguage("ta-IN");
            }}
            className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
              selectedLanguage === "ta-IN"
                ? "bg-white text-emerald-700 shadow-2xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            🇮🇳 தமிழ் (Tamil)
          </button>
        </div>

        {isListening && (
          <span className="flex items-center gap-1.5 text-xs text-red-600 font-bold animate-pulse">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
            <span>Recording {selectedLanguage === "ta-IN" ? "Tamil" : "English"}...</span>
          </span>
        )}
      </div>

      {/* Live Interim Transcript or Error Banner */}
      {isListening && interimText && (
        <div className="p-2 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 italic animate-in fade-in flex items-center gap-2">
          <span className="animate-spin text-blue-600">💬</span>
          <span>&quot;{interimText}&quot;</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-2 bg-red-50 border border-red-200 rounded-xl text-[11px] text-red-700">
          ⚠️ {errorMessage}
        </div>
      )}

      {!isSupported && (
        <div className="text-[11px] text-amber-600">
          ℹ️ Voice input works best in Google Chrome or Microsoft Edge.
        </div>
      )}
    </div>
  );
}
