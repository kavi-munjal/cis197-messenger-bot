var mongo = require ('./mongo');

module.exports = {
  getAllBills: function (callback) {
    mongo.Bill.find(function (error, event) {
      callback(error, event);
    });
  },

  addBill: function (billData, callback) {
    var bill = new mongo.Bill(billData);
    bill.save(function (error) {
      callback(error);
    });
  }

  // containsKey: function (apiKey, callback) {
  //   console.log('Checking if database contains key: %s', apiKey);
  //   mongo.Key.find({key: apiKey}, function (error, result) {
  //     if (error) {
  //       callback(error);
  //     } else {
  //       callback(null, result.length > 0);
  //     }
  //   });
  // }
};
