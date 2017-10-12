const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

let User = null;
let Pool = null;

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
	createdDate: {type: Date, index: true, default: Date.now}
});

PoolSchema.methods.getGreeting = function() {
	return this.greeting || 'Thank you for calling, your call will be answered in the order it was received';
};

Pool = mongoose.model('Pool', PoolSchema);

module.exports = {User, Pool};
