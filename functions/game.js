const Deck = require("./deck")

exports.startGame = async (req, res) => {
  try {
    const { ref, body } = req
    const { gameId, players } = body

    const deckSize = 52
    const numPlayers = players.length
    let numCards = 3
    while (numPlayers * numCards > deckSize) {
      numCards--
    }

    const deck = new Deck()

    const hands = {}
    for (let i = numCards; i > 0; i--) {
      players.forEach(player => {
        const card = deck.deal()
        if (hands[player.playerId]) {
          hands[player.playerId].push(card)
        } else {
          hands[player.playerId] = [card]
        }
      })
    }

    const trump = deck.deal().suit

    const currentPlayer =
      players[Math.floor(Math.random() * numPlayers)].playerId

    const roundRef = ref("rounds").push()
    const roundKey = roundRef.key

    const trickRef = ref(`rounds/${roundKey}/tricks`).push()
    const trickKey = trickRef.key

    const updateObj = {}
    updateObj[`games/${gameId}/timestamp`] = new Date()
    updateObj[`games/${gameId}/numPlayers`] = numPlayers
    updateObj[`games/${gameId}/numCards`] = numCards
    updateObj[`games/${gameId}/descending`] = true
    updateObj[`games/${gameId}/roundId`] = roundKey
    updateObj[`games/${gameId}/roundNum`] = 1
    updateObj[`games/${gameId}/numRounds`] = numCards * 2 - 1
    updateObj[`games/${gameId}/currentPlayer`] = currentPlayer
    updateObj[`games/${gameId}/status`] = "bid"
    updateObj[`rounds/${roundKey}/roundId`] = roundKey
    updateObj[`rounds/${roundKey}/trump`] = trump
    updateObj[`rounds/${roundKey}/gameId`] = gameId
    updateObj[`rounds/${roundKey}/tricks/${trickKey}/trickId`] = trickKey

    Object.keys(hands).forEach(playerId => {
      const hand = hands[playerId]
      const sortedHand = deck.sortHand(hand)
      updateObj[`hands/${playerId}/gameId`] = gameId
      sortedHand.forEach(card => {
        const cardRef = ref(`hands/${playerId}/rounds/${roundKey}/cards`).push()
        const cardId = cardRef.key
        updateObj[
          `hands/${playerId}/rounds/${roundKey}/cards/${cardId}`
        ] = Object.assign({}, card, {
          cardId,
          playerId
        })
      })
    })

    await ref().update(updateObj)
    return res.status(200).send("success")
  } catch (error) {
    console.error(`$$>>>>: startGame -> error`, error)
    return res.sendStatus(500)
  }
}

exports.submitBid = async (req, res) => {
  try {
    const { ref, body } = req
    const { playerId, bid, nextPlayerId, gameId, allBidsIn, roundId } = body
    const updateObj = {}

    updateObj[`rounds/${roundId}/bids/${playerId}`] = Number(bid)
    updateObj[`games/${gameId}/currentPlayer`] = nextPlayerId
    if (allBidsIn) {
      updateObj[`games/${gameId}/status`] = "play"
    }
    await ref().update(updateObj)
    return res.status(200).send("success")
  } catch (error) {
    console.error(`$$>>>>: submitBid -> error`, error)
    return res.sendStatus(500)
  }
}

exports.playCard = async (req, res) => {
  try {
    const { ref, body } = req
    const {
      playerId,
      nextPlayerId,
      card,
      leader,
      allCardsIn,
      gameId,
      roundId,
      trickId,
      leadSuit,
      nextRound
    } = body
    const updateObj = {}
    if (leadSuit) {
      updateObj[`rounds/${roundId}/tricks/${trickId}/leadSuit`] = leadSuit
    }
    updateObj[`rounds/${roundId}/tricks/${trickId}/cards/${playerId}`] = card
    updateObj[`rounds/${roundId}/tricks/${trickId}/leader`] = leader
    updateObj[`games/${gameId}/currentPlayer`] = nextPlayerId
    updateObj[`hands/${playerId}/rounds/${roundId}/cards/${card.cardId}`] = null
    if (allCardsIn) {
      updateObj[`games/${gameId}/currentPlayer`] = leader
      updateObj[`rounds/${roundId}/tricks/${trickId}/winner`] = leader

      if (!nextRound) {
        const trickRef = ref(`rounds/${roundId}/tricks`).push()
        const trickKey = trickRef.key
        updateObj[`rounds/${roundId}/tricks/${trickKey}/trickId`] = trickKey
      }
    }
    await ref().update(updateObj)
    return res.status(200).send("success")
  } catch (error) {
    console.error(`$$>>>>: playCard -> error`, error)
    return res.sendStatus(500)
  }
}

exports.nextRound = async (req, res) => {
  try {
    const { ref, body } = req
    const { numCards, roundNum, descending, players, gameId, gameScore } = body
    const updateObj = {}

    const deck = new Deck()

    const hands = {}
    for (let i = numCards; i > 0; i--) {
      players.forEach(player => {
        const card = deck.deal()
        if (hands[player.playerId]) {
          hands[player.playerId].push(card)
        } else {
          hands[player.playerId] = [card]
        }
      })
    }

    const trump = deck.deal().suit
    const roundRef = ref("rounds").push()
    const roundKey = roundRef.key

    const trickRef = ref(`rounds/${roundKey}/tricks`).push()
    const trickKey = trickRef.key

    updateObj[`games/${gameId}/roundId`] = roundKey
    updateObj[`games/${gameId}/roundNum`] = roundNum
    updateObj[`games/${gameId}/status`] = "bid"
    updateObj[`games/${gameId}/numCards`] = numCards
    updateObj[`games/${gameId}/descending`] = descending
    updateObj[`games/${gameId}/score`] = gameScore
    updateObj[`rounds/${roundKey}/roundId`] = roundKey
    updateObj[`rounds/${roundKey}/trump`] = trump
    updateObj[`rounds/${roundKey}/gameId`] = gameId
    updateObj[`rounds/${roundKey}/tricks/${trickKey}/trickId`] = trickKey

    Object.keys(hands).forEach(playerId => {
      const hand = hands[playerId]
      const sortedHand = deck.sortHand(hand)
      updateObj[`hands/${playerId}/gameId`] = gameId
      sortedHand.forEach(card => {
        const cardRef = ref(`hands/${playerId}/rounds/${roundKey}/cards`).push()
        const cardId = cardRef.key
        updateObj[
          `hands/${playerId}/rounds/${roundKey}/cards/${cardId}`
        ] = Object.assign({}, card, {
          cardId,
          playerId
        })
      })
    })
    await ref().update(updateObj)
    return res.status(200).send("success")
  } catch (error) {
    console.log(`$$>>>>: exports.nextRound -> error`, error)
    return res.sendStatus(500)
  }
}
