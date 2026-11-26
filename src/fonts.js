export const googleFonts = [
  { family: 'Anton', weight: '400', url: new URL('./assets/fonts/anton.ttf', import.meta.url).href },
  { family: 'Archivo Black', weight: '400', url: new URL('./assets/fonts/archivo-black.ttf', import.meta.url).href },
  { family: 'Barlow Condensed', weight: '700', url: new URL('./assets/fonts/barlow-condensed.ttf', import.meta.url).href },
  { family: 'Montserrat', weight: '700', url: new URL('./assets/fonts/montserrat.ttf', import.meta.url).href },
  { family: 'Space Grotesk', weight: '700', url: new URL('./assets/fonts/space-grotesk.ttf', import.meta.url).href },
];
const pending = new Map(), loaded = new Set();
export const fontDefinition = family => googleFonts.find(font => font.family === family);
export const fontReady = element => !fontDefinition(element.fontFamily) || loaded.has(element.fontFamily);
export function canvasFont(element, size = element.size) {
  const family = element.fontFamily || 'Arial';
  const weight = fontDefinition(family)?.weight || element.weight;
  return `${weight} ${size}px "${family}", sans-serif`;
}
export function loadFont(element) {
  const definition = fontDefinition(element.fontFamily);
  if (!definition || loaded.has(definition.family)) return Promise.resolve();
  if (!pending.has(definition.family)) {
    const promise = new FontFace(definition.family, `url("${definition.url}")`, { weight: definition.weight })
      .load().then(face => {
        const fontSet = typeof document === 'undefined' ? self.fonts : document.fonts;
        fontSet.add(face); loaded.add(definition.family);
      }).catch(error => { pending.delete(definition.family); throw error; });
    pending.set(definition.family, promise);
  }
  return pending.get(definition.family);
}
export const loadFonts = elements => Promise.all(elements.map(loadFont));
