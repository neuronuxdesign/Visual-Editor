// Define interface for RGBA color
export interface RGBAColor {
  r: number;  // Red component (0 to 1)
  g: number;  // Green component (0 to 1)
  b: number;  // Blue component (0 to 1)
  a: number;  // Alpha component (0 to 1)
}

// Convert HEX color code to RGBA object
export const hexToRgba = (hex: string): RGBAColor => {
  // Remove the leading '#' if present
  hex = hex.replace(/^#/, '');

  // Handle 3-digit and 6-digit HEX codes
  if (hex.length === 4) {
    hex = hex.split('').map((char, index) =>
      index === 0 ? char + char : index === 1 ? char + char : char + char
    ).join('');
  }

  // Extract RGB values from HEX
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Handle optional alpha channel
  const a = hex.length === 8 ? parseInt(hex.substring(6, 8), 16) / 255 : 1;

  // Convert RGB values to [0, 1] range
  return {
    r: r / 255,
    g: g / 255,
    b: b / 255,
    a: a
  };
} 