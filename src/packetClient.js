import { drawPackedDiscount } from './packetRenderer.js';

// One active calculation, one latest preview, plus any requested exports.
// Superseded previews resolve to null; exports always retain their exact snapshot.
export function createPacketRenderer() {
  let worker, active, cache, sequence = 0, disposed = false;
  let queue = [];
  try {
    if (typeof Worker === 'function' && typeof OffscreenCanvas === 'function') {
      worker = new Worker(new URL('./packet.worker.js', import.meta.url), { type: 'module' });
    }
  } catch { /* Browsers without module workers use the same renderer locally. */ }

  function dispatch() {
    if (disposed || active || !queue.length) return;
    active = queue.shift();
    if (worker) worker.postMessage(active.input);
    else {
      // Yield to input/paint before the compatibility fallback does expensive work.
      setTimeout(() => {
        if (disposed) return;
        try {
          const { width, height, element, color } = active.input;
          const canvas = document.createElement('canvas');
          canvas.width = width; canvas.height = height;
          drawPackedDiscount(canvas.getContext('2d'), element, color);
          complete(canvas);
        } catch (error) { fail(error); }
      }, 0);
    }
  }
  function complete(bitmap) {
    cache?.bitmap.close?.();
    cache = { key: active.key, bitmap };
    const job = active; active = null;
    job.resolve(bitmap);
    dispatch();
  }
  function fail(error) {
    const job = active; active = null;
    job?.reject(error);
    dispatch();
  }
  if (worker) {
    worker.onmessage = ({ data }) => {
      if (disposed || !active || data.id !== active.input.id) { data.bitmap?.close(); return; }
      if (data.error) fail(new Error(data.error));
      else complete(data.bitmap);
    };
    worker.onerror = () => {
      worker.terminate(); worker = null;
      if (active) { queue.unshift(active); active = null; }
      dispatch();
    };
  }
  return {
    render(element, color, width, height, { persistent = false } = {}) {
      if (disposed) return Promise.resolve(null);
      const key = JSON.stringify([element, color, width, height]);
      if (cache?.key === key) return Promise.resolve(cache.bitmap);
      const existing = active?.key === key ? active : queue.find(job => job.key === key);
      if (existing) { existing.persistent ||= persistent; return existing.promise; }
      queue = queue.filter(job => {
        if (job.persistent) return true;
        job.resolve(null); return false;
      });
      const job = { key, persistent, input: { id: ++sequence, element, color, width, height } };
      job.promise = new Promise((resolve, reject) => { job.resolve = resolve; job.reject = reject; });
      queue.push(job); dispatch();
      return job.promise;
    },
    dispose() {
      disposed = true;
      worker?.terminate(); cache?.bitmap.close?.();
      active?.resolve(null); queue.forEach(job => job.resolve(null));
      active = null; queue = []; cache = null;
    },
  };
}
