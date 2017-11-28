var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/cis197hw6', function (err) {
  if (err && err.message.includes('ECONNREFUSED')) {
    console.log('Error connecting to mongodb database: %s.\nIs "mongod" running?', err.message);
    process.exit(0);
  } else if (err) {
    throw err;
  } else {
    console.log('DB successfully connected. Adding seed data...');
  }
});

var db = mongoose.connection;

var billSchema = new mongoose.Schema({
  key: String
});

var eventSchema = new mongoose.Schema({
  className: String,
  semester: String,
  rating: Number,
  text: String
});

var Bill = mongoose.model('Bill', billSchema);
var Event = mongoose.model('Event', eventSchema);

module.exports = {
  Bill: Bill,
  Event: Event,
  mongoose: mongoose,
  db: db.collection('Event')
};
