/**
 * Color conversion utilities
 */

// Convert hue to RGB
export const hueToRgb = (hue: number): {r: number, g: number, b: number} => {
  const h = hue / 60;
  const c = 255;
  const x = 255 * (1 - Math.abs((h % 2) - 1));

  if (h >= 0 && h < 1) return { r: c, g: x, b: 0 };
  if (h >= 1 && h < 2) return { r: x, g: c, b: 0 };
  if (h >= 2 && h < 3) return { r: 0, g: c, b: x };
  if (h >= 3 && h < 4) return { r: 0, g: x, b: c };
  if (h >= 4 && h < 5) return { r: x, g: 0, b: c };
  return { r: c, g: 0, b: x };
};

// Convert RGB to hue
export const rgbToHue = (r: number, g: number, b: number): number => {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  
  if (max === min) return 0;
  
  let h = 0;
  const d = max - min;
  
  if (max === r) {
    h = (g - b) / d + (g < b ? 6 : 0);
  } else if (max === g) {
    h = (b - r) / d + 2;
  } else {
    h = (r - g) / d + 4;
  }
  
  return h * 60;
};

// Get saturation from RGB (0-1)
export const getSaturation = (r: number, g: number, b: number): number => {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  
  if (max === 0) return 0;
  
  return (max - min) / max;
};

// Get brightness from RGB (0-1)
export const getBrightness = (r: number, g: number, b: number): number => {
  r /= 255;
  g /= 255;
  b /= 255;
  
  return Math.max(r, g, b);
};

// Convert HSV to RGB
export const hsvToRgb = (h: number, s: number, v: number): {r: number, g: number, b: number} => {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  
  let r = 0, g = 0, b = 0;
  
  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }
  
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  };
}; 