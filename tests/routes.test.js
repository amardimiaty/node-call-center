const test = require('ava');
const td = require('testdouble');
const mongoose = require('mongoose');
const passport = require('koa-passport');
const {phoneNumber} = require('@bandwidth/node-bandwidth-extra');
const {Pool, Call} = require('../lib/models');

mongoose.Types.ObjectId = i => i;

td.replace(passport, 'authenticate');
td.replace(Pool, 'find');
td.replace(Pool, 'update');
td.replace(Pool, 'remove');
td.replace(Pool.prototype, 'save');
td.replace(Call, 'find');
td.replace(phoneNumber, 'createPhoneNumber');

td.when(passport.authenticate('auth0', td.matchers.anything())).thenReturn((ctx, next) => next());
td.when(passport.authenticate('auth0')).thenReturn((ctx, next) => next());

const mockPool = {};
td.when(Pool.find({user: 'userId'})).thenReturn({sort: () => Promise.resolve([mockPool])});
td.when(Pool.update({user: 'userId', _id: 'id'}, {name: 'name'})).thenResolve();
td.when(Pool.remove({user: 'userId', _id: 'id'})).thenResolve();
td.when(phoneNumber.createPhoneNumber(td.matchers.anything(), 'applicationId', {areaCode: '910'})).thenResolve('+12345678901');

const mockCallPromise = Promise.resolve([{}]);
mockCallPromise.sort = () => mockCallPromise;
mockCallPromise.limit = () => mockCallPromise;
mockCallPromise.skip = () => mockCallPromise;
mockCallPromise.populate = () => mockCallPromise;
td.when(Call.find({user: 'userId'})).thenReturn(mockCallPromise);
td.when(Call.find({user: 'userId', pool: 'poolId'})).thenReturn(mockCallPromise);
td.when(Call.find({user: 'userId', answeredBy: '+12345678901'})).thenReturn(mockCallPromise);

const routes = require('../lib/routes').routes();

test('GET /auth0/callback should redirect to / after authentification', async t => {
	const ctx = {
		method: 'GET',
		path: '/auth0/callback',
		redirect: td.function()
	};
	td.when(ctx.redirect('/')).thenReturn();
	await routes(ctx, null);
	t.pass();
});

test('GET /login should redirect to / after authentification', async t => {
	const ctx = {
		method: 'GET',
		path: '/login',
		redirect: td.function()
	};
	td.when(ctx.redirect('/')).thenReturn();
	await routes(ctx, null);
	t.pass();
});

test('POST /logout should remove auth data', async t => {
	const ctx = {
		method: 'POST',
		path: '/logout',
		logout: td.function()
	};
	td.when(ctx.logout()).thenReturn();
	await routes(ctx, null);
	t.pass();
});

test('GET /profile should return user data', async t => {
	const ctx = {
		state: {
			user: {
				id: 'userId'
			}
		},
		method: 'GET',
		path: '/profile'
	};
	await routes(ctx, null);
	t.is(ctx.body.id, 'userId');
});

test('GET /pools should return pools', async t => {
	const ctx = {
		isAuthenticated: () => true,
		state: {
			user: {
				id: 'userId'
			}
		},
		method: 'GET',
		path: '/pools'
	};
	await routes(ctx, null);
	t.is(ctx.body.length, 1);
});

test('POST /pools should create a pool', async t => {
	const ctx = {
		isAuthenticated: () => true,
		state: {
			user: {
				id: 'userId'
			}
		},
		applicationId: 'applicationId',
		method: 'POST',
		path: '/pools',
		request: {
			body: {forwards: ['num']}
		}
	};
	await routes(ctx, null);
	t.is(ctx.body.forwards[0], 'num');
});

test('POST /pools/id should update a pool', async t => {
	const ctx = {
		isAuthenticated: () => true,
		state: {
			user: {
				id: 'userId'
			}
		},
		method: 'POST',
		path: '/pools/id',
		request: {
			body: {name: 'name'}
		}
	};
	await routes(ctx, null);
	t.pass();
});

test('DELETE /pools/id should remove a pool', async t => {
	const ctx = {
		isAuthenticated: () => true,
		state: {
			user: {
				id: 'userId'
			}
		},
		method: 'DELETE',
		path: '/pools/id'
	};
	await routes(ctx, null);
	t.pass();
});

test('GET /calls should return calls', async t => {
	const ctx = {
		isAuthenticated: () => true,
		state: {
			user: {
				id: 'userId'
			}
		},
		method: 'GET',
		path: '/calls',
		query: {}
	};
	await routes(ctx, null);
	t.pass();
});

test('GET /calls should return calls for a pool', async t => {
	const ctx = {
		isAuthenticated: () => true,
		state: {
			user: {
				id: 'userId'
			}
		},
		method: 'GET',
		path: '/calls',
		query: {
			pool: 'poolId'
		}
	};
	await routes(ctx, null);
	t.pass();
});

test('GET /calls should return calls for give agent', async t => {
	const ctx = {
		isAuthenticated: () => true,
		state: {
			user: {
				id: 'userId'
			}
		},
		method: 'GET',
		path: '/calls',
		query: {
			answeredBy: '+12345678901'
		}
	};
	await routes(ctx, null);
	t.pass();
});
