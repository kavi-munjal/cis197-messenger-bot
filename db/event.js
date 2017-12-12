var mongo = require('./mongo');

module.exports = {
  getAllEvents: function (callback) {
    mongo.Event.find(function (error, event) {
      callback(error, event);
    });
  },

  addEvent: function (eventData, callback) {
    var event = new mongo.Event(eventData);
    event.save(function (error) {
      callback(error);
    });
  },

  deleteEvent: function (id, callback) {
    mongo.eventDb.deleteOne(id, function (error) {
      callback(error);
    });
  }
};
