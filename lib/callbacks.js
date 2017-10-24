const util = require('util');
const debug = require('debug')('callbacks');
const {Pool, Call} = require('./models');

async function callToNextAgent(callId, ctx) {
	const cacheGet = util.promisify(ctx.cache.get.bind(ctx.cache));
	const cacheSet = util.promisify(ctx.cache.set.bind(ctx.cache));
	const cacheDel = util.promisify(ctx.cache.del.bind(ctx.cache));
	const data = await cacheGet(`call-data:${callId}`);
	const bridgedCall = await Call.findOne({incomingCallId: callId, bridgeId: {$exists: true}});
	if (!data || bridgedCall) {
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
	await cacheSet(`call-data:${callId}`, data, {ttl: 1800000});
	await cacheSet(`agent:${agentCallId}`, callId, {ttl: 60});
	const cId = callId;
	const timeout = async () => {
		if (await cacheGet(`agent:${agentCallId}`)) {
			debug(`Agent %s doesn't answer long time. Terminate the call %s. (call id %s)`, phoneNumber, agentCallId, cId);
			await cacheDel(`agent:${agentCallId}`);
			await ctx.bandwidthApi.Call.hangup(agentCallId);
			await callToNextAgent(cId, ctx);
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
			await ctx.bandwidthApi.Call.speakSentence(data.callId, 'Press 2 to accept call, or 5 to reject.');
		}
	},
	speak: async (data, ctx) => {
		if (data.status === 'done') {
			debug('Calling to agents');
			await callToNextAgent(data.callId, ctx);
		}
	},
	dtmf: async ({dtmfDigit, callId, tag}, ctx) => {
		const cacheDel = util.promisify(ctx.cache.del.bind(ctx.cache));
		debug('dtmfDigit=%s', dtmfDigit);
		if (dtmfDigit !== '2') {
			debug('Reject agent call %s', callId);
			await ctx.bandwidthApi.Call.hangup(callId);
			await callToNextAgent(tag, ctx);
			return;
		}
		debug('Accept agent call %s', callId);
		const call = await Call.findOne({incomingCallId: tag});
		if (!call) {
			throw new Error('Warning: Not found call record for call id %s', tag);
		}
		const agentCall = await ctx.bandwidthApi.Call.get(callId);
		call.answered = new Date();
		call.answeredBy = agentCall.to;
		call.answeredByCallId = callId;
		debug('Making a bridge for calls %s and %s', call.incomingCallId, call.answeredByCallId);
		call.bridgeId = (await ctx.bandwidthApi.Bridge.create({callIds: [call.incomingCallId, call.answeredByCallId], bridgeAudio: true})).id;
		await cacheDel(`call-data:${call.incomingCallId}`);
		await call.save();
	},
	hangup: async (data, ctx) => {
		const cacheGet = util.promisify(ctx.cache.get.bind(ctx.cache));
		const cacheDel = util.promisify(ctx.cache.del.bind(ctx.cache));
		const d = await cacheGet(`call-data:${data.callId}`);
		if (d && d.agentCallId) {
			debug(`Hangup agent call %s (for %s)`, d.agentCallId, data.callId);
			await cacheDel(`agent:${d.agentCallId}`);
			await ctx.bandwidthApi.Call.hangup(d.agentCallId);
			return;
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
		const call = await Call.findOne({$or: [{incomingCallId: data.callId}, {answeredByCallId: data.callId}], ended: null});
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
