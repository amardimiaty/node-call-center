const util = require('util');
const test = require('ava');
const td = require('testdouble');
const supertest = require('supertest');
const mongoose = require('mongoose');
const passport = require('koa-passport');

const {User} = require('../lib/models');
const main = require('../lib/index');

td.replace(mongoose, 'connect');
td.replace(User, 'findById');
td.replace(passport, 'serializeUser');
td.replace(passport, 'deserializeUser');

let _serializeUser = null;
let _deserializeUser = null;

td.when(mongoose.connect(td.matchers.anything())).thenResolve();

td.when(passport.serializeUser(td.matchers.anything())).thenDo(f => {
	_serializeUser = f;
});
td.when(passport.deserializeUser(td.matchers.anything())).thenDo(f => {
	_deserializeUser = f;
});

let app;
test.serial('GET / should render index page', async t => {
	app = await main();
	await supertest(app.callback()).get('/')
		.expect(200)
		.expect('Content-Type', /html/);
	t.true(util.isFunction(_serializeUser));
	t.true(util.isFunction(_deserializeUser));
	t.pass();
});

test.serial.cb('serializeUser() should return user id', t => {
	_serializeUser({id: 'id'}, (err, id) => {
		t.is(id, 'id');
		t.end();
	});
});

test.serial.cb('deserializeUser() should return user by id', t => {
	const user = {id: 'id'};
	td.when(User.findById('id')).thenResolve(user);
	_deserializeUser('id', (err, usr) => {
		t.is(usr, user);
		t.end();
	});
});

test.serial('should handle unhandled errors', async t => {
	app.use((ctx, next) => {
		if (ctx.path === '/error') {
			throw new Error('Error');
		}
		return next();
	});
	await supertest(app.callback()).get('/error')
		.expect(400)
		.expect({error: 'Error'});
	await supertest(app.callback()).get('/').accept('html')
		.expect(200);
	t.pass();
});

