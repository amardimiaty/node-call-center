const path = require('path');
const debug = require('debug')('index');
const Koa = require('koa');
const koaSend = require('koa-send');
const koaBody = require('koa-body');
const koaSession = require('koa-session');
const koaStatic = require('koa-static');
const passport = require('koa-passport');
const Auth0Strategy = require('passport-auth0');
const mongoose = require('mongoose');
const {middlewares} = require('@bandwidth/node-bandwidth-extra');
const fsStore = require('cache-manager-fs');
const dotenv = require('dotenv');

dotenv.load();

const name = require('../package.json').name;

const router = require('./routes');
const {User} = require('./models');
const {callCallback} = require('./callbacks');

async function main() {
	mongoose.Promise = global.Promise;
	await mongoose.connect(process.env.DATABASE_URL || process.env.MONGODB_URI || 'mongodb://localhost/call-center', {useMongoClient: true});

	const strategy = new Auth0Strategy({
		domain: process.env.AUTH0_DOMAIN,
		clientID: process.env.AUTH0_CLIENT_ID,
		clientSecret: process.env.AUTH0_CLIENT_SECRET,
		callbackURL: '/auth0/callback'
	}, (accessToken, refreshToken, extraParams, profile, done) => {
		User.getByAuth0Profile(profile._json).then(user => done(null, user), done);
	});

	passport.serializeUser((user, done) => {
		done(null, user.id);
	});
	passport.deserializeUser((userId, done) => {
		User.findById(userId).then(user => {
			done(null, user);
		}, done);
	});
	passport.use(strategy);
	const rootPath = path.join(__dirname, '..', 'frontend', 'build');
	const app = new Koa();
	app.keys = (process.env.COOKIES_KEYS || 'K1xPS93sOJWmdAN3Fq76').split(';');
	app.proxy = true;
	app
		.use(koaBody())
		.use(async (ctx, next) => {
			try {
				await next();
			} catch (err) {
				debug(err.stack);
				if (ctx.accepts('json')) {
					ctx.status = err.status || 400;
					ctx.body = {error: err.message};
				} else {
					ctx.body = 'Internal error. Sorry.';
				}
			}
		})
		.use(middlewares.koa({
			name,
			auth: {userId: process.env.BANDWIDTH_USER_ID, apiToken: process.env.BANDWIDTH_API_TOKEN, apiSecret: process.env.BANDWIDTH_API_SECRET},
			callCallback,
			cache: {store: fsStore, options: {path: '.cache'}}
		}))
		.use(koaSession(app))
		.use(passport.initialize())
		.use(passport.session())
		.use(router.routes())
		.use(router.allowedMethods())
		.use(koaStatic(rootPath))
		.use(async (ctx, next) => {
			if (ctx.method === 'GET') {
				// SPA support
				await koaSend(ctx, 'index.html', {root: rootPath});
				return;
			}
			await next();
		});
	return app;
}

module.exports = main;
