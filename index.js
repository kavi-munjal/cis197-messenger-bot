var express = require('express');
var request = require('request');
var app = express();
var bodyParser = require('body-parser');
var moment = require('moment-timezone')
moment.tz.setDefault("America/New_York");

var billDb = require('./db/bill');
var eventDb = require('./db/event');

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.listen(process.env.PORT || 1337, function () { 
	console.log('webhook is listening')
});


app.get('/', function (req, res) {
  res.send('Deployed!');
});


var processPostback = function (event) {
  var senderId = event.sender.id;
  var payload = event.postback.payload;
  console.log(payload);

  if (payload === 'Greeting') {
    // Get user's first name from the User Profile API
    // and include it in the greeting
    request({
      url: 'https://graph.facebook.com/v2.6/' + senderId,
      qs: {
        access_token: process.env.PAGE_ACCESS_TOKEN,
        fields: 'first_name'
      },
      method: 'GET'
    }, function (error, response, body) {
      var greeting = '';
      if (error) {
        console.log("Error getting user's name: " +  error);
      } else {
        var bodyObj = JSON.parse(body);
        name = bodyObj.first_name;
        greeting = 'Hi ' + name + '. ';
      }
      var message = greeting + 'My name is Roommate Bot. I can help you and your roomies. ' + 
      'The commands are create event, create bill, calendar, and bills';
      sendMessage(senderId, { text: message });
    });
  }

  if (payload.includes('Delete Bill')) {
  	var billId = payload.slice(12);
  	var query = {};
  	query._id = billId;
  	billDb.deleteAll();
  	billDb.deleteBill(query, function (err) {
  		if (err !== null) {
  		  sendMessage(senderId, { text: "error" });
  		} else {
  		  sendMessage(senderId, { text: "bill paid" });
  		}
  	});
  }
}

var billCreator = false;
var title = false;
var eventCreator = false;
var newItem = {}; 
function processMessage(event) {
  if (!event.message.is_echo) {
    var message = event.message;
    var senderId = event.sender.id;

    console.log('Received message from senderId: ' + senderId);
    console.log('Message is: ' + JSON.stringify(message));

    if (message.text) {
      var formattedMsg = message.text.toLowerCase().trim();
      if (billCreator) {
      	if (formattedMsg === 'cancel') {
      	  billCreator = false;
      	  newItem = {};
      	  sendMessage(senderId, { text: 'cancelled'});
      	} else if (title) {
      	  createTitle(senderId, message);
      	  newItem.createdAt = moment().format();
      	  sendMessage(senderId, { text: "Enter amount or 'cancel'" });
      	} else {
      	  newItem.amount = message.text;
      	  newItem.per_person = newItem.amount;
      	  billDb.addBill(newItem, function (err) {
	      	if (err !== null) {
	      	  sendMessage(senderId, { text: 'error'});
	        } else {
	      	  sendMessage(senderId, { text: 'bill added' });
	        }
	      });
	      billCreator = false;
	      newItem = {};
      	}
      } else if (eventCreator) {
      	if (formattedMsg === 'cancel') {
      	  eventCreator = false;
      	  newItem = {};
      	  sendMessage(senderId, { text: 'cancelled'});
      	} else if (title) {
      	  createTitle(senderId, message);
      	  sendMessage(senderId, { text: "Enter date as MM/DD/YYYY h:mm am/pm or 'cancel'" });
      	} else {
      	  var date = moment(message.text, "MM/DD/YYYY h:mm a").format();
      	  newItem.date = moment.tz(date, "America/New_York").format();
      	  eventDb.addEvent(newItem, function (err) {
	        if (err !== null) {
	      	  sendMessage(senderId, { text: 'error'});
	        } else {
	      	  sendMessage(senderId, { text: 'event added' });
	        }
	      });	      
	      eventCreator = false;
	      newItem = {};
      	}
      } else {
	      switch (formattedMsg) {
	        case 'bills': billDb.getAllBills(function (error, bills) {
	    	  if (error !== null) {
	      	  	sendMessage(senderId, { text: 'error'});
	    	  } else {
	          	// sendMessage(senderId, { text: JSON.stringify(bills) });
	          	billCarousel(senderId, bills, makeTemplate);
	    	  }
	  		});
	  		break;
	        case 'calendar': eventDb.getAllEvents(function (error, events) {
	    	  if (error !== null) {
	      	  	sendMessage(senderId, { text: 'error'});
	    	  } else {
	          	// sendMessage(senderId, { text: JSON.stringify(events) });
	          	eventCarousel(senderId, events, makeTemplate);
	    	  }
	  		});
	        break;
	        case 'create bill':
	          billCreator = true;
	          title = true;
	          sendMessage(senderId, { text: "Enter title or 'cancel'" } );
	        break;
	        case 'create event': 
	          eventCreator = true;
	          title = true;
	       	  sendMessage(senderId, { text: "Enter title or 'cancel'" } );
	          break;
	        case 'cancel': sendMessage(senderId, { text: 
	        	"Try 'create event', 'create bill', 'calendar' or 'bills'" } );
	          break;

	        default:
	          sendMessage(senderId, { text: "I'm not smart enough to respond to that... yet! " + 
	          	"Try 'create event', 'create bill', 'calendar' or 'bills'" } );
	      }
	  }
    } else if (message.attachments) {
      sendMessage(senderId, { text: "Sorry, I don't understand your request."} );
    }
  }
}

var createTitle = function (id, message) {
  request({
    url: 'https://graph.facebook.com/v2.6/' + id,
    qs: {
      access_token: process.env.PAGE_ACCESS_TOKEN,
      fields: 'first_name'
    },
    method: 'GET'
  }, function (error, response, body) {
    if (error) {
      console.log("Error getting user's name: " +  error);
    } else {
      var bodyObj = JSON.parse(body);
      newItem.creator = bodyObj.first_name;
    }
  });
  newItem.title = message.text;
  title = false;
}

var billCarousel = function (id, data, callback) {
  var eleArray = [];
  data.forEach(function (bill, index, array) {
  	var date = moment.tz(bill.createdAt, "America/New_York").format('lll');
  	var item = {
      title: bill.title,
      subtitle: "Amount: " + bill.amount + "\nCreator: " + bill.creator + 
      "\nCreated: " + date,
      buttons: [{
        type: "postback",
        title: "Paid",
        payload: "Delete Bill " + bill._id
      }]
    }
    eleArray.push(item);
  });
  callback(id, eleArray);
}

var eventCarousel = function (id, data, callback) {
  var eleArray = [];
  data.forEach(function (event, index, array) {
  	var date = moment.tz(event.date, "America/New_York").format('lll');
  	var item = {
      title: event.title,
      subtitle: date + "\nCreator: " + event.creator,
      buttons: [{
      	type: "postback",
        title: "Delete",
        payload: "Delete"
      }]
    }
    eleArray.push(item);
  });
  callback(id, eleArray);
}

var makeTemplate = function (id, elements) {
  if (elements.length !== 0) {
  	var message = {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: elements
        }
      }
    };
    sendMessage(id, message);
  } else {
  	sendMessage(id, { text: 'Nothing to show right now' });
  }
}

// sends message to user
var sendMessage = function (recipientId, message) {
  request({
    url: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: process.env.PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: {
      recipient: { id: recipientId },
      message: message,
    }
  }, function (error, response, body) {
    if (error) {
      console.log('Error sending message: ' + response.error);
    }
  });
}


app.post('/webhook', function (req, res, next) {  

  if (req.body.object === 'page') {

    req.body.entry.forEach(function (entry) {

      entry.messaging.forEach(function (event) {
        if (event.postback) {
          processPostback(event);
        } else if (event.message) {
          processMessage(event);
        }
      });
    });

    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

app.get('/webhook', function (req, res, next) {
    
  var mode = req.query['hub.mode'];
  var token = req.query['hub.verify_token'];
  var challenge = req.query['hub.challenge'];
  
  if (mode === 'subscribe' && token === process.env.VERIFICATION_TOKEN) {
    
    console.log('WEBHOOK_VERIFIED');
    res.status(200).send(challenge);
    
  } else {
    res.sendStatus(403);      
  }
});

module.exports = app;