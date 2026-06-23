import { useState, useRef, useCallback, useEffect } from "react";
import { useMemberConfig } from "@/components/atomic-crm/contexts/MemberConfigContext";
import { playStartSound, playStopSound } from "../utils/voiceFeedbackSounds";

export type RecorderState = "idle" | "recording" | "processing";

interface UseVoiceRecorderOptions {
  onTranscription: (text: string) => void;
  onError?: (error: string) => void;
}

export function useVoiceRecorder({
  onTranscription,
  onError,
}: UseVoiceRecorderOptions) {
  const [state, setState] = useState<RecorderState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isMonitoringRef = useRef<boolean>(false);
  const { chatUrl } = useMemberConfig();

  // Use refs to always have latest callbacks (avoids stale closure issues)
  const onTranscriptionRef = useRef(onTranscription);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onTranscriptionRef.current = onTranscription;
  }, [onTranscription]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const clearError = useCallback(() => setError(null), []);

  // Start monitoring audio levels
  const startAudioLevelMonitoring = useCallback((stream: MediaStream) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    // iOS Safari suspends AudioContext by default — must resume after user gesture
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);

    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.3;
    source.connect(analyser);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    isMonitoringRef.current = true;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const updateLevel = () => {
      if (analyserRef.current && isMonitoringRef.current) {
        analyserRef.current.getByteFrequencyData(dataArray);
        // Calculate average level from frequency data
        const sum = dataArray.reduce((a, b) => a + b, 0);
        const average = sum / dataArray.length;
        // Normalize to 0-1 range and amplify significantly for better visibility
        setAudioLevel(Math.min(1, (average / 255) * 8));
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      }
    };

    updateLevel();
  }, []);

  // Stop monitoring audio levels
  const stopAudioLevelMonitoring = useCallback(() => {
    isMonitoringRef.current = false;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);

      // Request microphone access (don't constrain sampleRate — iOS Safari ignores/rejects it)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });

      streamRef.current = stream;

      // Choose best supported format. On iOS Safari, don't specify mimeType —
      // let the browser pick its native format (avoids silent recording failures).
      const options: MediaRecorderOptions = {};
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        options.mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/webm")) {
        options.mimeType = "audio/webm";
      }
      // If neither webm variant is supported (iOS Safari), omit mimeType entirely

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;

        // Use the recorder's actual mimeType (important when we let iOS pick its own)
        const actualMimeType = mediaRecorder.mimeType || "audio/mp4";
        const audioBlob = new Blob(chunksRef.current, { type: actualMimeType });

        // Send to transcription API
        await sendToTranscribe(audioBlob, actualMimeType);
      };

      mediaRecorder.onerror = () => {
        const errorMessage = "Recording error occurred";
        setError(errorMessage);
        onErrorRef.current?.(errorMessage);
        setState("idle");
      };

      // Start recording with 1s timeslice — iOS Safari may not fire
      // ondataavailable without it, resulting in empty recordings
      mediaRecorder.start(1000);
      setState("recording");

      // Play start sound
      playStartSound();

      // Start monitoring audio levels for waveform visualization
      startAudioLevelMonitoring(stream);

    } catch (err) {
      const errorMessage = handlePermissionError(err);
      setError(errorMessage);
      onErrorRef.current?.(errorMessage);
      setState("idle");
    }
  }, [onError]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setState("processing");

      // Play stop sound
      playStopSound();

      // Stop monitoring audio levels
      stopAudioLevelMonitoring();
    }
  }, [stopAudioLevelMonitoring]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    // Stop all tracks to release microphone
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    chunksRef.current = [];
    setState("idle");
    stopAudioLevelMonitoring();
  }, [stopAudioLevelMonitoring]);

  const sendToTranscribe = async (audioBlob: Blob, mimeType: string) => {
    try {
      const formData = new FormData();
      // Map MIME type to file extension Whisper understands
      const extension = mimeType.includes("webm") ? "webm"
        : mimeType.includes("mp4") || mimeType.includes("m4a") || mimeType.includes("aac") ? "m4a"
        : "mp4";
      formData.append("audio", audioBlob, `recording.${extension}`);

      // Debug logging
      console.log('[VoiceRecorder] Sending transcribe request:', {
        blobSize: audioBlob.size,
        blobType: audioBlob.type,
        mimeType,
        extension,
        fileName: `recording.${extension}`,
      });

      // Use agent's transcribe endpoint (auth handled by Supabase cookies)
      const transcribeUrl = `${chatUrl}/transcribe`;
      console.log('[VoiceRecorder] Transcribe URL:', transcribeUrl);

      const response = await fetch(transcribeUrl, {
        method: "POST",
        credentials: "include", // Include cookies for Supabase auth
        body: formData,
      });

      console.log('[VoiceRecorder] Response status:', response.status);
      const data = await response.json();
      console.log('[VoiceRecorder] Response data:', data);

      if (data.success && data.text) {
        onTranscriptionRef.current(data.text);
      } else {
        const errorMessage = data.error || "Transcription failed";
        setError(errorMessage);
        onErrorRef.current?.(errorMessage);
      }
    } catch (err) {
      const errorMessage = "Network error. Please try again.";
      setError(errorMessage);
      onErrorRef.current?.(errorMessage);
    } finally {
      setState("idle");
    }
  };

  const toggleRecording = useCallback(() => {
    if (state === "idle") {
      startRecording();
    } else if (state === "recording") {
      stopRecording();
    }
    // If processing, do nothing - wait for completion
  }, [state, startRecording, stopRecording]);

  return {
    state,
    error,
    audioLevel,
    clearError,
    startRecording,
    stopRecording,
    cancelRecording,
    toggleRecording,
    isRecording: state === "recording",
    isProcessing: state === "processing",
  };
}

// Helper to handle specific permission errors
function handlePermissionError(err: unknown): string {
  if (err instanceof Error) {
    switch (err.name) {
      case "NotAllowedError":
        return "Microphone access denied. Please enable in browser settings.";
      case "NotFoundError":
        return "No microphone found. Please connect a microphone.";
      case "NotReadableError":
        return "Microphone is in use by another application.";
      case "OverconstrainedError":
        return "Could not find a suitable microphone.";
      default:
        return err.message || "Failed to access microphone.";
    }
  }
  return "An unexpected error occurred.";
}
