export const absoluteUrl = (req, setLocalhost) => {
  let protocol = "https:"
  let host = req
    ? req.headers["x-forwarded-host"] || req.headers["host"]
    : window.location.host
  if (host.indexOf("localhost") > -1) {
    if (setLocalhost) host = setLocalhost
    protocol = "http:"
  }
  return {
    protocol: protocol,
    host: host,
    origin: protocol + "//" + host
  }
}

export const getColor = suit =>
  suit === "C" || suit === "S" ? "#000" : "#db0007"
export const getSource = suit => {
  switch (suit) {
    case "C":
      return "/images/club.png"
    case "H":
      return "/images/heart.png"
    case "S":
      return "/images/spade.png"
    case "D":
      return "/images/diamond.png"
  }
}

export const isLegal = ({ hand, card, leadSuit }) => {
  if (!leadSuit) return true
  const hasSuit = hand.some(c => c.suit === leadSuit)
  if (hasSuit) {
    return card.suit === leadSuit
  }
  return true
}

export const calculateLeader = ({ cards, trump, leadSuit }) =>
  cards.sort((a, b) => {
    if (a.suit === trump && b.suit !== trump) {
      return -1
    }
    if (b.suit === trump && a.suit !== trump) {
      return 1
    }
    if (a.suit === leadSuit && b.suit !== leadSuit) {
      return -1
    }
    if (b.suit === leadSuit && a.suit !== leadSuit) {
      return 1
    }
    return b.rank - a.rank
  })[0]

export const getScore = tricks => {
  return tricks.reduce((scoreObj, tr) => {
    const newScoreObj = { ...scoreObj }
    if (tr.winner) {
      if (!newScoreObj[tr.winner]) {
        newScoreObj[tr.winner] = 0
      }
      newScoreObj[tr.winner] += 1
    }
    return newScoreObj
  }, {})
}

export const getNextPlayer = ({ playerId, players }) => {
  const playerIndex = players.findIndex(p => p.playerId === playerId)
  let nextPlayerIndex = playerIndex + 1
  if (nextPlayerIndex === players.length) {
    nextPlayerIndex = 0
  }
  return players[nextPlayerIndex].playerId
}

export const getWinner = ({ winner, players }) =>
  players.find(p => p.playerId === winner).name

export const calculateGameScore = ({
  players,
  bids,
  roundScore,
  score,
  noBidPoints
}) => {
  const newGameScore = { ...score }
  players.forEach(player => {
    const bidsMade = bids[player.playerId]
    let tricksWon = roundScore[player.playerId] || 0
    let newScore = tricksWon && !noBidPoints ? tricksWon : 0
    if (bidsMade === tricksWon) {
      if (noBidPoints) {
        newScore = tricksWon
      }
      newScore += 10
    }
    if (newGameScore[player.playerId]) {
      newGameScore[player.playerId] += newScore
    } else {
      newGameScore[player.playerId] = newScore
    }
  })
  return newGameScore
}

export const getAvailableTricks = ({ numCards, bids }) =>
  numCards - Object.values(bids || {}).reduce((num, bid) => num + bid, 0)
