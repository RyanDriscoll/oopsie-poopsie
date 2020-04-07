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
