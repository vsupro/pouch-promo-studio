import test from 'node:test';
import assert from 'node:assert/strict';
import { googleFonts, canvasFont, fontReady, loadFonts, loadFont } from '../src/fonts.js';

test('five bundled fonts use their actual bold face weights', () => {
  assert.equal(googleFonts.length, 5);
  for (const font of googleFonts) {
    assert.match(canvasFont({fontFamily:font.family,size:80,weight:'900'}),new RegExp(`^${font.weight} 80px`));
  }
  assert.equal(canvasFont({size:80,weight:'700'}),'700 80px "Arial", sans-serif');
});

test('font loading is deduplicated and completed before a face is marked ready', async () => {
  const added=[], loaded=[];
  globalThis.document={fonts:{add(face){added.push(face);}}};
  globalThis.FontFace=class {
    constructor(family,url,descriptors){Object.assign(this,{family,url,descriptors});}
    async load(){loaded.push(this.family);return this;}
  };
  const element={fontFamily:'Montserrat'};
  assert.equal(fontReady(element),false);
  const one=loadFont(element),two=loadFont(element);
  assert.equal(one,two);
  await loadFonts([element,element]);
  assert.equal(fontReady(element),true);
  assert.deepEqual(loaded,['Montserrat']);
  assert.equal(added.length,1);
  assert.equal(added[0].descriptors.weight,'700');
  await loadFont(element);
  assert.equal(added.length,1);
});
