import assert from 'node:assert/strict';
import { loadModule } from './load_source.mjs';

const { startAtHome } = await loadModule('src/startAtHome.ts');
function browserStub(hash = '#about') {
  const events = new Map();
  const calls = [];
  const state = { preserved: 'user history state' };
  const page = {
    location: { pathname: '/portfolio/', search: '?preview=1', hash },
    history: {
      state,
      scrollRestoration: 'auto',
      replaceState(nextState, title, url) {
        calls.push({ nextState, title, url });
        page.location.hash = new URL(url, 'http://localhost').hash;
      },
    },
    scrollTo(options) { calls.push(options); },
    addEventListener(type, listener) {
      if (!events.has(type)) events.set(type, new Set());
      events.get(type).add(listener);
    },
    removeEventListener(type, listener) { events.get(type)?.delete(listener); },
    emit(type, event = {}) { for (const listener of [...(events.get(type) ?? [])]) listener(event); },
  };
  return { page, calls, events, state };
}

for (const hash of ['', '#home', '#about', '#contact']) {
  const { page, calls, events, state } = browserStub(hash);
  startAtHome(page);
  assert.equal(page.history.scrollRestoration, 'manual');
  assert.deepEqual(calls[0], { nextState: state, title: '', url: '/portfolio/?preview=1#home' });
  assert.deepEqual(calls[1], { top: 0, left: 0, behavior: 'instant' });
  page.emit('pageshow', { persisted: false });
  assert.equal(calls.length, 3, 'Fresh load completes at home');
  page.location.hash = '#about';
  page.emit('hashchange');
  page.emit('pageshow', { persisted: true });
  assert.equal(calls.length, 3, 'Later chapter navigation and cached returns are not reset');
  assert.ok([...events.values()].every(listeners => listeners.size === 0), 'Startup listeners cleaned up');
}
for (const input of ['wheel', 'touchstart', 'pointerdown', 'keydown', 'hashchange']) {
  const { page, calls } = browserStub();
  startAtHome(page);
  page.emit(input);
  page.emit('pageshow', { persisted: false });
  assert.equal(calls.length, 2, `Do not drag user back after ${input}`);
}
const cached = browserStub();
startAtHome(cached.page);
cached.page.emit('pageshow', { persisted: true });
assert.equal(cached.calls.length, 2, 'No late reset on back-forward cache event');
console.log('PASS: fresh/reload starts at home; pathname/query/history state preserved; input and later navigation respected.');
