import { RGBAColor } from './hexToRGBA';

export const rgbaToHex = (rgba: RGBAColor): string => {
  // Ensure RGB values are in the range [0, 255] and round them to the nearest integer
  const r = Math.round(rgba.r * 255);
  const g = Math.round(rgba.g * 255);
  const b = Math.round(rgba.b * 255);

  // Convert RGB values to HEX
  const rHex = r.toString(16).padStart(2, '0');
  const gHex = g.toString(16).padStart(2, '0');
  const bHex = b.toString(16).padStart(2, '0');

  // Convert alpha value to HEX (0 to 255 range) and round
  const aHex = Math.round(rgba.a * 255).toString(16).padStart(2, '0');

  // Concatenate and return the HEX color code
  return `#${rHex}${gHex}${bHex}${aHex !== 'ff' ? aHex : ''}`;
} 