export const getLuminance = (hex: string) => {
  if (!hex) return 0;
  const c = hex.startsWith('#') ? hex.substring(1) : hex;
  if (c.length !== 6 && c.length !== 3) return 0;
  let r, g, b;
  if (c.length === 3) {
    r = parseInt(c[0] + c[0], 16);
    g = parseInt(c[1] + c[1], 16);
    b = parseInt(c[2] + c[2], 16);
  } else {
    r = parseInt(c.substring(0, 2), 16);
    g = parseInt(c.substring(2, 4), 16);
    b = parseInt(c.substring(4, 6), 16);
  }
  return 0.299 * r + 0.587 * g + 0.114 * b;
};

export const calculateTagAutoFontSize = (name: string, width: number, height: number): number => {
  const len = Math.max(name.length, 1);
  const availW = Math.max(width - 16, 20);
  const availH = Math.max(height - 12, 16);
  // Single line fit vs 2 line fit
  const singleLine = Math.floor(availW / (len * 0.56));
  const twoLine = Math.floor((availW * 1.85) / (len * 0.56));
  const bestFit = Math.max(singleLine, Math.min(13, twoLine));
  return Math.max(7, Math.min(18, Math.min(Math.floor(availH * 0.46), bestFit)));
};
