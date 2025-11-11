/**
 * Solid Color Preset
 *
 * Simple solid color fill for basic display testing.
 */

import type { PresetProps, PresetMetadata } from '../frontend/src/lib/presetTypes';

export const metadata: PresetMetadata = {
  name: 'Solid Color',
  description: 'Solid color fill',
  category: 'standard',
  tags: ['solid', 'color', 'basic'],
  params: {
    color: {
      type: 'color',
      default: '#000000',
      description: 'Fill color',
    },
  },
};

export default function Solid({ params = {} }: PresetProps) {
  const color = params.color || '#000000';

  return (
    <div
      className="w-full h-full"
      style={{ backgroundColor: color }}
    />
  );
}
