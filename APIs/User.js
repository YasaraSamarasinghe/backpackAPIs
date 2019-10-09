let mongoose = require('mongoose');
let UserSchema = new mongoose.Schema({
    name: String,
    email: String,
    deviceId: String,
    gender: String,
    height: String,
    weight: String,
    birthday : Date,
    timestamp : Date,
    deleted : Boolean
});
mongoose.model('User', UserSchema);

module.exports = mongoose.model('User');
