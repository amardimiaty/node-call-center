const util = require('util');
const debug = require('debug')('callbacks');
const {Pool, Call} = require('./models');

async function callToNextAgent(callId, ctx) {
	const cacheGet = util.promisify(ctx.cache.get.bind(ctx.cache));
	const cacheSet = util.promisify(ctx.cache.set.bind(ctx.cache));
	const cacheDel = util.promisify(ctx.cache.del.bind(ctx.cache));
	const data = await cacheGet(`call-data:${callId}`);
	if (!data) {
		return;
	}
	if (data.index >= data.forwards.length) {
		data.index = 0;
	}
	const phoneNumber = data.forwards[data.index];
	debug('Calling to agent %s', phoneNumber);
	let agentCallId = null;
	try {
		agentCallId = (await ctx.bandwidthApi.Call.create({from: data.phoneNumber, to: phoneNumber, tag: callId, callbackUrl: `https://${ctx.request.host}/bandwidth/callback/call`})).id;
	} catch (err) {
		debug('Error on making call to agent: %s', err.message);
	}
	debug('Agent call id %s', agentCallId);
	data.index ++;
	data.agentCallId = agentCallId;
	await cacheSet(`call-data:${callId}`, data, {ttl: 1800000});
	await cacheSet(`agent:${agentCallId}`, callId, {ttl: 60});
	const cId = callId;
	const timeout = async () => {
		if (await cacheGet(`agent:${agentCallId}`)) {
			debug(`Agent %s doesn't answer long time. Terminate the call %s. (call id %s)`, phoneNumber, agentCallId, cId);
			await cacheDel(`agent:${agentCallId}`);
			if (agentCallId) {
				await ctx.bandwidthApi.Call.hangup(agentCallId);
			}
			await callToNextAgent(cId, ctx);
		}
	};
	setTimeout(() => timeout().catch(err => debug(err.stack)), 10000);
}

const callCallback = {
	answer: async (data, ctx) => {
		const cacheDel = util.promisify(ctx.cache.del.bind(ctx.cache));
		const cacheSet = util.promisify(ctx.cache.set.bind(ctx.cache));
		let pool = await Pool.findOne({phoneNumber: data.to});
		if (pool) {
			debug('Answered call to service number %s from %s', pool.phoneNumber, data.from);
			const call = new Call({
				pool,
				user: pool.user,
				started: new Date(),
				incomingCallId: data.callId
			});
			await call.save();
			debug('Playing a greeting to client');
			await cacheSet(`call-data:${data.callId}`, {
				index: 0,
				forwards: pool.forwards,
				phoneNumber: pool.phoneNumber
			}, {ttl: 1800});
			await ctx.bandwidthApi.Call.speakSentence(data.callId, pool.getGreeting());
			return;
		}
		pool = await Pool.findOne({phoneNumber: data.from});
		if (pool && data.tag) {
			debug('Answered call by agent %s (call id is %s, client call is %s)', data.to, data.callId, data.tag);
			const call = await Call.findOne({incomingCallId: data.tag});
			call.answered = new Date();
			call.answeredBy = data.to;
			call.answeredByCallId = data.callId;
			await cacheDel(`call-data:${data.tag}`);
			await cacheDel(`agent:${data.callId}`);
			debug('Making a bridge for calls %s and %s', call.incomingCallId, call.answeredByCallId);
			call.bridgeId = (await ctx.bandwidthApi.Bridge.create({callIds: [call.incomingCallId, call.answeredByCallId], bridgeAudio: true})).id;
			await call.save();
		}
	},
	speak: async (data, ctx) => {
		if (data.status === 'done') {
			debug('Greeting was played. Calling to agents');
			await callToNextAgent(data.callId, ctx);
		}
	},
	hangup: async (data, ctx) => {
		const cacheDel = util.promisify(ctx.cache.del.bind(ctx.cache));
		await cacheDel(`call-data:${data.callId}`);
		const call = await Call.findOne({$or: [{incomingCallId: data.callId}, {answeredByCallId: data.callId}], ended: null});
		if (!call) {
			return;
		}
		call.ended = new Date();
		await call.save();
		const anotherCallId = [call.incomingCallId, call.answeredByCallId].filter(id => id && id !== data.callId)[0];
		if (!anotherCallId) {
			return;
		}
		const anotherCall = await ctx.bandwidthApi.Call.get(anotherCallId);
		if (anotherCall.state !== 'completed' || anotherCall.state !== 'rejected') {
			debug(`Hangup another call %s (for %s)`, anotherCallId, data.callId);
			await ctx.bandwidthApi.Call.hangup(anotherCallId);
		}
	}
};

module.exports = {callCallback};
