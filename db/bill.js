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

  deleteBill: function(id, callback) {
    mongo.billDb.deletOne(function (error) {
      callback(error);
    });
  }
};
