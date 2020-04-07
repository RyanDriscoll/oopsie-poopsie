import fetch from "isomorphic-unfetch"

export const startGame = async ({ gameId, players, numCards }) =>
  fetch("https://us-central1-oh-shit-ac7c3.cloudfunctions.net/api/start-game", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ gameId, players, numCards })
  })

export const playCard = async body =>
  fetch(`https://us-central1-oh-shit-ac7c3.cloudfunctions.net/api/play-card`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  })

export const nextRound = async body =>
  fetch(`https://us-central1-oh-shit-ac7c3.cloudfunctions.net/api/next-round`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  })

export const submitBid = async body =>
  fetch(`https://us-central1-oh-shit-ac7c3.cloudfunctions.net/api/submit-bid`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  })

export const newGame = async body =>
  fetch(`https://us-central1-oh-shit-ac7c3.cloudfunctions.net/api/new-game`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  })

export const addPlayer = async body =>
  fetch(`https://us-central1-oh-shit-ac7c3.cloudfunctions.net/api/add-player`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  })

export const updatePlayer = async ({ playerId, gameId, present }) =>
  fetch(
    `https://us-central1-oh-shit-ac7c3.cloudfunctions.net/api/update-player/${playerId}/${gameId}/${present}`,
    {
      method: "PUT"
    }
  )
