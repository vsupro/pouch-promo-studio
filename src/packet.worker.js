import { drawPackedDiscount } from './packetRenderer.js';
import { loadFont } from './fonts.js';

let surface;
self.onmessage = async ({ data: { id, element, color, width, height } }) => {
  try {
    await loadFont(element);
    if (!surface || surface.width !== width || surface.height !== height) {
      surface = new OffscreenCanvas(width, height);
    }
    const context = surface.getContext('2d');
    context.clearRect(0, 0, width, height);
    drawPackedDiscount(context, element, color);
    const bitmap = surface.transferToImageBitmap();
    self.postMessage({ id, bitmap }, [bitmap]);
  } catch (error) {
    self.postMessage({ id, error: error.message });
  }
};
