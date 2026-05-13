'use client';

import { useRef, useEffect, useCallback } from 'react';

interface WaveformVisualizerProps {
  isRecording: boolean;
  analyserNode: AnalyserNode | null;
}

/**
 * WaveformVisualizer — Renders a real-time audio waveform on a canvas.
 * Shows a gentle idle animation when not recording, and live frequency data when recording.
 */
export default function WaveformVisualizer({ isRecording, analyserNode }: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  // Active waveform: draws frequency bars from AnalyserNode
  const drawActive = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserNode) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
    analyserNode.getByteFrequencyData(dataArray);

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const barCount = 80;
    const barWidth = w / barCount - 2;
    const centerY = h / 2;

    for (let i = 0; i < barCount; i++) {
      const dataIndex = Math.floor((i / barCount) * dataArray.length);
      const value = dataArray[dataIndex] / 255;
      const barHeight = value * centerY * 0.9;

      const gradient = ctx.createLinearGradient(0, centerY - barHeight, 0, centerY + barHeight);
      gradient.addColorStop(0, '#FFC04D');
      gradient.addColorStop(0.5, '#F5A623');
      gradient.addColorStop(1, '#D48806');
      ctx.fillStyle = gradient;

      ctx.beginPath();
      ctx.roundRect(i * (barWidth + 2), centerY - barHeight, barWidth, barHeight * 2, 2);
      ctx.fill();
    }

    animFrameRef.current = requestAnimationFrame(drawActive);
  }, [analyserNode]);

  // Start active waveform when recording begins
  useEffect(() => {
    if (isRecording && analyserNode) {
      cancelAnimationFrame(animFrameRef.current);
      drawActive();
    }
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isRecording, analyserNode, drawActive]);

  // Idle waveform: sine-wave animation when not recording
  useEffect(() => {
    if (!isRecording) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let phase = 0;
      const drawIdle = () => {
        phase += 0.02;
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        const barCount = 80;
        const barWidth = w / barCount - 2;
        const centerY = h / 2;

        for (let i = 0; i < barCount; i++) {
          const value = (Math.sin(phase + i * 0.15) * 0.3 + 0.3) * 0.15;
          const barHeight = value * centerY;

          const gradient = ctx.createLinearGradient(0, centerY - barHeight, 0, centerY + barHeight);
          gradient.addColorStop(0, 'rgba(255, 192, 77, 0.4)');
          gradient.addColorStop(1, 'rgba(245, 166, 35, 0.2)');
          ctx.fillStyle = gradient;

          ctx.beginPath();
          ctx.roundRect(i * (barWidth + 2), centerY - barHeight, barWidth, barHeight * 2, 2);
          ctx.fill();
        }

        animFrameRef.current = requestAnimationFrame(drawIdle);
      };
      drawIdle();
      return () => cancelAnimationFrame(animFrameRef.current);
    }
  }, [isRecording]);

  return (
    <div className="w-full max-w-2xl h-24 lg:h-32 my-6">
      <canvas
        ref={canvasRef}
        width={800}
        height={160}
        className="w-full h-full"
      />
    </div>
  );
}
