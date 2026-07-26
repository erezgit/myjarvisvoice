/**
 * VoicePlayedTracker - Singleton to prevent duplicate voice playback during React re-renders
 *
 * Problem: React component re-renders cause audio elements to unmount/remount,
 * resulting in AbortError when voice playback is interrupted.
 *
 * Solution: Global state tracking ensures each voice file plays exactly once,
 * regardless of how many times components mount/unmount.
 */
class VoicePlayedTracker {
  private playedVoiceIds = new Set<string>();
  private playingMessages = new Set<string>();
  private currentlyPlayingUrl: string | null = null;
  private currentlyPlayingSince = 0;

  /**
   * Longest a single message may hold the global playback lock.
   *
   * The lock is a mutex: while it is held, BOTH auto-play paths bail out
   * early (`if (isAnyPlaying()) return`). It used to be released only by the
   * audio element's `ended` event, so any path that started playback without
   * reaching the end — an unmount mid-play, a decode error, a sleep/wake, or
   * simply the user pressing pause — stranded it forever. From that moment
   * every later voice message was silently skipped with no sound and no log,
   * and only restarting the app (which recreates this singleton) recovered it.
   *
   * Voice messages are capped at ~1500 chars ≈ 2 minutes, so a lock held
   * beyond 3 minutes is by definition stale. Expiring it makes the whole
   * class of bug self-healing rather than fixing the three paths we happen
   * to have thought of.
   */
  private static readonly LOCK_MAX_AGE_MS = 180_000;

  /**
   * Check if a voice message has already been played or is currently playing
   */
  hasPlayed(voiceId: string): boolean {
    return this.playedVoiceIds.has(voiceId) || this.playingMessages.has(voiceId);
  }

  /** Alias for hasPlayed */
  hasBeenPlayed(voiceId: string): boolean {
    return this.hasPlayed(voiceId);
  }

  /**
   * Check if ANY audio is currently playing globally.
   *
   * Self-healing: a lock older than LOCK_MAX_AGE_MS is treated as stale and
   * dropped, so a missed release can never silence the app indefinitely.
   */
  isAnyPlaying(): boolean {
    if (this.currentlyPlayingUrl === null) return false;

    if (Date.now() - this.currentlyPlayingSince > VoicePlayedTracker.LOCK_MAX_AGE_MS) {
      console.warn(
        '[voicePlayedTracker] stale playback lock held by',
        this.currentlyPlayingUrl,
        `for ${Math.round((Date.now() - this.currentlyPlayingSince) / 1000)}s — releasing`,
      );
      this.playingMessages.delete(this.currentlyPlayingUrl);
      this.currentlyPlayingUrl = null;
      this.currentlyPlayingSince = 0;
      return false;
    }

    return true;
  }

  /**
   * Release the global lock without marking the message played.
   * Safe to call unconditionally — only releases if this id holds the lock.
   * Use on error, on unmount, and on pause.
   */
  releaseLock(voiceId?: string): void {
    if (!voiceId) return;
    this.playingMessages.delete(voiceId);
    if (this.currentlyPlayingUrl === voiceId) {
      this.currentlyPlayingUrl = null;
      this.currentlyPlayingSince = 0;
    }
  }

  /**
   * Get the URL of the currently playing audio
   */
  getCurrentlyPlaying(): string | null {
    return this.currentlyPlayingUrl;
  }

  /**
   * Mark a voice message as currently playing
   */
  markAsPlaying(voiceId?: string): void {
    if (!voiceId) return;
    this.playingMessages.add(voiceId);
    this.currentlyPlayingUrl = voiceId;
    this.currentlyPlayingSince = Date.now();
  }

  /**
   * Mark a voice message as paused (clears global but allows resume)
   */
  markAsPaused(voiceId?: string): void {
    if (!voiceId) return;
    this.playingMessages.delete(voiceId);
    if (this.currentlyPlayingUrl === voiceId) {
      this.currentlyPlayingUrl = null;
      this.currentlyPlayingSince = 0;
    }
    // Note: Does NOT add to playedVoiceIds - user can resume
  }

  /**
   * Mark a voice message as completed (successfully played to end)
   */
  markAsPlayed(voiceId?: string): void {
    if (!voiceId) return;
    this.playingMessages.delete(voiceId);
    this.playedVoiceIds.add(voiceId);
    if (this.currentlyPlayingUrl === voiceId) {
      this.currentlyPlayingUrl = null;
      this.currentlyPlayingSince = 0;
    }
  }

  /**
   * Mark a voice message as failed (error or interrupted)
   * Prevents retry attempts that could cause loops
   */
  markAsFailed(voiceId?: string): void {
    if (!voiceId) return;
    this.playingMessages.delete(voiceId);
    this.playedVoiceIds.add(voiceId);
    if (this.currentlyPlayingUrl === voiceId) {
      this.currentlyPlayingUrl = null;
      this.currentlyPlayingSince = 0;
    }
  }

  /**
   * Clear all tracking data
   */
  clear(): void {
    this.playedVoiceIds.clear();
    this.playingMessages.clear();
    this.currentlyPlayingUrl = null;
    this.currentlyPlayingSince = 0;
  }
}

// Export singleton instance
export const voicePlayedTracker = new VoicePlayedTracker();
