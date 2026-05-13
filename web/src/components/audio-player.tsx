'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Play, Pause } from 'lucide-react';
import { getAudioBlob } from '@/services/db';
import { formatDuration } from '@/lib/constants';

interface AudioPlayerProps {
  noteId: string;
  duration: number;
  audioUrl?: string;
  onTimeUpdate?: (currentTime: number) => void;
  onSeek?: (time: number) => void;
}

/**
 * AudioPlayer — Self-contained audio playback component.
 * Loads audio from R2 → IndexedDB → session URL with automatic fallback.
 * Exposes seek handler for external segment click navigation.
 */
export default function AudioPlayer({ noteId, duration, audioUrl, onTimeUpdate }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playProgress, setPlayProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  // Load audio: R2 → IndexedDB → session URL
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const r2Url = `/api/audio/${noteId}`;
    fetch(r2Url, { method: 'HEAD' }).then(res => {
      if (res.ok) { audio.src = r2Url; return; }
      throw new Error('Not in R2');
    }).catch(() => {
      getAudioBlob(noteId).then(blob => {
        if (blob) { audio.src = URL.createObjectURL(blob); }
        else if (audioUrl) { audio.src = audioUrl; }
      }).catch(() => {
        if (audioUrl) audio.src = audioUrl;
      });
    });
  }, [noteId, audioUrl]);

  // Progress tracking
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration) setPlayProgress((audio.currentTime / audio.duration) * 100);
      onTimeUpdate?.(audio.currentTime);
    };
    const onEnd = () => { setIsPlaying(false); setPlayProgress(0); setCurrentTime(0); };
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);
    return () => { audio.removeEventListener('timeupdate', onTime); audio.removeEventListener('ended', onEnd); };
  }, [onTimeUpdate]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audio.src) return;
    if (isPlaying) { audio.pause(); } else { audio.play().catch(() => {}); }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio || !audio.src) return;
    audio.currentTime = time;
    if (!isPlaying) { audio.play().catch(() => {}); setIsPlaying(true); }
  }, [isPlaying]);

  const cyclePlaybackRate = () => {
    const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const idx = rates.indexOf(playbackRate);
    const next = rates[(idx + 1) % rates.length];
    setPlaybackRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  // Expose seek for parent to use (segment click navigation)
  useEffect(() => {
    // Store seek function on a custom attribute for parent access
    const el = audioRef.current;
    if (el) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (el as any).__seek = seek;
    }
  }, [seek]);

  return (
    <>
      <audio ref={audioRef} preload="metadata" id={`audio-player-${noteId}`} />

      {/* Player Bar */}
      <div className="card p-4 mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-[var(--color-primary)] flex items-center justify-center flex-shrink-0 cursor-pointer hover:brightness-110 transition-all"
          >
            {isPlaying
              ? <Pause className="w-4 h-4 text-black" />
              : <Play className="w-4 h-4 text-black ml-0.5" />}
          </button>

          <div className="flex-1 min-w-0">
            <div
              className="h-1.5 bg-[var(--color-bg-surface)] rounded-full cursor-pointer group"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const audio = audioRef.current;
                if (audio && audio.duration) {
                  const pct = (e.clientX - rect.left) / rect.width;
                  seek(pct * audio.duration);
                }
              }}
            >
              <div
                className="h-full bg-[var(--color-primary)] rounded-full transition-all relative"
                style={{ width: `${playProgress}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[var(--color-primary)] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>

            <div className="flex justify-between mt-1.5 text-[10px] text-[var(--color-text-tertiary)]">
              <span>{formatDuration(Math.round(currentTime))}</span>
              <span>{formatDuration(duration)}</span>
            </div>
          </div>

          <button
            onClick={cyclePlaybackRate}
            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer flex-shrink-0"
          >
            {playbackRate}×
          </button>
        </div>
      </div>
    </>
  );
}

/**
 * Helper: Get the seek function from an AudioPlayer by noteId.
 * Usage: seekAudioPlayer('noteId', timeInSeconds)
 */
export function seekAudioPlayer(noteId: string, time: number) {
  const el = document.getElementById(`audio-player-${noteId}`) as HTMLAudioElement | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (el && (el as any).__seek) { (el as any).__seek(time); }
}
