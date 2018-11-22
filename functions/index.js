const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp(functions.config().firebase);

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
        var setting = user.data()["setting"];
        var isAppToday = user.data()["isAppToday"];
        var token = user.data()["fcmToken"];
        if (setting && token && !isAppToday) {
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
