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
	      	sendMessage(senderId, { text: 'error'});
	      } else {
	      	sendMessage(senderId, { text: 'success!' });
	      }
	    });
      	billCreator = false;
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
      	  var formattedMsg = message.text.toLowerCase().trim();
	      switch (formattedMsg) {
	        case 'bills': billDb.getAllBills(function (error, bills) {
	    	  if (error !== null) {
	      	  	next(error);
	      	  	sendMessage(senderId, { text: 'error'});
	    	  } else {
	          	// sendMessage(senderId, { text: JSON.stringify(bills) });
	          	makeCarousel(senderId, bills);
	    	  }
	  		});
	  		break;
	        case 'calendar': eventDb.getAllEvents(function (error, events) {
	    	  if (error !== null) {
	      	  	next(error);
	      	  	sendMessage(senderId, { text: 'error'});
	    	  } else {
	          	sendMessage(senderId, { text: JSON.stringify(events) });
	    	  }
	  		});
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

var makeCarousel = function (id, data) {
  var eleArray = [];
  data.forEach(function (bill, index, array) {
  	var item = {
      title: bill.title,
      subtitle: JSON.stringify(bill),
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
  makeTemplate(id, eleArray);
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