// Imports dependencies and set up http server
var express = require('express');
var app = express(); // creates express http server
var bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

// Sets server port and logs message on success
app.listen(process.env.PORT || 1337, function () { 
	console.log('webhook is listening')
});


// Server index page
app.get("/", function (req, res) {
  res.send("Deployed!");
});


// Creates the endpoint for our webhook 
app.post('/webhook', function (req, res) {  

  // Checks this is an event from a page subscription
  if (req.body.object === 'page') {

    // Iterates over each entry - there may be multiple if batched
    req.body.entry.forEach(function(entry) {

      // Gets the message. entry.messaging is an array, but 
      // will only ever contain one message, so we get index 0
      let webhookEvent = entry.messaging[0];
      console.log(webhookEvent);
    });

    // Returns a '200 OK' response to all requests
    res.status(200).send('EVENT_RECEIVED');
  } else {
    // Returns a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }

});


// Adds support for GET requests to our webhook
app.get('/webhook', function (req, res) {

  // Your verify token. Should be a random string.
  // var VERIFY_TOKEN = "KAVI"
    
  // Parse the query params
  var mode = req.query['hub.mode'];
  var token = req.query['hub.verify_token'];
  var challenge = req.query['hub.challenge'];
  
  // Checks the mode and token sent is correct
  if (mode === 'subscribe' && token === process.env.VERIFICATION_TOKEN) {
    
    // Responds with the challenge token from the request
    console.log('WEBHOOK_VERIFIED');
    res.status(200).send(challenge);
    
  } else {
    // Responds with '403 Forbidden' if verify tokens do not match
    res.sendStatus(403);      
  }
});

module.exports = app;