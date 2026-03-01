import { useEffect, useRef } from "react";

interface AudioWaveformProps {
  stream?: MediaStream | null;
  audioUrl?: string;
  isRecording?: boolean;
  isPlaying?: boolean;
  className?: string;
}

export function AudioWaveform({
  stream,
  audioUrl,
  isRecording = false,
  isPlaying = false,
  className = ""
}: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const analyzerRef = useRef<AnalyserNode>();
  const audioContextRef = useRef<AudioContext>();

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Setup for live recording
    if (stream && isRecording) {
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const analyzer = audioContext.createAnalyser();
      analyzerRef.current = analyzer;

      analyzer.fftSize = 128; // Smaller FFT for better mobile performance
      analyzer.smoothingTimeConstant = 0.8; // Smooth out fluctuations
      const bufferLength = analyzer.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyzer);

      // Use bars instead of waveform for better Android rendering
      const numBars = 32; // Fixed number of bars
      const barWidth = (canvas.offsetWidth / numBars) * 0.8; // 80% width with gaps
      const barGap = (canvas.offsetWidth / numBars) * 0.2;

      const draw = () => {
        animationRef.current = requestAnimationFrame(draw);
        analyzer.getByteFrequencyData(dataArray); // Use frequency data for bars

        ctx.fillStyle = "hsl(var(--background))";
        ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

        // Draw centered bars
        for (let i = 0; i < numBars; i++) {
          const dataIndex = Math.floor((i / numBars) * bufferLength);
          const amplitude = dataArray[dataIndex] / 255;
          
          // Enhance small amplitudes for visibility
          const enhancedAmplitude = Math.max(0.05, amplitude);
          const barHeight = enhancedAmplitude * canvas.offsetHeight * 0.9;
          
          const x = i * (barWidth + barGap);
          const y = (canvas.offsetHeight - barHeight) / 2;

          ctx.fillStyle = "hsl(var(--primary))";
          ctx.fillRect(x, y, barWidth, barHeight);
        }
      };

      draw();
    }
    // Setup for playback
    else if (audioUrl && isPlaying) {
      const audioElement = document.querySelector<HTMLAudioElement>(`audio[src="${audioUrl}"]`);
      if (!audioElement || !canvasRef.current) return;

      // Check if audio element already has a source node to prevent duplicate creation
      const audioContext = new AudioContext();
      let source: MediaElementAudioSourceNode;

      try {
        source = audioContext.createMediaElementSource(audioElement);
      } catch (error) {
        // Element already has a source node, skip visualization
        console.warn('Audio element already connected to audio graph');
        audioContext.close();
        return;
      }

      audioContextRef.current = audioContext;
      const analyzer = audioContext.createAnalyser();
      analyzerRef.current = analyzer;

      analyzer.fftSize = 256;
      const bufferLength = analyzer.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      // Connect audio element to analyzer
      source.connect(analyzer);
      analyzer.connect(audioContext.destination);

      const draw = () => {
        animationRef.current = requestAnimationFrame(draw);
        analyzer.getByteFrequencyData(dataArray);

        ctx.fillStyle = "hsl(var(--background))";
        ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

        const barWidth = (canvas.offsetWidth / bufferLength) * 2.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          barHeight = (dataArray[i] / 255) * canvas.offsetHeight;

          const hue = 200 + (i / bufferLength) * 60;
          ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
          ctx.fillRect(x, canvas.offsetHeight - barHeight, barWidth, barHeight);

          x += barWidth + 1;
        }
      };

      draw();
    }
    // Static waveform (not recording or playing)
    else {
      ctx.fillStyle = "hsl(var(--muted))";
      ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      ctx.strokeStyle = "hsl(var(--muted-foreground) / 0.3)";
      ctx.lineWidth = 2;
      ctx.beginPath();

      // Draw a simple static wave pattern
      const amplitude = canvas.offsetHeight / 4;
      const frequency = 0.02;

      for (let x = 0; x < canvas.offsetWidth; x++) {
        const y = canvas.offsetHeight / 2 + Math.sin(x * frequency) * amplitude;
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close();
      }
    };
  }, [stream, audioUrl, isRecording, isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full rounded ${className}`}
      style={{ height: "60px" }}
    />
  );
}