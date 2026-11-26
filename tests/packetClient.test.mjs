import test from 'node:test';
import assert from 'node:assert/strict';

class FakeWorker {
  static instances = [];
  constructor() { this.messages = []; FakeWorker.instances.push(this); }
  postMessage(input) { this.messages.push(input); }
  terminate() { this.terminated = true; }
  finish() {
    const bitmap = { closed: false, close() { this.closed = true; } };
    this.onmessage({ data: { id: this.messages.at(-1).id, bitmap } });
    return bitmap;
  }
}
globalThis.Worker = FakeWorker;
globalThis.OffscreenCanvas = class {};
const { createPacketRenderer } = await import('../src/packetClient.js');
const element = { text: '50%', size: 590, x: 960, y: 580 };

test('coalesces pending previews, retains exports, and caches identical frames', async () => {
  const renderer = createPacketRenderer(), worker = FakeWorker.instances.at(-1);
  const first = renderer.render(element, '#a1ef00', 1920, 1080);
  const same = renderer.render(element, '#a1ef00', 1920, 1080);
  assert.equal(first, same);
  const superseded = renderer.render({ ...element, x: 970 }, '#a1ef00', 1920, 1080);
  const exportFrame = renderer.render({ ...element, x: 980 }, '#a1ef00', 1920, 1080, { persistent: true });
  assert.equal(await superseded, null);
  const latest = renderer.render({ ...element, x: 990 }, '#a1ef00', 1920, 1080);
  assert.equal(worker.messages.length, 1);
  const firstBitmap = worker.finish();
  assert.equal(await first, firstBitmap);
  assert.equal(worker.messages[1].element.x, 980);
  const exportBitmap = worker.finish();
  assert.equal(await exportFrame, exportBitmap);
  assert.equal(firstBitmap.closed, true);
  assert.equal(worker.messages[2].element.x, 990);
  const latestBitmap = worker.finish();
  assert.equal(await latest, latestBitmap);
  assert.equal(await renderer.render({ ...element, x: 990 }, '#a1ef00', 1920, 1080), latestBitmap);
  assert.equal(worker.messages.length, 3);
  renderer.dispose();
  assert.equal(latestBitmap.closed, true);
  assert.equal(worker.terminated, true);
});

test('disposal settles queued requests and releases late bitmaps', async () => {
  const renderer = createPacketRenderer(), worker = FakeWorker.instances.at(-1);
  const first = renderer.render(element, '#a1ef00', 1080, 1920);
  const queued = renderer.render({ ...element, x: 300 }, '#a1ef00', 1080, 1920);
  renderer.dispose();
  assert.equal(await first, null);
  assert.equal(await queued, null);
  assert.equal(worker.finish().closed, true);
  assert.equal(await renderer.render(element, '#a1ef00', 1080, 1920), null);
});
