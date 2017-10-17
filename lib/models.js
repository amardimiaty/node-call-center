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
	return User.findOneAndUpdate({externalId: profile.sub}, {$set: {name: profile.name}}, {upsert: true});
};

if (!UserSchema.options.toJSON) {
	UserSchema.options.toJSON = {};
}

UserSchema.options.toJSON.transform = (doc, ret) => {
	ret.id = ret._id.toString();
	delete ret._id;
	return ret;
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
	ended: {type: Date, index: true},
	incomingCallId: {type: String, index: true, unique: true},
	answeredByCallId: {type: String, index: true}
});

CallSchema.virtual('holdingDuration').get(function () {
	if (!this.started) {
		return 0;
	}
	return (Number(this.answered || new Date()) - Number(this.started)) / 1000;
});

CallSchema.virtual('callDuration').get(function () {
	if (!this.answered) {
		return 0;
	}
	return (Number(this.ended || new Date()) - Number(this.answered)) / 1000;
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

if (!CallSchema.options.toJSON) {
	CallSchema.options.toJSON = {};
}

CallSchema.options.toJSON.virtuals = true;

Call = mongoose.model('Call', CallSchema);

module.exports = {User, Pool, Call};
