const util = require('util');
const debug = require('debug')('callbacks');
const {Pool, Call} = require('./models');

async function callToNextAgent(callId, ctx) {
	debug(`call-data:${callId}`);
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
	const agentCallId = (await ctx.bandwidthApi.Call.create({from: data.phoneNumber, to: phoneNumber, tag: callId, callbackUrl: `https://${process.env.HOST}/bandwidth/callback/call`})).id;
	debug('Agent call id %s', agentCallId);
	data.index ++;
	data.agentCallId = agentCallId;
	await cacheSet(`call-data:${callId}`, data, {ttl: 1800});
	await cacheSet(`agent:${agentCallId}`, callId, {ttl: 60});
	const timeout = async () => {
		if (await cacheGet(`agent:${agentCallId}`)) {
			debug(`Agent %s doesn't answer long time. Terminate the call %s.`, phoneNumber, agentCallId);
			await cacheDel(`agent:${agentCallId}`);
			await ctx.bandwidthApi.Call.hangup(agentCallId);
			await callToNextAgent(callId, ctx);
		}
	};
	setTimeout(() => timeout().catch(err => debug(err.stack)), 10000);
}

const callCallback = {
	answer: async (data, ctx) => {
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
			const cacheSet = util.promisify(ctx.cache.set.bind(ctx.cache));
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
			debug('Answered call by agent %s (call id is %s)', data.to, data.callId);
			const cacheDel = util.promisify(ctx.cache.del.bind(ctx.cache));
			await cacheDel(`agent:${data.callId}`);
			await ctx.bandwidthApi.Call.createGather(data.callId, {
				maxDigits: 1,
				interDigitTimeout: 30,
				tag: data.tag,
				prompt: {
					sentence: 'Press 2 to accept call, or 5 to reject.'
				}
			});
		}
	},
	speak: async (data, ctx) => {
		if (data.status === 'done') {
			debug('Calling to agents');
			await callToNextAgent(data.callId, ctx);
		}
	},
	gather: async (data, ctx) => {
		if (!data.tag || data.reason !== 'max-digits' || data.reason !== 'hung-up' || data.digits !== '2') {
			debug('Reject agent call %s', data.callId);
			await ctx.bandwidthApi.Call.hangup(data.callId);
			await callToNextAgent(data.tag, ctx);
			return;
		}
		debug('Accept agent call %s', data.callId);
		const call = await Call.findOne({incomingCallId: data.tag});
		if (!call) {
			throw new Error('Warning: Not found call record for call id %s', data.tag);
		}
		call.answered = new Date();
		call.answeredBy = data.to;
		call.answeredByCallId = data.callId;
		await call.save();
		debug('Making a bridge for calls %s and %s', call.incomingCallId, call.answeredByCallId);
		await ctx.bandwidthApi.Bridge.create({callIds: [call.incomingCallId, call.answeredByCallId], bridgeAudio: true});
	},
	hangup: async (data, ctx) => {
		const cacheGet = util.promisify(ctx.cache.get.bind(ctx.cache));
		const cacheDel = util.promisify(ctx.cache.del.bind(ctx.cache));
		const d = await cacheGet(`call-data:${data.callId}`);
		if (d && d.agentCallId) {
			debug(`Hangup agent call %s (for %s)`, d.agentCallId, data.callId);
			await cacheDel(`call-data:${data.callId}`);
			await cacheDel(`agent:${d.agentCallId}`);
			await ctx.bandwidthApi.Call.hangup(d.agentCallId);
		}
		const callId = await cacheGet(`agent:${data.callId}`);
		if (callId) {
			await cacheDel(`agent:${data.callId}`);
			const call = await Call.findOne({incomingCallId: callId, ended: null, answeredBy: null});
			if (call) {
				debug('Agent has rejected a call. Calling to another agent.');
				await callToNextAgent(callId, ctx);
				return;
			}
		}
		const call = await Call.findOne({$or: [{incomingCallId: data.callId, answeredByCallId: data.callId}], ended: null});
		if (!call) {
			return;
		}
		const anotherCallId = [call.incomingCallId, call.answeredByCallId].filter(id => id && id !== data.callId)[0];
		call.ended = new Date();
		await call.save();
		if (!anotherCallId) {
			return;
		}
		debug(`Hangup another call %s (for %s)`, anotherCallId, data.callId);
		await ctx.bandwidthApi.Call.hangup(anotherCallId);
	}
};

module.exports = {callCallback};
