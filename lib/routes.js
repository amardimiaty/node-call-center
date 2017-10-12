const Router = require('koa-router');

const router = new Router();

router.get('/auth0/callback', passport.authenticate('auth0', {failureRedirect: '/login'}), ctx => ctx.redirect('/'));

module.exports = router;
