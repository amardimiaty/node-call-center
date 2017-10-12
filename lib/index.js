const path = require('path');
const Koa = require('koa');
const koaBody = require('koa-body');
const koaSession = require('koa-session');
const koaStatic = require('koa-static');
const passport = require('koa-passport');
const Auth0Strategy = require('passport-auth0')
const mongoose = require('mongoose');
const debug = require('debug')('index');
const dotenv = require('dotenv');

dotenv.load();

const getRouter = require('./routes');
const {User} = require('./models');

async function main() {
	mongoose.Promise = global.Promise;
	await mongoose.connect(process.env.DATABASE_URL || process.env.MONGODB_URI || 'mongodb://localhost/call-center');
	const router = await getRouter();

	const strategy = new Auth0Strategy({
		domain: process.env.AUTH0_DOMAIN,
		clientID: process.env.AUTH0_CLIENT_ID,
		clientSecret: process.env.AUTH0_CLIENT_SECRET,
		callbackURL:  '/auth0/callback'
	 }, (accessToken, refreshToken, extraParams, profile, done) => {
		User.getByAuth0Profile(profile).then(user => done(null, user), done);
	 }
 );

	passport.serializeUser((user, done) => {
		done(null, user.id);
	});
	passport.deserializeUser((userId, done) => {
		User.findById(userId).then(user => {
			done(null, user);
		}, done);
	});

	const app = new Koa();
	app.keys = (process.env.COOKIES_KEYS || 'K1xPS93sOJWmdAN3Fq76').split(';');
	app.proxy = true;
	app
		.use(koaBody())
		.use(koaSession(app))
		.use(passport.initialize())
		.use(passport.session())
		.use(router.routes())
		.use(router.allowedMethods())
		.use(koaStatic(path.join(__dirname, '..', 'public')));
	return app;
}

module.exports = main;
