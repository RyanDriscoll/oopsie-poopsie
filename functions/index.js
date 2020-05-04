const functions = require("firebase-functions")
const express = require("express")
const cors = require("cors")
const admin = require("firebase-admin")
const {
  addPlayer,
  startGame,
  submitBid,
  playCard,
  nextRound,
  newGame,
  updatePlayer
} = require("./game")

admin.initializeApp()

const ref = path => (path ? admin.database().ref(path) : admin.database().ref())

const app = express()

app.use(cors({ origin: true }))

app.use((req, res, next) => {
  req.ref = ref
  next()
})

app.post("/add-player", addPlayer)
app.post("/new-game", newGame)
app.post("/start-game", startGame)
app.post("/submit-bid", submitBid)
app.post("/play-card", playCard)
app.post("/next-round", nextRound)
app.put("/update-player/:playerId/:gameId/:present", updatePlayer)

exports.api = functions.https.onRequest(app)

exports.clearOldGameData = functions.pubsub
  .schedule("0 0 * * 1")
  .timeZone("America/Denver")
  .onRun(async context => {
    const date = new Date()
    date.setDate(date.getDate() - 7)
    const gameSnap = await Promise.all([
      ref("games")
        .orderByChild("timestamp")
        .endAt(date.toISOString())
        .once("value")
    ])

    if (gameSnap.exists()) {
      console.log(`DELETING ${gameSnap.numChildren()} OLD GAMES`)

      const promiseArray = []
      gameSnap.forEach(snap => {
        const game = snap.val()
        const gameId = snap.key
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
        )
      })
      await Promise.all(promiseArray)
    } else {
      console.log("NO OLD GAMES TO DELETE")
    }

    return null
  })
