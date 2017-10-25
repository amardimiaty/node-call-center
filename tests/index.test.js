const util = require('util');
const fs = require('fs');
const path = require('path');
const test = require('ava');
const td = require('testdouble');
const supertest = require('supertest');
const mongoose = require('mongoose');
const passport = require('koa-passport');
const {middlewares} = require('@bandwidth/node-bandwidth-extra');

const mkDir = util.promisify(fs.mkdir);
const writeFile = util.promisify(fs.writeFile);

const indexDir = path.join(__dirname, '..', 'frontend', 'build');
const indexFile = path.join(indexDir, 'index.html');

const {User} = require('../lib/models');
const main = require('../lib/index');

td.replace(mongoose, 'connect');
td.replace(User, 'findById');
td.replace(passport, 'serializeUser');
td.replace(passport, 'deserializeUser');
td.replace(middlewares, 'koa');

let _serializeUser = null;
let _deserializeUser = null;

process.env.AUTH0_DOMAIN = 'auth0_domain';
process.env.AUTH0_CLIENT_ID = 'auth0_client_id';
process.env.AUTH0_CLIENT_SECRET = 'auth0_secret';

td.when(mongoose.connect(td.matchers.anything())).thenResolve();

td.when(passport.serializeUser(td.matchers.anything())).thenDo(f => {
	_serializeUser = f;
});
td.when(passport.deserializeUser(td.matchers.anything())).thenDo(f => {
	_deserializeUser = f;
});
td.when(middlewares.koa(td.matchers.anything())).thenReturn((ctx, next) => next());

let app;

test.before(async () => {
	if (!fs.existsSync(indexDir)) {
		await mkDir(indexDir);
	}
	if (!fs.existsSync(indexFile)) {
		await writeFile(indexFile, ' ');
	}
});

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
	await supertest(app.callback()).post('/error')
		.expect(400)
		.expect({error: 'Error'});
	await supertest(app.callback()).post('/error').accept('html')
		.expect(200);
	t.pass();
});

