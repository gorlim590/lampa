'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const installProbe = require('../audit/settings/phase6-browser/startup-probe.js');

function eventTarget(target = {}) {
    const listeners = Object.create(null);
    target.addEventListener = (name, fn) => { (listeners[name] || (listeners[name] = [])).push(fn); };
    target.removeEventListener = (name, fn) => { listeners[name] = (listeners[name] || []).filter(item => item !== fn); };
    target.dispatch = (name, event = {}) => (listeners[name] || []).slice().forEach(fn => fn(event));
    target.listenerCount = () => Object.values(listeners).reduce((count, list) => count + list.length, 0);
    return target;
}

function element(classNames = '', children = []) {
    const node = {
        nodeType: 1,
        className: classNames,
        children,
        parentElement: null,
        getClientRects: () => [{ width: 120, height: 180 }],
        checkVisibility: () => true,
        matches(selector) {
            return selector.split(',').some(part => {
                const classes = part.trim().split('.').filter(Boolean);
                return classes.length && classes.every(name => (` ${this.className} `).includes(` ${name} `));
            });
        },
        closest(selector) {
            let current = this;
            while (current) { if (current.matches && current.matches(selector)) return current; current = current.parentElement; }
            return null;
        },
        querySelectorAll(selector) {
            const found = [];
            function walk(parent) { (parent.children || []).forEach(child => { if (child.matches && child.matches(selector)) found.push(child); walk(child); }); }
            walk(this); return found;
        }
    };
    children.forEach(child => { child.parentElement = node; });
    return node;
}

function fixture() {
    let time = 0;
    const doc = eventTarget({ readyState: 'loading' });
    const body = element('');
    body.classList = { contains: name => (` ${body.className} `).includes(` ${name} `) };
    const documentElement = element('', [body]);
    const observers = [];
    class MutationObserverMock {
        constructor(callback) { this.callback = callback; this.disconnected = false; observers.push(this); }
        observe() {}
        disconnect() { this.disconnected = true; }
        emit(records = []) { if (!this.disconnected) this.callback(records); }
    }
    class PerformanceObserverMock {
        constructor(callback) { this.callback = callback; this.disconnected = false; observers.push(this); }
        observe(options) { this.type = options.type; }
        disconnect() { this.disconnected = true; }
        emit(entries) { if (!this.disconnected) this.callback({ getEntries: () => entries }); }
    }
    let nextFrame = 0;
    const pendingFrames = new Map();
    const win = eventTarget({
        performance: { now: () => time, setTime: value => { time = value; } },
        location: { href: 'https://siaivo.isroot.in/' },
        MutationObserver: MutationObserverMock,
        PerformanceObserver: PerformanceObserverMock,
        requestAnimationFrame(callback) { const id = ++nextFrame; pendingFrames.set(id, callback); return id; },
        cancelAnimationFrame(id) { pendingFrames.delete(id); },
        flushFrames() { const callbacks = [...pendingFrames.values()]; pendingFrames.clear(); callbacks.forEach(callback => callback()); },
        URL,
        document: doc
    });
    doc.documentElement = documentElement;
    doc.body = body;
    doc.defaultView = win;
    doc.querySelector = selector => selector === '.items-line .card.focus' ? (function find(node) {
        if (node.matches && node.matches('.card.focus') && node.closest('.items-line')) return node;
        for (const child of node.children || []) { const found = find(child); if (found) return found; }
        return null;
    })(documentElement) : null;
    return { win, doc, body, observers, advance: value => { time = value; } };
}

test('captures independent Lampa/Home/YDesign/focus stages, sanitized waterfall and long tasks without Storage access', () => {
    const f = fixture();
    const probe = installProbe(f.win, f.doc);
    f.advance(10); f.doc.dispatch('DOMContentLoaded');
    const rows = {
        call(screen, params, calls) { calls.push(done => done({ title: 'synthetic', results: [{ id: 'fixture' }] })); }
    };
    const lampa = {
        Activity: { active: () => ({ component: 'main' }) },
        Controller: { enabled: () => ({ name: 'content' }) },
        Storage: { get() { throw new Error('probe must not access Storage'); }, set() { throw new Error('probe must not write Storage'); } }
    };
    f.advance(20); f.win.Lampa = lampa;
    f.advance(30); lampa.ContentRows = rows;
    const calls = [];
    rows.call('main', {}, calls);
    let delivered = null;
    calls[0](data => { delivered = data; });
    f.advance(40); f.win.appready = true;

    const nativeCard = element('card');
    const ydesignCard = element('card ydesign-vertical');
    const line = element('items-line', [nativeCard, ydesignCard]);
    f.body.children.push(line); line.parentElement = f.body;
    f.body.className = 'stremio-hybrid';
    const mutation = f.observers.find(item => item instanceof f.win.MutationObserver);
    mutation.emit([{ type: 'childList', addedNodes: [line] }, { type: 'attributes', target: f.body }]);
    nativeCard.className += ' focus';
    mutation.emit([{ type: 'attributes', target: nativeCard }]);
    f.doc.dispatch('keydown', { key: 'ArrowDown' });
    nativeCard.className = 'card';
    const nextCard = element('card focus');
    line.children.push(nextCard); nextCard.parentElement = line;
    f.win.flushFrames();
    f.observers.find(item => item.type === 'resource').emit([{ name: 'https://api.trakt.tv/sync/watched/movies?token=DO_NOT_LOG', initiatorType: 'fetch', startTime: 44.25, duration: 123.5, responseEnd: 167.75 }]);
    f.observers.find(item => item.type === 'longtask').emit([{ startTime: 55, duration: 91.25 }]);

    const result = probe.snapshot();
    assert.deepEqual(delivered.results, [{ id: 'fixture' }]);
    assert.deepEqual(Object.keys(result.markers), ['domContentLoaded', 'nativeLampaObjectAvailable', 'firstHomeContentRowsRequest', 'firstHomeDataCallback', 'nativeAppready', 'firstNativeHomeCardDom', 'firstYDesignHomeCardDom', 'hybridShellApplied', 'firstHomeControllerFocus', 'firstHomeDpadResponse']);
    assert.equal(result.markers.nativeLampaObjectAvailable.ms, 20);
    assert.equal(result.markers.firstHomeContentRowsRequest.ms, 30);
    assert.equal(result.markers.nativeAppready.ms, 40);
    assert.equal(result.markers.firstHomeControllerFocus.detail.controller, 'content');
    assert.equal(result.markers.firstHomeDpadResponse.detail.controller, 'content');
    assert.equal(result.markers.firstHomeDpadResponse.detail.key, 'ArrowDown');
    assert.equal(result.resources.length, 1);
    assert.equal(result.resources[0].label, 'https://api.trakt.tv/[redacted]');
    assert(!JSON.stringify(result).includes('DO_NOT_LOG'));
    assert.equal(result.longTaskMaxMs, 91.3);
    assert.equal(result.support.contentRows, true);

    assert.deepEqual(probe.stop(), []);
    assert.equal(f.win.__lampaPhase7Probe, undefined);
    assert.equal(f.win.Lampa, lampa, 'native global remains available after instrumentation cleanup');
    assert.equal(lampa.ContentRows, rows, 'ContentRows object remains intact');
    assert.equal(rows.call.name, 'call', 'native ContentRows handler is restored');
    assert.equal(f.doc.listenerCount(), 0, 'temporary DOMContentLoaded listener is removed');
    assert(f.observers.every(observer => observer.disconnected), 'all observers disconnect');
});

test('does not fail when native APIs cannot be instrumented and stop is idempotent', () => {
    const f = fixture();
    Object.defineProperty(f.win, 'Lampa', { configurable: false, enumerable: true, value: null });
    const probe = installProbe(f.win, f.doc);
    assert.equal(probe.support.lampaGlobal, false);
    assert.deepEqual(probe.stop(), []);
    assert.deepEqual(probe.stop(), []);
    assert.equal(f.win.__lampaPhase7Probe, undefined);
});
