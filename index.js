var express = require('express');
var app = express();
var bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.listen(process.env.PORT || 1337, function () { 
	console.log('webhook is listening')
});


app.get("/", function (req, res) {
  res.send("Deployed!");
});


// var processPostback = function (event) {
//   var senderId = event.sender.id;
//   var payload = event.postback.payload;
//   res.send("processed");
// }


app.post('/webhook', function (req, res) {  

  if (req.body.object === 'page') {

    req.body.entry.forEach(function (entry) {

      entry.messaging.forEach(function (event) {
        if (event.postback) {
          // processPostback(event);
          console.log("processing");
          res.send("processed");
        }
      }
    });

    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

app.get('/webhook', function (req, res) {

  // var VERIFY_TOKEN = "KAVI"
    
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