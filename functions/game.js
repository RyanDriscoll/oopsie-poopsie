const Deck = require("./deck")

exports.newGame = async (req, res) => {
  try {
    const { ref, body } = req
    const { game, name, numCards, noBidPoints, dirty } = body
    const newGameRef = ref("games").push()
    const gameId = newGameRef.key
    const playerRef = ref(`players`).push()
    const playerId = playerRef.key
    const updateObj = {}
    updateObj[`games/${gameId}/name`] = game
    updateObj[`games/${gameId}/gameId`] = gameId
    updateObj[`games/${gameId}/status`] = "pending"
    updateObj[`games/${gameId}/dirty`] = dirty
    updateObj[`games/${gameId}/noBidPoints`] = noBidPoints
    updateObj[`games/${gameId}/numCards`] = numCards
    updateObj[`players/${playerId}/name`] = name
    updateObj[`players/${playerId}/gameId`] = gameId
    updateObj[`players/${playerId}/host`] = true
    updateObj[`players/${playerId}/playerId`] = playerId
    await ref().update(updateObj)
    return res.status(200).send({ playerId, gameId })
  } catch (error) {
    console.log(`$$>>>>: exports.newGame -> error`, error)
    return res.sendStatus(500)
  }
}

exports.startGame = async (req, res) => {
  try {
    const { ref, body } = req
    let { gameId, players, numCards } = body

    const deckSize = 52
    const numPlayers = players.length
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
    const randomIndex = Math.floor(Math.random() * numPlayers)
    const dealer = players[randomIndex]
    let currentPlayerIndex = randomIndex + 1
    let currentPlayer = players[currentPlayerIndex]
    if (!currentPlayer) {
      currentPlayerIndex = 0
      currentPlayer = players[currentPlayerIndex]
    }

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
    updateObj[`games/${gameId}/currentPlayer`] = currentPlayer.playerId
    updateObj[`games/${gameId}/dealer`] = dealer.playerId
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
    return res.sendStatus(200)
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
    return res.sendStatus(200)
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
    return res.sendStatus(200)
  } catch (error) {
    console.error(`$$>>>>: playCard -> error`, error)
    return res.sendStatus(500)
  }
}

exports.nextRound = async (req, res) => {
  try {
    const { ref, body } = req
    const {
      numCards,
      roundNum,
      descending,
      players,
      gameId,
      gameScore,
      gameOver,
      dealer
    } = body
    const updateObj = {}

    if (gameOver) {
      updateObj[`games/${gameId}/status`] = "over"
      updateObj[`games/${gameId}/score`] = gameScore
    } else {
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

      const formerDealerIndex = players.findIndex(p => p.playerId === dealer)
      let dealerIndex = formerDealerIndex + 1
      let newDealer = players[dealerIndex]
      if (!newDealer) {
        dealerIndex = 0
        newDealer = players[dealerIndex]
      }
      let newCurrentPlayerIndex = dealerIndex + 1
      let newCurrentPlayer = players[newCurrentPlayerIndex]
      if (!newCurrentPlayer) {
        newCurrentPlayerIndex = 0
        newCurrentPlayer = players[newCurrentPlayerIndex]
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
      updateObj[`games/${gameId}/dealer`] = newDealer.playerId
      updateObj[`games/${gameId}/currentPlayer`] = newCurrentPlayer.playerId
      updateObj[`rounds/${roundKey}/roundId`] = roundKey
      updateObj[`rounds/${roundKey}/trump`] = trump
      updateObj[`rounds/${roundKey}/gameId`] = gameId
      updateObj[`rounds/${roundKey}/tricks/${trickKey}/trickId`] = trickKey

      Object.keys(hands).forEach(playerId => {
        const hand = hands[playerId]
        const sortedHand = deck.sortHand(hand)
        updateObj[`hands/${playerId}/gameId`] = gameId
        sortedHand.forEach(card => {
          const cardRef = ref(
            `hands/${playerId}/rounds/${roundKey}/cards`
          ).push()
          const cardId = cardRef.key
          updateObj[
            `hands/${playerId}/rounds/${roundKey}/cards/${cardId}`
          ] = Object.assign({}, card, {
            cardId,
            playerId
          })
        })
      })
    }

    await ref().update(updateObj)
    return res.sendStatus(200)
  } catch (error) {
    console.log(`$$>>>>: exports.nextRound -> error`, error)
    return res.sendStatus(500)
  }
}

exports.addPlayer = async (req, res) => {
  try {
    const { ref, body } = req
    const { playerName, gameId } = body
    const playerRef = ref("players").push()
    const playerId = playerRef.key
    await playerRef.update({
      name: playerName,
      gameId,
      playerId,
      present: true
    })
    return res.status(200).send({ playerId })
  } catch (error) {
    console.log(`$$>>>>: exports.addPlayer -> error`, error)
    return res.sendStatus(500)
  }
}

exports.updatePlayer = async (req, res) => {
  try {
    const { ref, params } = req
    const { playerId, gameId, present } = params
    await ref(`players/${playerId}`).update({
      gameId,
      present: present === "true"
    })
    return res.sendStatus(200)
  } catch (error) {
    console.log(`$$>>>>: exports.updatePlayer -> error`, error)
    return res.sendStatus(500)
  }
}
