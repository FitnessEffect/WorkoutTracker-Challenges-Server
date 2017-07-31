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
    var clientKey = req.body.clientKey || '';
    var exerciseYear = req.body.exerciseYear || '';
    var exerciseWeek = req.body.exerciseWeek || '';

    console.log("YEAR");
    console.log(exerciseYear);
    console.log("WEEK");
    console.log("exerciseWeek");

    console.log("clientKey");
    console.log(clientKey);

    var formattedEmail = formateEmail(challengerEmail);
    var formattedOpponentEmail = formateEmail(opponentEmail);
    console.log("FORMATTED OPPONENT EMAIL");
    console.log(formattedOpponentEmail);
    var exName = "";
    var exDesc = "";

    var intNum = 0;

    function formateEmail(email) {
        var tempEmail = "";
        tempEmail = email.replace("@", "%40");
        tempEmail = tempEmail.split('.').join('%2E');;
        return tempEmail;
    }

    //CHECK IF EXERCISE IS RETRIEVED FROM USER EXERCISES OR CLIENT EXERCISES
    if (clientKey == " ") {
        db.ref().child("users").child(userID).child("Exercises").child(exerciseYear).child(exerciseWeek).child(exerciseKey).once("value", function(snapshot) {
            var e = snapshot.val();
            exerciseRetrieved = e;
            //var keys = Object.keys(e);
            console.log("exercise from user");
            console.log(exerciseRetrieved);
            db.ref().child("emails").child(formattedOpponentEmail).once("value", function(snapshot) {
                var userKey = snapshot.val()
                console.log("USERKEY");
                console.log(userKey);
                exerciseRetrieved["viewed"] = "false";
                db.ref().child("users").child(userKey).child("Challenges").child(exerciseKey).update(exerciseRetrieved);
            });
        });
    } else {
        db.ref().child("users").child(userID).child("Clients").child(clientKey).child("Exercises").child(exerciseYear).child(exerciseWeek).child(exerciseKey).once("value", function(snapshot) {
            var e = snapshot.val();
            exerciseRetrieved = e;
            //var keys = Object.keys(e);
            console.log("exercise from client");
            console.log(exerciseRetrieved);
            db.ref().child("emails").child(formattedOpponentEmail).once("value", function(snapshot) {
                var userKey = snapshot.val()
                console.log(userKey);
                exerciseRetrieved["viewed"] = "false";
                db.ref().child("users").child(userKey).child("Challenges").child(exerciseKey).update(exerciseRetrieved);
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
        });
    }
});

// application.post("/ping", function(req, res, next) {
//     res.send("pong");
// });

application.listen(PORT, function() {
    console.log("The magic happens at port" + PORT);
});
