const util = require('util');
const test = require('ava');
const td = require('testdouble');

const {User, Pool, Call} = require('../lib/models');

td.replace(User, 'findOneAndUpdate');
td.replace(User.prototype, 'save');

test('User#getByAuth0Profile() should return (and create if need) user data for auth0 profile', async t => {
	const mockUser = {};
	td.when(User.findOneAndUpdate({externalId: 'id'}, {$set: {name: 'name'}}, {upsert: true})).thenResolve(mockUser);
	const user = await User.getByAuth0Profile({id: 'id', name: 'name'});
	t.is(user, mockUser);
});

test('Pool#getGreeting() should return greeting text', t => {
	const pool = new Pool();
	pool.greeting = 'Hello';
	t.is(pool.getGreeting(), 'Hello');
});

test('Pool#getGreeting() should return default greeting text if greeting is not defined', t => {
	const pool = new Pool();
	t.true(util.isString(pool.getGreeting()));
});

test('Call#holdingDuration should return holding duration', t => {
	const call = new Call();
	t.is(call.holdingDuration, 0);
	call.started = new Date();
	t.is(Math.round(call.holdingDuration), 0);
	call.answered = new Date(Number(call.started) + 2000);
	t.is(call.holdingDuration, 2);
});

test('Call#callDuration should return call duration', t => {
	const call = new Call();
	t.is(call.callDuration, 0);
	call.started = new Date();
	t.is(call.callDuration, 0);
	call.answered = new Date();
	t.is(Math.round(call.callDuration), 0);
	call.ended = new Date(Number(call.answered) + 5000);
	t.is(call.callDuration, 5);
});

test('Call#status should return call status', t => {
	const call = new Call();
	t.is(call.status, '');
	call.started = new Date();
	t.is(call.status, 'started');
	call.answered = new Date(Number(call.started) + 2000);
	t.is(call.status, 'answered');
	call.ended = new Date(Number(call.started) + 5000);
	t.is(call.status, 'ended');
});
