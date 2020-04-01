const Deck = require("./deck");

exports.startGame = async (req, res) => {
  try {
    const { ref, body } = req;
    const { gameId, players } = body;

    const deckSize = 52;
    const numPlayers = players.length;
    let numCards = 10;
    while (numPlayers * numCards > deckSize) {
      numCards--;
    }

    const deck = new Deck();

    const hands = {};
    for (let i = numCards; i > 0; i--) {
      players.forEach(player => {
        const card = deck.deal();
        if (hands[player.playerId]) {
          hands[player.playerId].push(card);
        } else {
          hands[player.playerId] = [card];
        }
      });
    }

    const updateObj = {};
    updateObj[`games/${gameId}/timestamp`] = new Date();
    updateObj[`games/${gameId}/numPlayers`] = numPlayers;
    updateObj[`games/${gameId}/numCards`] = numCards;
    updateObj[`games/${gameId}/status`] = "active";

    Object.keys(hands).forEach(playerId => {
      const hand = hands[playerId];
      const sortedHand = deck.sortHand(hand);
      updateObj[`hands/${playerId}/gameId`] = gameId;
      sortedHand.forEach(card => {
        const cardRef = ref(`hands/${playerId}/cards`).push();
        const cardId = cardRef.key;
        updateObj[`hands/${playerId}/cards/${cardId}`] = Object.assign(
          {},
          card,
          {
            cardId
          }
        );
      });
    });

    await ref().update(updateObj);
    return res.status(200).send("success");
  } catch (error) {
    console.log(`$$>>>>: error`, error);
    return res.sendStatus(500);
  }
};
