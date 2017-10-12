const mongoose = require('mongoose');

mongoose.Promise = global.Promise;

let User = null;
let Pool = null;
let Call = null;

const UserSchema = new mongoose.Schema({
	externalId: {type: String, required: true, index: true, unique: true},
	name: {type: String}
});

UserSchema.statics.getByAuth0Profile = profile => {
	return User.findOneAndUpdate({externalId: profile.id}, {$set: {name: profile.name}}, {upsert: true});
};

User = mongoose.model('User', UserSchema);

const PoolSchema = new mongoose.Schema({
	phoneNumber: {type: String, required: true, index: true, unique: true},
	greeting: {type: String},
	forwards: [{type: String, required: true}],
	user: {type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true},
	createdAt: {type: Date, index: true, default: Date.now}
});

PoolSchema.methods.getGreeting = function () {
	return this.greeting || 'Thank you for calling, your call will be answered in the order it was received';
};

Pool = mongoose.model('Pool', PoolSchema);

const CallSchema = new mongoose.Schema({
	user: {type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true},
	pool: {type: mongoose.Schema.Types.ObjectId, ref: 'Pool', index: true, required: true},
	createdAt: {type: Date, index: true, default: Date.now},
	started: {type: Date},
	answered: {type: Date},
	answeredBy: {type: String, index: true},
	ended: {type: Date}
});

CallSchema.virtual('holdingDuration').get(function () {
	const defaultTime = new Date();
	return Number(this.answered || defaultTime) - Number(this.started || defaultTime);
});

CallSchema.virtual('callDuration').get(function () {
	const defaultTime = new Date();
	return Number(this.ended || defaultTime) - Number(this.answered || defaultTime);
});

CallSchema.virtual('status').get(function () {
	if (this.started) {
		if (this.answered) {
			if (this.ended) {
				return 'ended';
			}
			return 'answered';
		}
		return 'started';
	}
	return '';
});

Call = mongoose.model('Call', CallSchema, {toJSON: {virtuals: true}});

module.exports = {User, Pool, Call};
