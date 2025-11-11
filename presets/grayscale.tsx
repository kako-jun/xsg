/**
 * Grayscale Gradient Preset
 *
 * Stepped grayscale gradient for display gamma and brightness calibration.
 */

import type { PresetProps, PresetMetadata } from '../frontend/src/lib/presetTypes';

export const metadata: PresetMetadata = {
  name: 'Grayscale Gradient',
  description: 'Stepped grayscale gradient for gamma calibration',
  category: 'standard',
  tags: ['grayscale', 'gradient', 'gamma', 'calibration'],
  params: {
    steps: {
      type: 'number',
      default: 16,
      min: 2,
      max: 256,
      description: 'Number of gray steps',
    },
    direction: {
      type: 'select',
      default: 'horizontal',
      options: ['horizontal', 'vertical'],
      description: 'Gradient direction',
    },
    reverse: {
      type: 'boolean',
      default: false,
      description: 'Reverse gradient direction',
    },
  },
};

export default function GrayScale({ params = {} }: PresetProps) {
  const steps = params.steps || 16;
  const direction = params.direction || 'horizontal';
  const reverse = params.reverse || false;

  const grayLevels = Array.from({ length: steps }, (_, i) => {
    const index = reverse ? steps - 1 - i : i;
    const level = Math.floor((255 / (steps - 1)) * index);
    return `rgb(${level}, ${level}, ${level})`;
  });

  const isHorizontal = direction === 'horizontal';

  return (
    <div className={`w-full h-full flex ${isHorizontal ? '' : 'flex-col'}`}>
      {grayLevels.map((color, index) => (
        <div
          key={index}
          className="flex-1"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}
