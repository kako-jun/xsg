use super::models::{Order, Playlist, PlaylistSource};
use rand::seq::SliceRandom;
use rand::Rng;

/// Playlist runner
pub struct PlaylistRunner {
    playlist: Playlist,
    sources: Vec<PlaylistSource>,
    current_index: usize,
}

impl PlaylistRunner {
    /// Create a new playlist runner
    pub fn new(playlist: Playlist) -> Self {
        Self {
            playlist,
            sources: Vec::new(),
            current_index: 0,
        }
    }

    /// Prepare playlist sources
    pub fn prepare(&mut self) {
        let mut sources = Vec::new();

        // Add explicit sources
        if let Some(playlist_sources) = &self.playlist.sources {
            sources.extend(playlist_sources.clone());
        }

        // TODO: Add generated sources (pattern_generator integration)
        // if let Some(generator) = &self.playlist.generator {
        //     if generator.enabled {
        //         let generated = self.generate_patterns(generator);
        //         sources.extend(generated);
        //     }
        // }

        // Apply playback order
        match self.playlist.playback.order {
            Order::Shuffle => {
                // Shuffle once
                let mut rng = rand::thread_rng();
                sources.shuffle(&mut rng);
            }
            Order::Sequence | Order::Random => {
                // No preparation needed
            }
        }

        self.sources = sources;
    }

    /// Get next source
    pub fn get_next(&mut self) -> Option<&PlaylistSource> {
        if self.sources.is_empty() {
            return None;
        }

        let source = match self.playlist.playback.order {
            Order::Sequence => {
                // Sequential playback
                let source = self.sources.get(self.current_index);
                self.current_index += 1;

                if self.current_index >= self.sources.len() && self.playlist.playback.loop_playback
                {
                    self.current_index = 0;
                }

                source
            }
            Order::Random => {
                // Random each time
                let mut rng = rand::thread_rng();
                let index = rng.gen_range(0..self.sources.len());
                self.sources.get(index)
            }
            Order::Shuffle => {
                // Shuffled once, then sequential
                let source = self.sources.get(self.current_index);
                self.current_index += 1;

                if self.current_index >= self.sources.len() && self.playlist.playback.loop_playback
                {
                    self.current_index = 0;
                }

                source
            }
        };

        source
    }

    /// Get duration for a source
    pub fn get_duration(&self, source: &PlaylistSource) -> u64 {
        let duration_ms = match source {
            PlaylistSource::Pattern(s) => s.duration,
            PlaylistSource::Url(s) => s.duration,
            PlaylistSource::Image(s) => s.duration,
            PlaylistSource::Inline(s) => s.duration,
        };

        duration_ms
            .or(self.playlist.playback.default_duration)
            .unwrap_or(5000.0) as u64
    }

    /// Check if playlist should continue
    pub fn should_continue(&self) -> bool {
        if self.sources.is_empty() {
            return false;
        }

        // Random order never exhausts: get_next() picks a fresh random source every
        // call and never advances current_index, so there is no "played everything
        // once" terminal state. Random is therefore inherently infinite and the
        // `loop` flag is meaningless for it (#20, resolved as "random = infinite").
        if matches!(self.playlist.playback.order, Order::Random) {
            return true;
        }

        // If looping is enabled, always continue
        if self.playlist.playback.loop_playback {
            return true;
        }

        // If not looping, continue until we've played all items once
        self.current_index < self.sources.len()
    }
}
