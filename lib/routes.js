const Router = require('koa-router');
const mongoose = require('mongoose');
const passport = require('koa-passport');
const {phoneNumber} = require('@bandwidth/node-bandwidth-extra');
const authenticated = require('./authenticated');
const {Pool, Call} = require('./models');

const objectId = mongoose.Types.ObjectId;

const router = new Router();

router.get('/login', (ctx, next) => {
	const auth = passport.authenticate('auth0', {
		clientID: process.env.AUTH0_CLIENT_ID,
		domain: process.env.AUTH0_DOMAIN,
		redirectUri: `https://${ctx.request.host}/auth0/callback`,
		audience: `https://${process.env.AUTH0_DOMAIN}/userinfo`,
		responseType: 'code',
		scope: 'openid profile'
	});
	return auth(ctx, next);
}, ctx => ctx.redirect('/'));

router.post('/logout', async ctx => {
	await ctx.logout();
	ctx.body = {};
});

router.get('/auth0/callback', passport.authenticate('auth0', {
	failureRedirect: '/login'
}), ctx => {
	ctx.redirect('/');
});

router.get('/profile', ctx => {
	ctx.body = ctx.state.user || {};
});

router.get('/pools', authenticated, async ctx => {
	ctx.body = await Pool.find({user: ctx.state.user.id}).sort({createdAt: -1});
});

router.post('/pools', authenticated, async ctx => {
	const pool = new Pool(ctx.request.body);
	pool.phoneNumber = await phoneNumber.createPhoneNumber(ctx.bandwidthApi, ctx.applicationId, {areaCode: ctx.request.body.areaCode || '910'});
	pool.user = ctx.state.user.id;
	await pool.save();
	ctx.body = pool;
});

router.post('/pools/:id', authenticated, async ctx => {
	const data = ctx.request.body;
	delete data.user;
	await Pool.update({user: ctx.state.user.id, _id: objectId(ctx.params.id)}, data);
	ctx.body = {};
});

router.get('/pools/:id', authenticated, async ctx => {
	ctx.body = await Pool.findOne({user: ctx.state.user.id, _id: objectId(ctx.params.id)});
});

router.del('/pools/:id', authenticated, async ctx => {
	await Pool.remove({user: ctx.state.user.id, _id: objectId(ctx.params.id)});
	ctx.body = {};
});

router.get('/calls', authenticated, async ctx => {
	const query = {user: ctx.state.user.id};
	if (ctx.query.pool) {
		query.pool = objectId(ctx.query.pool);
	}
	if (ctx.query.answeredBy) {
		query.answeredBy = ctx.query.answeredBy;
	}
	const size = Number(ctx.query.size || 30);
	const page = Number(ctx.query.page || 1);
	let calls = Call.find(query);
	if (!ctx.query.pool) {
		calls = calls.populate('pool');
	}
	ctx.body = {
		page,
		size,
		calls: await calls.sort({createdAt: -1}).skip((page - 1) * size).limit(size),
		isLastPage: !(await calls.skip(page * size).limit(1))[0]
	};
});

module.exports = router;
