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

app.post('/webhook', function (req, res) {  

  if (req.body.object === 'page') {

    req.body.entry.forEach(function (entry) {

      entry.messaging.forEach(function (event) {
        if (event.postback) {
          processPostback(event);
        }
      });
    });

    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});