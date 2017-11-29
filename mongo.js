var mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI);
var db = mongoose.connection;

var billSchema = new mongoose.Schema({
  creator: String,
  title: String,
  amount: Number,
  per_person: Number
});

var eventSchema = new mongoose.Schema({
  creator: String,
  title: String,
  fate: String,
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
