/**
 * SMPTE Color Bars Preset
 *
 * Standard SMPTE color bars for display calibration and testing.
 */

import type { PresetProps, PresetMetadata } from '../frontend/src/lib/presetTypes';

export const metadata: PresetMetadata = {
  name: 'SMPTE Color Bars',
  description: 'Standard SMPTE color bars (75% intensity)',
  category: 'standard',
  tags: ['color', 'calibration', 'smpte', 'standard'],
  params: {
    intensity: {
      type: 'select',
      default: '75',
      options: ['75', '100'],
      description: 'Color intensity (75% or 100%)',
    },
  },
};

export default function ColorBar({ params = {} }: PresetProps) {
  const intensity = params.intensity || '75';

  // SMPTE Color Bars (75% intensity)
  const colors75 = [
    '#C0C0C0', // White (75%)
    '#C0C000', // Yellow
    '#00C0C0', // Cyan
    '#00C000', // Green
    '#C000C0', // Magenta
    '#C00000', // Red
    '#0000C0', // Blue
  ];

  // SMPTE Color Bars (100% intensity)
  const colors100 = [
    '#FFFFFF', // White (100%)
    '#FFFF00', // Yellow
    '#00FFFF', // Cyan
    '#00FF00', // Green
    '#FF00FF', // Magenta
    '#FF0000', // Red
    '#0000FF', // Blue
  ];

  const colors = intensity === '100' ? colors100 : colors75;

  return (
    <div className="w-full h-full flex">
      {colors.map((color, index) => (
        <div
          key={index}
          className="flex-1"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}
