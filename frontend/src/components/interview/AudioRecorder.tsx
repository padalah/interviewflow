import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../common/Button';
import { Mic, MicOff, Volume2 } from 'lucide-react';

interface AudioRecorderProps {
  isActive?: boolean;
  onAudioChunk?: (audioData: ArrayBuffer) => void;
  onRecordingChange?: (isRecording: boolean) => void;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({
  isActive = true,
  onAudioChunk,
  onRecordingChange,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    // Request microphone permission on component mount
    requestMicrophonePermission();
    
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    onRecordingChange?.(isRecording);
  }, [isRecording, onRecordingChange]);

  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      setHasPermission(true);
      streamRef.current = stream;
      setupAudioAnalyser(stream);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setHasPermission(false);
    }
  };

  const setupAudioAnalyser = (stream: MediaStream) => {
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(stream);
    
    analyser.fftSize = 256;
    microphone.connect(analyser);
    analyserRef.current = analyser;
    
    // Start monitoring audio level
    monitorAudioLevel();
  };

  const monitorAudioLevel = () => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    const updateLevel = () => {
      if (!analyserRef.current) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      setAudioLevel(average / 255);
      
      animationRef.current = requestAnimationFrame(updateLevel);
    };
    
    updateLevel();
  };

  const startRecording = async () => {
    if (!streamRef.current) {
      await requestMicrophonePermission();
    }
    
    if (!streamRef.current) return;

    try {
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          // Convert blob to ArrayBuffer for WebSocket transmission
          event.data.arrayBuffer().then((arrayBuffer) => {
            onAudioChunk?.(arrayBuffer);
          });
        }
      };
      
      mediaRecorder.start(100); // Send data every 100ms
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const cleanup = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  if (hasPermission === null) {
    return (
      <div className="text-center p-6">
        <div className="animate-spin h-8 w-8 border-2 border-primary-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600">Requesting microphone access...</p>
      </div>
    );
  }

  if (hasPermission === false) {
    return (
      <div className="text-center p-6">
        <MicOff className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Microphone Access Required</h3>
        <p className="text-gray-600 mb-4">
          Please allow microphone access to participate in the interview.
        </p>
        <Button onClick={requestMicrophonePermission} variant="primary">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="text-center p-6">
      {/* Visual Audio Level Indicator */}
      <div className="relative w-32 h-32 mx-auto mb-6">
        <div 
          className={`w-full h-full rounded-full border-4 transition-all duration-200 flex items-center justify-center ${
            isRecording 
              ? 'border-red-500 bg-red-50 animate-pulse' 
              : 'border-gray-300 bg-gray-50 hover:border-primary-500'
          }`}
          style={{
            transform: isRecording ? `scale(${1 + audioLevel * 0.3})` : 'scale(1)',
          }}
        >
          {isRecording ? (
            <div className="w-8 h-8 bg-red-500 rounded-full animate-pulse"></div>
          ) : (
            <Mic className="w-8 h-8 text-gray-600" />
          )}
        </div>
        
        {/* Audio level bars around the circle */}
        {isRecording && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 bg-red-500 rounded-full transition-all duration-100"
                style={{
                  height: `${audioLevel * 20 + 4}px`,
                  left: '50%',
                  top: '50%',
                  transformOrigin: '50% 64px',
                  transform: `translateX(-50%) rotate(${i * 45}deg)`,
                  opacity: audioLevel > 0.1 ? 1 : 0.3,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Status Text */}
      <p className="text-lg font-medium text-gray-900 mb-2">
        {isRecording ? 'Listening...' : 'Click to start speaking'}
      </p>
      <p className="text-sm text-gray-600 mb-6">
        {isRecording 
          ? 'Speak naturally. The AI will respond when you pause.' 
          : 'Press and hold to record your response.'
        }
      </p>

      {/* Recording Button */}
      <Button
        variant={isRecording ? 'secondary' : 'primary'}
        size="lg"
        icon={isRecording ? Volume2 : Mic}
        onClick={toggleRecording}
        disabled={!isActive}
        className="px-8"
      >
        {isRecording ? 'Speaking...' : 'Start Speaking'}
      </Button>

      {/* Help Text */}
      <div className="mt-4 text-xs text-gray-500">
        <p>Make sure your microphone is working and speak clearly.</p>
      </div>
    </div>
  );
};

export default AudioRecorder;