'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(__dirname + '/../ui/cardify-plus.js', 'utf8');

test('duplicate Cardify+ delivery registers its deferred native startup only once', () => {
    const pending = [];
    const context = {
        Lampa: { Listener: { follow(name, callback) { pending.push({ name, callback }); } } }
    };
    context.window = context;
    context.location = { host: 'fixture.invalid' };
    vm.createContext(context);

    vm.runInContext(source, context, { filename: 'cardify-plus.js:first' });
    vm.runInContext(source, context, { filename: 'cardify-plus.js:duplicate' });

    assert.equal(context.__lampaCardifyPlusStarted, true);
    assert.equal(pending.length, 1, 'duplicate script must not register a second native listener');
    assert.equal(pending[0].name, 'app');
});
