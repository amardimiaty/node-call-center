const debug = require('debug')('callbacks');
const {Pool, Call} = require('./models');

const callCallback = {
	answer: async (data, ctx) => {
		let pool = await Pool.findOne({phoneNumber: data.to});
		if (pool) {
			debug('Answered call to service number %s from %s. Making calls to %d agents (to forward this call)', pool.phoneNumber, data.from, pool.forwards.length);
			const call = new Call({
				pool,
				user: pool.user,
				started: new Date(),
				incomingCallId: data.callId
			});
			await call.save();
			debug('Playing a greeting to client');
			await ctx.bandwidthApi.Call.speakSentence(data.callId, pool.getGreeting());
			await Promise.all(pool.forwards.map(async number => {
				debug('Making call to agent %s (to forward call from %s)', number, data.from);
				const callId = await ctx.bandwidthApi.Call.create({from: pool.phoneNumber, to: number, tag: data.callId});
				await ctx.cache.set(`${data.callId}:${number}`, callId, {ttl: 1800});
			}));
			return;
		}
		pool = await Pool.findOne({phoneNumber: data.from});
		if (pool && data.tag) {
			debug('Answered call to agent %s. Cancel other agents calls.', data.to);
			await Promise.all(pool.forwards.filter(number => number !== data.to).map(async number => {
				const callId = await ctx.cache.get(`${data.tag}:${number}`);
				if (callId) {
					debug('Cancel agent call for %s', number);
					await ctx.bandwidthApi.Call.hangup(callId);
				}
			}));
			const call = await Call.findOne({incomingCallId: data.tag, pool: pool.id});
			if (!call) {
				throw new Error('Warning: Not found call record for call id %s', data.tag);
			}
			call.answered = new Date();
			call.answeredBy = data.to;
			call.answeredByCallId = data.callId;
			await call.save();
			debug('Making a bridge for calls %s and %s', call.incomingCallId, call.answeredByCallId);
			await ctx.bandwidthApi.Bridge.create({callIds: [call.incomingCallId, call.answeredByCallId], bridgeAudio: true});
		}
	},
	hangup: async (data, ctx) => {
		const call = await Call.findOne({$or: [{incomingCallId: data.callId, answeredByCallId: data.callId}], ended: null});
		if (!call) {
			return;
		}
		const anotherCallId = [call.incomingCallId, call.answeredByCallId].filter(id => id !== data.callId)[0];
		call.ended = new Date();
		await call.save();
		debug(`Hangup another call %s (for %s)`, anotherCallId, data.callId);
		await ctx.bandwidthApi.Call.hangup(anotherCallId);
	}
};

module.exports = {callCallback};
