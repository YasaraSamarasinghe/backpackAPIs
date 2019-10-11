var mongoose = require('mongoose');
var LoginAttemptSchema = new mongoose.Schema({
    uid: String,
    email: String,
    timestamp : Date
});
mongoose.model('LoginAttempt', LoginAttemptSchema);

module.exports = mongoose.model('LoginAttempt');
