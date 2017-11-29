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
      var message = greeting + 'My name is Roommate Bot. I can help you and your roomies';
      sendMessage(senderId, { text: message });
    });
  }
}

var billCreator = false;
var eventCreator = false; 
function processMessage(event) {
  if (!event.message.is_echo) {
    var message = event.message;
    var senderId = event.sender.id;

    console.log('Received message from senderId: ' + senderId);
    console.log('Message is: ' + JSON.stringify(message));

    if (message.text) {
      if (billCreator) {
      	billDb.addBill(JSON.parse(message.text), function (err) {
	      if (err !== null) {
	      	next(err);
	      	sendMessage(senderID, { text: 'error'});
	      } else {
	      	sendMessage(senderId, { text: 'success!' });
	      }
	    });
      	billCreator = false;
      } else if (eventCreator) {
      	eventDb.addEvent(JSON.parse(message.text), function (err) {
	      if (err !== null) {
	      	next(err);
	      	sendMessage(senderID, { text: 'error'});
	      } else {
	      	sendMessage(senderId, { text: 'success!' });
	      }
	    });
      	eventCreator = false;
      } else {
      	  var formattedMsg = message.text.toLowerCase().trim();
	      switch (formattedMsg) {
	        case 'bills': billDb.getAllBills(function (error, bills) {
	    	  if (error !== null) {
	      	  	next(error);
	      	  	sendMessage(senderID, { text: 'error'});
	    	  } else {
	          	sendMessage(senderId, { text: JSON.stringify(bills) });
	    	  }
	  		});
	  		sendMessage(senderId, { text: 'keyword detected!'} );
	  		break;
	        case 'calendar': eventDb.getAllEvents(function (error, events) {
	    	  if (error !== null) {
	      	  	next(error);
	      	  	sendMessage(senderID, { text: 'error'});
	    	  } else {
	          	sendMessage(senderId, { text: JSON.stringify(events) });
	    	  }
	  		});
	  		sendMessage(senderId, { text: 'keyword detected!'} );
	        break;
	        case 'create bill':
	          billCreator = true;
	       	  var form = JSON.stringify({ "creator": "", "title": "", "amount": 0, "per_person": 0 });
	          sendMessage(senderId, { text: 'Copy and paste and add details in form ' + form } );
	        break;
	        case 'create event': 
	          eventCreator = true;
	          var form = JSON.stringify({ "creator": "", "title": "", "date": "", "time": "" });
	       	  sendMessage(senderId, { text: 'Copy and paste and add details in form ' + form } );
	          break;

	        default:
	          sendMessage(senderId, { text: "I'm not smart enough to respond to that... yet!"} );
	      }
	  }
    } else if (message.attachments) {
      sendMessage(senderId, { text: "Sorry, I don't understand your request."} );
    }
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