const functions = require('firebase-functions');
const admin = require('firebase-admin');
const firestoreSettings = { timestampsInSnapshots: true };

admin.initializeApp(functions.config().firebase);
const firestore = admin.firestore();
firestore.settings(firestoreSettings);

/**
 * http request triggers the function
 * send out notifications to users who has not clocked in yet
 */
exports.pushFCM = functions.https.onRequest((req, res) => {
  const payload = {
    notification: {
      title: 'Friendly Warning',
      body: 'You may have not clocked in today yet.'
    }
  };
  function push(tokenArray) {
    // prettier-ignore
    return !tokenArray.length ? Promise.resolve()
      : admin.messaging()
          .sendToDevice(tokenArray, payload)
          .then(response =>
            response.results.forEach((result, index) => {
              if (result.error) console.error('Failure sending notification to', tokenArray[index], result.error);
            })
          );
  }
  return firestore
    .collection('users')
    .get()
    .then(snapshotCollection => {
      let tokens = [];
      snapshotCollection.forEach(user => {
        var isEnabled = user.data()['isEnabled'];
        var isClockedIn = user.data()['isClockedIn'];
        var token = user.data()['fcmToken'];
        if (isEnabled && token && !isClockedIn) {
          tokens.push(token);
          console.log('Will send notification to ', user.id, ' => ', token);
        }
      });
      return tokens;
    })
    .then(tokens => push(tokens))
    .then(_ => res.send('ok!'))
    .catch(err => {
      console.error(err);
      return res.status(500).send('Server Error');
    });
});

/**
 * reset isClockedIn variable
 */
exports.reset = functions.https.onRequest((req, res) => {
  let ids = [];
  var users = firestore.collection('users');
  return users
    .get()
    .then(snap => snap.forEach(user => ids.push(user.id)))
    .then(_ =>
      Promise.all(ids.map(id => users.doc(id).update({ isClockedIn: false })))
    )
    .then(_ => res.send('done'))
    .catch(err => {
      console.error(err);
      return res.status(500).send('resetting flags failed.');
    });
});
