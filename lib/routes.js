const Router = require('koa-router');
const mongoose = require('mongoose');
const passport = require('koa-passport');
const authenticated = require('./authenticated');
const {Pool} = require('./models');

const objectId = mongoose.Types.ObjectId;

const router = new Router();

router.get('/auth0/callback', passport.authenticate('auth0', {failureRedirect: '/login'}), ctx => ctx.redirect('/'));

router.get('/login', passport.authenticate('auth0'), ctx => ctx.redirect('/'));

router.get('/pools', authenticated, async ctx => {
	ctx.body = await Pool.find({user: ctx.state.user.id}).sort({createdDate: -1});
});

router.post('/pools', authenticated, async ctx => {
	const pool = new Pool(ctx.request.body);
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

router.del('/pools/:id', authenticated, async ctx => {
	await Pool.remove({user: ctx.state.user.id, _id: objectId(ctx.params.id)});
	ctx.body = {};
});

module.exports = router;
