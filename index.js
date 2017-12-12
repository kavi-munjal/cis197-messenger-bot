var express = require('express');
var request = require('request');
var app = express();
var bodyParser = require('body-parser');

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
      	  createTitle(senderId, message)
      	} else {
      	  newItem.amount = message.text;
      	  newItem.per_person = newItem.amount;
      	  billDb.addBill(newItem, function (err) {
	      	if (err !== null) {
	      	  next(err);
	      	  sendMessage(senderId, { text: 'error'});
	        } else {
	      	  sendMessage(senderId, { text: 'success!' });
	        }
	      });
	      billCreator = false;
      	}
      } else if (eventCreator) {
      	eventDb.addEvent(JSON.parse(message.text), function (err) {
	      if (err !== null) {
	      	next(err);
	      	sendMessage(senderId, { text: 'error'});
	      } else {
	      	sendMessage(senderId, { text: 'success!' });
	      }
	    });
      	eventCreator = false;
      } else {
	      switch (formattedMsg) {
	        case 'bills': billDb.getAllBills(function (error, bills) {
	    	  if (error !== null) {
	      	  	next(error);
	      	  	sendMessage(senderId, { text: 'error'});
	    	  } else {
	          	// sendMessage(senderId, { text: JSON.stringify(bills) });
	          	billCarousel(senderId, bills, makeTemplate);
	    	  }
	  		});
	  		break;
	        case 'calendar': eventDb.getAllEvents(function (error, events) {
	    	  if (error !== null) {
	      	  	next(error);
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
	       	  // var form = JSON.stringify({ "creator": "", "title": "", "amount": 0, "per_person": 0 });
	          sendMessage(senderId, { text: "Enter title or 'cancel'" } );
	        break;
	        case 'create event': 
	          eventCreator = true;
	          var form = JSON.stringify({ "creator": "", "title": "", "date": "", "time": "" });
	       	  sendMessage(senderId, { text: 'Copy and paste and add details in form ' + form } );
	          break;
	        case 'cancel': sendMessage(senderId, { text: 
	        	"Try 'create event', 'create bill', 'calendar' or 'bills'" } );
	          break;

	        default:
	          sendMessage(senderId, { text: "I'm not smart enough to respond to that... yet!" + 
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
  	var item = {
      title: bill.title,
      subtitle: "creator: " + bill.creator + ", amount: " + bill.amount + ", per person: " + bill.per_person,
      buttons: [{
        type: "postback",
        title: "Paid",
        payload: "Delete"
      }, {
      	type: "postback",
        title: "Edit",
        payload: "Edit"
      }]
    }
    eleArray.push(item);
  });
  callback(id, eleArray);
}

var eventCarousel = function (id, data, callback) {
  var eleArray = [];
  data.forEach(function (event, index, array) {
  	var item = {
      title: event.title,
      subtitle: "creator: " + event.creator + ", date: " + event.date + ", time: " + event.time,
      buttons: [{
        type: "postback",
        title: "Edit",
        payload: "Edit"
      }, {
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


app.post('/webhook', function (req, res) {  

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

app.get('/webhook', function (req, res) {

  // var VERIFY_TOKEN = 'KAVI'
    
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