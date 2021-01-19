const functions = require("firebase-functions");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const admin = require("firebase-admin");
const {
  addPlayer,
  startGame,
  replayGame,
  submitBid,
  playCard,
  nextRound,
  newGame,
  updatePlayer,
} = require("./game");

admin.initializeApp();

const ref = path =>
  path ? admin.database().ref(path) : admin.database().ref();

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cors({ origin: true }));

app.use((req, res, next) => {
  req.ref = ref;
  next();
});

app.post("/add-player", addPlayer);
app.post("/new-game", newGame);
app.post("/start-game", startGame);
app.post("/replay-game", replayGame);
app.post("/submit-bid", submitBid);
app.post("/play-card", playCard);
app.post("/next-round", nextRound);
app.put("/update-player/:playerId/:gameId/:present", updatePlayer);

exports.api = functions.https.onRequest(app);

exports.makeUppercase = functions.database
  .ref("/messages/{pushId}/original/value")
  .onCreate(async (snapshot, context) => {
    // Grab the current value of what was written to the Realtime Database.
    const original = snapshot.val();
    console.log("Uppercasing", context.params.pushId, original);
    const uppercase = original.toUpperCase();

    const parent = await snapshot.ref.parent
      .child("name")
      .once("value")
      .then(snap => snap.val());
    console.log(`$$>>>>: parent`, parent);
    // You must return a Promise when performing asynchronous tasks inside a Functions such as
    // writing to the Firebase Realtime Database.
    // Setting an "uppercase" sibling in the Realtime Database returns a Promise.
    return snapshot.ref.parent.child("uppercase").set(uppercase);
  });

exports.onAllBidsIn = functions.database
  .ref("/rounds/{roundId}/bids/{playerId}")
  .onWrite(async (snapshot, context) => {
    try {
      const { playerId, roundId } = context.params;
      console.log(`$$>>>>: roundId`, roundId, playerId);
      const numBids = snapshot.numChildren();
      // console.log(
      //   `$$>>>>: numBids`,
      //   numBids,
      //   snapshot.ref.parent.parent.child("numPlayers")
      // );

      const roundSnap = await snapshot.ref.parent.parent
        .child("numPlayers")
        .once("value");
      console.log(`$$>>>>: round`, roundSnap.val());
      // console.log(`$$>>>>: numPlayers`, numPlayers);
      // const gameId = snapshot.ref.parent.child("gameId");
      // if (numPlayers === numBids) {
      //   console.log(numPlayer, numBids);
      // }
    } catch (error) {
      console.error(error);
    }
  });

exports.clearOldGameData = functions.pubsub
  .schedule("0 0 * * 1")
  .timeZone("America/Denver")
  .onRun(async context => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    const gameSnap = await ref("games")
      .orderByChild("timestamp")
      .endAt(date.toISOString())
      .once("value");

    if (gameSnap.exists()) {
      console.log(`DELETING ${gameSnap.numChildren()} OLD GAMES`);

      const promiseArray = [];
      gameSnap.forEach(snap => {
        const game = snap.val();
        const gameId = snap.key;
        promiseArray.push(
          ref(`hands`)
            .orderByChild("gameId")
            .equalTo(gameId)
            .once("value")
            .then(snap => snap.ref.remove()),
          ref(`players`)
            .orderByChild("gameId")
            .equalTo(gameId)
            .once("value")
            .then(snap => snap.ref.remove()),
          ref(`rounds`)
            .orderByChild("gameId")
            .equalTo(gameId)
            .once("value")
            .then(snap => snap.ref.remove()),
          snap.ref.remove()
        );
      });
      await Promise.all(promiseArray);
    } else {
      console.log("NO OLD GAMES TO DELETE");
    }

    return null;
  });
