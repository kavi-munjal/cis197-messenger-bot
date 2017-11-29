var mongoose = require('mongoose');
var db = mongoose.connect(process.env.MONGODB_URI);

var billSchema = new mongoose.Schema({
  creator: String,
  title: String,
  amount: Number,
  per_person: Number
});

var eventSchema = new mongoose.Schema({
  creator: String,
  title: String,
  date: String,
  time: String
});

var Bill = mongoose.model('Bill', billSchema);
var Event = mongoose.model('Event', eventSchema);

module.exports = {
  Bill: Bill,
  Event: Event,
  mongoose: mongoose,
  billDb: db.collection('Bill'),
  eventDb: db.collection('Event')
};
