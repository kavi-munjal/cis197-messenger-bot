var mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI, function (err) {
  if (err && err.message.includes('ECONNREFUSED')) {
    console.log('Error connecting to mongodb database: %s.\nIs "mongod" running?', err.message);
    process.exit(0);
  } else if (err) {
    throw err;
  } else {
    console.log('DB successfully connected');
  }
});
var db = mongoose.connection;

var billSchema = new mongoose.Schema({
  creator: String,
  createdAt: Date,
  title: String,
  amount: Number,
});

var eventSchema = new mongoose.Schema({
  creator: String,
  title: String,
  date: Date,
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
