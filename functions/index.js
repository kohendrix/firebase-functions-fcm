const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp(functions.config().firebase);

/**
 * http request triggers the function
 * send out notifications to users who has not clocked in yet
 */
exports.pushFCM = functions.https.onRequest((req, res) => {
  const payload = {
    notification: {
      title: "Friendly Warning",
      body: "You may have not clocked in today yet."
    }
  };
  let tokens = [];
  return admin
    .firestore()
    .collection("users")
    .get()
    .then(snapshotCollection => {
      return snapshotCollection.forEach(user => {
        var isEnabled = user.data()["isEnabled"];
        var isClockedIn = user.data()["isClockedIn"];
        var token = user.data()["fcmToken"];
        if (isEnabled && token && !isClockedIn) {
          tokens.push(token);
          console.log("Will send notification to ", user.id, " => ", token);
        }
      });
    })
    .then(_ => admin.messaging().sendToDevice(tokens, payload))
    .then(response => {
      return response.results.forEach((result, index) => {
        console.error(
          "Failure sending notification to",
          tokens[index],
          result.error
        );
      });
    })
    .then(_ => res.send("ok!"))
    .catch(err => {
      console.err(err);
      return res.status(500).send("Server Error");
    });
});
