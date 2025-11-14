"""
Playlist Runner

Manages playlist playback with orthogonal design:
- Data source (sources vs generator)
- Playback order (sequence vs random vs shuffle)
- Loop mode (true vs false)
"""

import asyncio
import random
from typing import Callable, Dict, List, Optional

from .playlist_models import Playlist, PlaylistSource
from .pattern_loader import load_pattern
from .models import XSGPattern


class PlaylistRunner:
    """Playlist runner with orthogonal playback control"""

    def __init__(self, playlist: Playlist):
        """
        Initialize playlist runner

        Args:
            playlist: Playlist configuration
        """
        self.playlist = playlist
        self.playback = playlist.playback
        self.sources: List[PlaylistSource] = []
        self.current_index = 0
        self.running = False

    def prepare(self) -> None:
        """
        Prepare playlist sources

        Combines explicit sources and generated sources,
        then applies playback order.
        """
        sources = []

        # Add explicit sources
        if self.playlist.sources:
            sources.extend(self.playlist.sources)

        # Add generated sources
        if self.playlist.generator and self.playlist.generator.enabled:
            generated = self._generate_patterns()
            sources.extend(generated)

        # Apply playback order
        if self.playback.order == "shuffle":
            # Shuffle once
            random.shuffle(sources)
        # sequence and random don't need preparation

        self.sources = sources

    def _generate_patterns(self) -> List[PlaylistSource]:
        """
        Generate random patterns based on generator constraints

        Returns:
            List of InlineSource items
        """
        from .pattern_generator import generate_random_pattern

        generator = self.playlist.generator
        count = int(generator.count) if generator.count else 10
        duration = generator.duration or 3000
        constraints = generator.constraints

        generated = []
        for i in range(count):
            # Generate random pattern
            pattern_data = generate_random_pattern(constraints)

            # Create InlineSource
            from .playlist_models import InlineSource

            source = InlineSource(
                type="inline",
                pattern=pattern_data,
                duration=duration,
            )
            generated.append(source)

        return generated

    def get_next(self) -> Optional[PlaylistSource]:
        """
        Get next source based on playback order

        Returns:
            Next source or None if playlist is empty
        """
        if not self.sources:
            return None

        order = self.playback.order

        if order == "sequence" or order == "shuffle":
            # Sequential playback (shuffle is pre-shuffled)
            source = self.sources[self.current_index]
            self.current_index = (self.current_index + 1) % len(self.sources)
        elif order == "random":
            # Random selection each time
            source = random.choice(self.sources)
        else:
            source = self.sources[0]

        return source

    def get_duration(self, source: PlaylistSource) -> float:
        """
        Get duration for a source (in milliseconds)

        Args:
            source: Playlist source

        Returns:
            Duration in milliseconds
        """
        if source.duration is not None:
            return source.duration

        # Use default duration
        return self.playback.defaultDuration or 5000

    async def run(
        self,
        on_change: Callable[[PlaylistSource], asyncio.Future],
    ) -> None:
        """
        Run playlist

        Args:
            on_change: Callback when source changes (async)
        """
        self.running = True
        self.prepare()

        if not self.sources:
            print("[Playlist] No sources to play")
            return

        loop = self.playback.loop if self.playback.loop is not None else True

        while self.running:
            source = self.get_next()
            if source is None:
                break

            # Get duration
            duration_ms = self.get_duration(source)

            # Notify change
            await on_change(source)

            # Wait for duration
            await asyncio.sleep(duration_ms / 1000)

            # Check loop
            if not loop and self.current_index == 0:
                # Finished one cycle, stop
                break

    def stop(self) -> None:
        """Stop playlist playback"""
        self.running = False


def load_playlist(file_path: str) -> Playlist:
    """
    Load playlist from YAML/JSON file

    Args:
        file_path: Path to playlist file

    Returns:
        Validated Playlist instance
    """
    import yaml
    import json
    from pathlib import Path

    file_path_obj = Path(file_path)

    if not file_path_obj.exists():
        raise FileNotFoundError(f"Playlist file not found: {file_path}")

    # Read content
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Parse based on extension
    suffix = file_path_obj.suffix.lower()
    if suffix in (".yaml", ".yml"):
        data = yaml.safe_load(content)
    elif suffix == ".json":
        data = json.loads(content)
    else:
        # Try YAML first
        try:
            data = yaml.safe_load(content)
        except yaml.YAMLError:
            data = json.loads(content)

    # Validate with Pydantic
    return Playlist(**data)
