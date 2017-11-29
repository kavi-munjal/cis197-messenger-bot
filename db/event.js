var mongo = require('./mongo');

module.exports = {
  getAllEvents: function (callback) {
    mongo.Event.find(function (error, event) {
      callback(error, event);
    });
  },

  // getReviewsByClassName: function (className, callback) {
  //   mongo.Reviews.find({className: className}).sort({semester: 'desc'}).exec(function (error, reviews) {
  //     callback(error, reviews);
  //   });
  // },

  addEvent: function (eventData, callback) {
    var event = new mongo.Event(eventData);
    event.save(function (error) {
      callback(error);
    });
  }
};
