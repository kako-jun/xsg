/**
 * Checkerboard Preset
 *
 * Classic black and white checkerboard pattern for pixel alignment testing.
 */

import { useEffect, useRef } from 'react';
import type { PresetProps, PresetMetadata } from '../frontend/src/lib/presetTypes';

export const metadata: PresetMetadata = {
  name: 'Checkerboard',
  description: 'Black and white checkerboard pattern',
  category: 'standard',
  tags: ['checker', 'alignment', 'pixel', 'test'],
  params: {
    size: {
      type: 'number',
      default: 50,
      min: 1,
      max: 500,
      description: 'Square size in pixels',
    },
    color1: {
      type: 'color',
      default: '#000000',
      description: 'First color',
    },
    color2: {
      type: 'color',
      default: '#FFFFFF',
      description: 'Second color',
    },
  },
};

export default function Checker({ params = {} }: PresetProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const squareSize = params.size || 50;
  const color1 = params.color1 || '#000000';
  const color2 = params.color2 || '#FFFFFF';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const cols = Math.ceil(canvas.width / squareSize);
      const rows = Math.ceil(canvas.height / squareSize);

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          ctx.fillStyle = (row + col) % 2 === 0 ? color1 : color2;
          ctx.fillRect(
            col * squareSize,
            row * squareSize,
            squareSize,
            squareSize
          );
        }
      }
    };

    resize();
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
    };
  }, [squareSize, color1, color2]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
