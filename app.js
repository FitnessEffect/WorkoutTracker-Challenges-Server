var express = require('express');
var application = express();
var bodyparser = require('body-parser');
var apn = require('apn');

var exerciseRetrieved = "";

// var admin = require('firebase-admin'); <-- install this
// admin is allowed to traverse any tree if the rules says it can
var admin = require("firebase-admin");

var serviceAccount = require("./service-account.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://workouttracker-b62a5.firebaseio.com",
    databaseAuthVariableOverride: {
        uid: "greatcow"
    }
});

var db = admin.database();

const PORT = process.argv[2] || 3001;

var jsonParser = bodyparser.json();

application.use(jsonParser);
application.use(bodyparser.urlencoded({
    extended: true,
}));

//receiving post request and sending notification
application.post('/challenges', function(req, res, next) {
    console.log("INFO");
    console.log(req.body);

    //retrieve INFO
    var exerciseKey = req.body.exerciseKey || '';
    var userID = req.body.userID || '';
    var opponentEmail = req.body.opponentEmail || '';
    var challengerEmail = req.body.userEmail || '';


    var formattedEmail = formateEmail(challengerEmail);
    var formattedOpponentEmail = formateEmail(opponentEmail);
    var exName = "";
    var exDesc = "";

    var intNum = 0;

    function formateEmail(email){
       var tempEmail = ""
       tempEmail = email.replace("@", "%40");
       tempEmail = tempEmail.replace(".", "%2E");
       return tempEmail
   }

    db.ref().child("users").child(userID).child("Exercises").child(exerciseKey).once("value", function(snapshot) {
        var e = snapshot.val();
        exerciseRetrieved = e;
        //var keys = Object.keys(e);

        console.log(formattedOpponentEmail);
        console.log(exerciseRetrieved);
    db.ref().child("emails").child(formattedOpponentEmail).once("value", function(snapshot){
      var userKey = snapshot.val()
      console.log(userKey);

      db.ref().child("users").child(userKey).child("Challenges").child(exerciseKey).update(exerciseRetrieved);
    });


    db.ref().child("notification").child(formattedOpponentEmail).once("value", function(snapshot){
      var num = snapshot.val();
      intNum = parseInt(num, 10);

      //if (isNaN(parsedNum)) return;

      intNum = intNum + 1;
      db.ref().child("notification").update({[formattedOpponentEmail]:intNum});
    });

        //Set up apn with the APNs Auth Key
        var apnProvider = new apn.Provider({
            token: {
                key: 'apns.p8', // Path to the key p8 file
                keyId: '35WXBSSCNU', // The Key ID of the p8 file (available at https://developer.apple.com/account/ios/certificate/key)
                teamId: 'JF325HQHWJ', // The Team ID of your Apple Developer Account (available at https://developer.apple.com/account/#/membership/)
            },
            production: false // Set to true if sending a notification to a production iOS app
        });

        //perform look up using email to find key
        db.ref().child("token").once("value", function(snapshot) {
            var emails = snapshot.val();
            console.log("DICTIONARY");
            console.log(emails);

            let deviceToken = emails[formattedOpponentEmail];

            console.log(deviceToken);
            // Prepare a new notification
            var notification = new apn.Notification();

            // Specify your iOS app's Bundle ID (accessible within the project editor)
            notification.topic = 'com.stefan.auvergne.WorkoutTracker';

            // Set expiration to 1 hour from now (in case device is offline)
            notification.expiry = Math.floor(Date.now() / 1000) + 3600;

            // Set app badge indicator
            notification.badge = intNum;

            // Play ping.aiff sound when the notification is received
            notification.sound = 'ping.aiff';

            // Display the following message (the actual notification text, supports emoji)

            //pull email out and send
            notification.alert = challengerEmail + " sent you a challenge!";

            // Send any extra payload data with the notification which will be accessible to your app in didReceiveRemoteNotification
            notification.payload = {
                exercise: exerciseRetrieved
            };

            // Actually send the notification
            apnProvider.send(notification, deviceToken).then(function(result) {
                // Check the result for any failed devices
                console.log(JSON.stringify(result));
                console.log(result);
            });

            //server response
            res.status(200).send();
            });
        });
});

application.post("/ping", function(req, res, next) {
    res.send("pong");
});

application.listen(PORT, function() {
    console.log("The magic happens at port" + PORT);
});
