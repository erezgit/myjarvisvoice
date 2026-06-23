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
   * Check if ANY audio is currently playing globally
   */
  isAnyPlaying(): boolean {
    return this.currentlyPlayingUrl !== null;
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
  }

  /**
   * Mark a voice message as paused (clears global but allows resume)
   */
  markAsPaused(voiceId?: string): void {
    if (!voiceId) return;
    this.playingMessages.delete(voiceId);
    if (this.currentlyPlayingUrl === voiceId) {
      this.currentlyPlayingUrl = null;
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
    }
  }

  /**
   * Clear all tracking data
   */
  clear(): void {
    this.playedVoiceIds.clear();
    this.playingMessages.clear();
    this.currentlyPlayingUrl = null;
  }
}

// Export singleton instance
export const voicePlayedTracker = new VoicePlayedTracker();
