const test = require('ava');
const td = require('testdouble');
const authenticated = require('../lib/authenticated');

test('should do nothing fo athentificated requests', async t => {
	const next = td.function();
	const ctx = {isAuthenticated: td.function()};
	td.when(next()).thenResolve();
	td.when(ctx.isAuthenticated()).thenReturn(true);
	await authenticated(ctx, next);
	t.pass();
});

test('should throw 401 on non-authed requests', async t => {
	const next = td.function();
	const ctx = {isAuthenticated: td.function(), throw: td.function()};
	td.when(next(), {times: 0});
	td.when(ctx.throw(401)).thenReturn();
	td.when(ctx.isAuthenticated()).thenReturn(false);
	await authenticated(ctx, next);
	t.pass();
});
