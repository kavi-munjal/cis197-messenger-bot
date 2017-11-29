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

function processMessage(event) {
  if (!event.message.is_echo) {
    var message = event.message;
    var senderId = event.sender.id;

    console.log('Received message from senderId: ' + senderId);
    console.log('Message is: ' + JSON.stringify(message));

    // You may get a text or attachment but not both
    if (message.text) {
      var formattedMsg = message.text.toLowerCase().trim();

      switch (formattedMsg) {
        case 'bills': billDb.getAllBills(function (error, bills) {
    	  if (error !== null) {
      	  	next(error);
      	  	sendMessage(senderID, { text: 'error'});
    	  } else {
          	sendMessage(senderId, { text: bills });
    	  }
  		});
  		sendMessage(senderId, { text: 'keyword detected!'} );
  		break;
        case 'calendar': sendMessage(senderId, { text: 'keyword detected!'} );
        break;
        case 'create bill': billDb.addBill({ creator: 'Kavi', title: 'Stuff', 
        	amount: 5, per_person: 1 }, function (err) {
        	  if (err !== null) {
      			next(err);
      		  } else {
      		  	sendMessage(senderId, { text: 'success!' });
      		  }
        	});
        	sendMessage(senderId, { text: 'keyword detected!'} );
        break;
        case 'create event': sendMessage(senderId, { text: 'keyword detected!'} );
          // getMovieDetail(senderId, formattedMsg);
          break;

        default:
          // findMovie(senderId, formattedMsg);
          sendMessage(senderId, { text: "default"} );
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