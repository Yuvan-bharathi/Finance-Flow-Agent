import { useState, useRef, useEffect, useCallback } from 'react';
import { triggerHaptic } from '../utils/haptics';

/**
 * Custom Hook: useVoiceInput
 * 
 * Purpose:
 *   Enables microphone voice input for the AI Copilot using browser Web Speech API.
 *   Provides speech-to-text transcription directly into the standard AI Copilot pipeline.
 *   Strictly an input method: does not create a separate AI pipeline or bypass backend tools.
 * 
 * Parameters:
 *   onTranscriptComplete: (transcript: string) => void - Callback receiving final transcribed text
 * 
 * Data Source:
 *   Browser Web Speech API (webkitSpeechRecognition / SpeechRecognition)
 * 
 * Returns:
 *   {
 *     isListening: boolean - True while microphone is actively recording
 *     transcript: string - Current interim / transcribed text
 *     isSupported: boolean - True if browser supports Web Speech API
 *     startListening: () => void - Begin voice capture
 *     stopListening: () => void - Stop voice capture
 *     error: string | null - Any speech recognition error message
 *   }
 * 
 * Security Decisions:
 *   Microphone permission is requested on-demand only upon user interaction.
 *   Raw audio is transcribed locally by the browser engine; only text is sent to the backend Copilot API.
 */
export const useVoiceInput = ({ onTranscriptComplete } = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);

  const isSupported = typeof window !== 'undefined' &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      triggerHaptic('light');
    };

    recognition.onresult = (event) => {
      let currentTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript;
      }
      setTranscript(currentTranscript);

      // If final result
      if (event.results[event.results.length - 1].isFinal) {
        if (onTranscriptComplete && currentTranscript.trim()) {
          onTranscriptComplete(currentTranscript.trim());
        }
      }
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition event error:', event.error);
      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please grant permission in browser settings.');
      } else if (event.error !== 'no-speech') {
        setError(`Voice error: ${event.error}`);
      }
      setIsListening(false);
      triggerHaptic('error');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, [isSupported, onTranscriptComplete]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Voice recognition is not supported in this browser.');
      return;
    }
    setError(null);
    setTranscript('');
    try {
      recognitionRef.current?.start();
    } catch (err) {
      console.warn('Recognition start exception:', err);
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch (err) {
      console.warn('Recognition stop exception:', err);
    }
    setIsListening(false);
  }, []);

  return {
    isListening,
    transcript,
    isSupported,
    startListening,
    stopListening,
    error
  };
};

export default useVoiceInput;
