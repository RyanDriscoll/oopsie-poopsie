import { Component } from "react";
import fetch from "isomorphic-unfetch";
import Link from "next/link";
import Container from "reactstrap/lib/Container";
import Button from "reactstrap/lib/Button";
import Form from "reactstrap/lib/Form";
import FormGroup from "reactstrap/lib/FormGroup";
import Label from "reactstrap/lib/Label";
import Input from "reactstrap/lib/Input";
import InputGroup from "reactstrap/lib/InputGroup";
import InputGroupAddon from "reactstrap/lib/InputGroupAddon";
import InputGroupText from "reactstrap/lib/InputGroupText";
import Row from "reactstrap/lib/Row";
import Col from "reactstrap/lib/Col";
import Modal from "reactstrap/lib/Modal";
import ModalBody from "reactstrap/lib/ModalBody";
import CombinedContext from "../../context/CombinedContext";
import { ref } from "../../lib/firebase";
import styles from "../../styles/pages/game.module.scss";
import CardRow from "../../components/CardRow";
import { getSource, getColor } from "../../utils/helpers";
import Spinner from "../../components/Spinner";

class Game extends Component {
  state = {
    loading: false,
    game: null,
    players: [],
    playerId: null,
    playerName: "",
    hand: [],
    isHost: false,
    bid: "",
    bids: {},
    tricks: [],
    trickIndex: 0,
    trickWinner: null,
    score: {}
  };

  gameRef;
  playersRef;
  handRef;
  bidRef;
  trickRef;

  async componentDidMount() {
    try {
      const { gameId } = this.props;
      const playerId = localStorage.getItem(`oh-shit-game-${gameId}-player-id`);
      this.setState({ playerId });
      this.listenToPlayers(gameId, playerId);
      this.listenToGame(gameId);
      if (playerId) {
        this.listenToHand(playerId);
        await ref(`players/${playerId}`).update({ present: true, gameId });
      }
    } catch (error) {
      console.error(`$$>>>>: Game -> componentDidMount -> error`, error);
    }
  }

  async componentWillUnmount() {
    const { gameId } = this.props;
    if (this.gameRef) {
      this.gameRef.off();
    }
    if (this.playersRef) {
      this.playersRef.off();
    }
    if (this.handRef) {
      this.handRef.off();
    }
    if (this.bidRef) {
      this.bidRef.off();
    }
    if (this.trickRef) {
      this.trickRef.off();
    }
    const { playerId } = this.state;
    if (playerId) {
      await ref(`players/${playerId}`).update({ present: false, gameId });
    }
  }

  componentDidUpdate(_, prevState) {
    const { playerId } = this.state;
    if (playerId && prevState.playerId !== playerId) {
      this.listenForWindowClose(playerId);
    }
  }

  listenForWindowClose = playerId => {
    const { gameId } = this.props;
    window.addEventListener("beforeunload", event => {
      // Cancel the event as stated by the standard.
      event.preventDefault();
      // Chrome requires returnValue to be set.
      event.returnValue = "";

      ref(`players/${playerId}`).update({ present: false, gameId });
    });
  };

  listenToPlayers = async (gameId, playerId) => {
    try {
      this.playersRef = ref(`players`)
        .orderByChild("gameId")
        .equalTo(gameId);

      await Promise.all([
        this.playersRef.on("child_added", data => {
          const player = data.val();
          this.setState(prevState => {
            const newState = {
              players: [...prevState.players, player]
            };
            if (player.host && player.playerId === playerId) {
              newState.isHost = true;
            }
            return newState;
          });
        }),
        this.playersRef.on("child_changed", data => {
          const player = data.val();
          this.setState(prevState => {
            const updatedPlayers = [...prevState.players];
            const index = updatedPlayers.findIndex(
              p => p.playerId === player.playerId
            );
            updatedPlayers[index] = player;
            const newState = {
              players: updatedPlayers
            };
            return newState;
          });
        })
      ]);
    } catch (error) {
      console.error(`$$>>>>: Game -> listenToPlayers -> error`, error);
    }
  };

  listenToGame = async gameId => {
    try {
      this.gameRef = ref(`games/${gameId}`);
      let initialDataLoaded = false;
      await Promise.all([
        this.gameRef.on("child_added", data => {
          if (initialDataLoaded) {
            let value = data.val();
            const key = data.key;
            if (key === "round") {
              this.listenToRound(value);
            }
            this.setState(prevState => ({
              game: { ...prevState.game, [key]: value }
            }));
          }
        }),
        this.gameRef.on("child_changed", data => {
          if (initialDataLoaded) {
            let value = data.val();
            const key = data.key;
            if (key === "round") {
              this.listenToRound(value);
            }
            this.setState(prevState => ({
              game: { ...prevState.game, [key]: value }
            }));
          }
        }),
        this.gameRef.on("child_removed", data => {
          if (initialDataLoaded) {
            const key = data.key;
            this.setState(prevState => ({
              game: { ...prevState.game, [key]: null }
            }));
          }
        }),
        this.gameRef.once("value").then(data => {
          let game = data.val();
          this.setState({ game });
          this.listenToRound(game.round);
          initialDataLoaded = true;
        })
      ]);
    } catch (error) {
      console.error(`$$>>>>: Game -> listenToGame -> error`, error);
    }
  };

  listenToHand = async playerId => {
    try {
      this.handRef = ref(`hands/${playerId}/cards`);
      await Promise.all([
        this.handRef.on("child_added", data => {
          const card = data.val();
          this.setState(prevState => ({
            hand: [...prevState.hand, card]
          }));
        }),
        this.handRef.on("child_removed", data => {
          const value = data.val();
          const key = data.key;
          this.setState(prevState => ({
            hand: prevState.hand.filter(c => c.cardId !== key)
          }));
        })
      ]);
    } catch (error) {
      console.error(`$$>>>>: Game -> listenToHand -> error`, error);
    }
  };

  listenToRound = async roundId => {
    try {
      if (this.bidRef) {
        this.bidRef.off();
      }
      if (this.trickRef) {
        this.trickRef.off();
      }
      this.bidRef = ref(`rounds/${roundId}/bids`);
      this.trickRef = ref(`rounds/${roundId}/tricks`);
      await Promise.all([
        this.bidRef.on("child_added", data => {
          const bid = data.val();
          this.setState(prevState => ({
            bids: { ...prevState.bids, [bid.playerId]: bid }
          }));
        }),
        this.trickRef.on("child_added", data => {
          const trick = data.val();
          this.setState(prevState => {
            const newTricks = [...prevState.tricks, trick];
            const score = this.getScore(newTricks);

            return {
              tricks: newTricks,
              score
            };
          });
        }),
        this.trickRef.on("child_changed", data => {
          const trick = data.val();
          this.setState(prevState => {
            const newTricks = [...prevState.tricks];
            const trickIndex = newTricks.findIndex(
              t => t.trickId === trick.trickId
            );
            newTricks[trickIndex] = trick;
            const score = this.getScore(newTricks);
            const newState = {
              tricks: newTricks,
              score
            };
            if (trick.winner) {
              newState.winner = trick.winner;
            }
            return newState;
          });
        }),
        this.trickRef.once("value").then(data => {
          const tricks = data.val();
          let trickIndex = Object.values(tricks || {}).length - 1;
          if (trickIndex === -1) {
            trickIndex = 0;
          }
          this.setState({ trickIndex });
        })
      ]);
    } catch (error) {
      console.error(`$$>>>>: Game -> listenToRound -> error`, error);
    }
  };

  addPlayer = async () => {
    try {
      this.setState({ loading: true });
      const { gameId } = this.props;
      const { playerName } = this.state;
      const playerRef = ref("players").push();
      const playerId = playerRef.key;
      await playerRef.update({
        name: playerName,
        gameId,
        playerId,
        present: true
      });
      localStorage.setItem(`oh-shit-game-${gameId}-player-id`, playerId);
      this.setState({ playerId });
      this.listenToHand(playerId);
      this.setState({ loading: false });
    } catch (error) {
      this.setState({ loading: false });
      console.error(`$$>>>>: Game -> addPlayer -> error`, error);
    }
  };

  startGame = async () => {
    try {
      this.setState({ loading: true });
      const { gameId } = this.props;
      let { players } = this.state;
      const response = await fetch(
        "https://us-central1-oh-shit-ac7c3.cloudfunctions.net/api/start-game",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ gameId, players })
        }
      );
      this.setState({ loading: false });
    } catch (error) {
      this.setState({ loading: false });
      console.error(`$$>>>>: Game -> startGame -> error`, error);
    }
  };

  isLegal = ({ hand, card, leadSuit }) => {
    if (!leadSuit) return true;
    const hasSuit = hand.some(c => c.suit === leadSuit);
    if (hasSuit) {
      return card.suit === leadSuit;
    }
    return true;
  };

  calculateLeader = ({ cards, trump, leadSuit }) =>
    cards.sort((a, b) => {
      if (a.suit === trump && b.suit !== trump) {
        return -1;
      }
      if (b.suit === trump && a.suit !== trump) {
        return 1;
      }
      if (a.suit === leadSuit && b.suit !== leadSuit) {
        return -1;
      }
      if (b.suit === leadSuit && a.suit !== leadSuit) {
        return 1;
      }
      return b.rank - a.rank;
    })[0];

  getScore = tricks => {
    return tricks.reduce((scoreObj, tr) => {
      const newScoreObj = { ...scoreObj };
      if (tr.winner) {
        if (!newScoreObj[tr.winner]) {
          newScoreObj[tr.winner] = 0;
        }
        newScoreObj[tr.winner] += 1;
      }
      return newScoreObj;
    }, {});
  };

  getNextPlayer = () => {
    const { playerId, players } = this.state;
    const playerIndex = players.findIndex(p => p.playerId === playerId);
    let nextPlayerIndex = playerIndex + 1;
    if (nextPlayerIndex === players.length) {
      nextPlayerIndex = 0;
    }
    return players[nextPlayerIndex].playerId;
  };

  playCard = async card => {
    try {
      this.setState({ loading: true });
      const { game, hand, tricks, trickIndex, playerId } = this.state;
      const trick = tricks[trickIndex];
      let leadSuit;
      if (!trick.cards || !Object.values(trick.cards).length) {
        leadSuit = card.suit;
      }
      if (trick.leadSuit) {
        leadSuit = trick.leadSuit;
      }
      if (
        game &&
        game.status === "play" &&
        game.currentPlayer &&
        game.currentPlayer === playerId &&
        this.isLegal({ hand, card, leadSuit })
      ) {
        const allCards = [...Object.values(trick.cards || {}), card];
        const allCardsIn = allCards.length === game.numPlayers;

        let leader = this.calculateLeader({
          cards: allCards,
          trump: game.trump,
          leadSuit: leadSuit || trick.leadSuit
        });
        if (leader) {
          leader = leader.playerId;
        }
        const nextPlayerId = this.getNextPlayer();
        const response = await fetch(
          `https://us-central1-oh-shit-ac7c3.cloudfunctions.net/api/play-card`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              playerId,
              nextPlayerId,
              card,
              leader,
              allCardsIn,
              gameId: game.gameId,
              roundId: game.round,
              trickId: trick.trickId,
              leadSuit
            })
          }
        );
      }
      this.setState({ loading: false });
    } catch (error) {
      this.setState({ loading: false });
      console.error(`$$>>>>: Game -> error`, error);
    }
    const { game, playerId } = this.state;
  };

  submitBid = async () => {
    try {
      this.setState({ loading: true });
      const { gameId } = this.props;
      const { bid, playerId, game, bids, players } = this.state;
      const { numPlayers, round } = game;
      const allBidsIn = (Object.keys(bids).length = numPlayers);
      const nextPlayerId = this.getNextPlayer();
      const response = await fetch(
        `https://us-central1-oh-shit-ac7c3.cloudfunctions.net/api/submit-bid`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            gameId,
            playerId,
            nextPlayerId,
            bid,
            allBidsIn,
            round
          })
        }
      );
      this.setState({ bid: "", loading: false });
    } catch (error) {
      this.setState({ loading: false });
      console.error(`$$>>>>: Game -> error`, error);
    }
  };

  handleChange = e => {
    let { value, name } = e.target;
    if (name !== "bid" || value === "" || /^(?:[0-9]|[1-9]|10)$/.test(value)) {
      this.setState({
        [name]: value
      });
    }
  };

  getWinner = playerId =>
    this.state.players.find(p => p.playerId === playerId).name;

  closeModal = e => {
    this.setState(prevState => ({
      trickIndex: prevState.trickIndex + 1,
      winner: null
    }));
  };

  render() {
    const {
      game,
      players,
      playerId,
      playerName,
      isHost,
      hand,
      bid,
      bids,
      tricks,
      trickIndex,
      score,
      loading,
      winner
    } = this.state;
    let name, status, trump, currentPlayer, leadSuit;
    if (game) {
      name = game.name;
      status = game.status;
      trump = game.trump;
      currentPlayer = game.currentPlayer;
    }

    const trick = tricks[trickIndex];
    if (trick) {
      leadSuit = trick.leadSuit;
    }
    return (
      <>
        <Container className={styles.game_page}>
          <Row className="mb-5">
            <Col sm="6">
              {name && <h2 style={{ textDecoration: "underline" }}>{name}</h2>}
            </Col>
            <Col sm="6">
              <Row className="justify-content-end align-items-center">
                {leadSuit && (
                  <>
                    <h3 className="mr-3">LEAD: </h3>
                    <div style={{ width: 50, marginRight: 50 }}>
                      <img
                        style={{ objectFit: "contain" }}
                        src={getSource(leadSuit)}
                      />
                    </div>
                  </>
                )}
                {trump && (
                  <>
                    <h3 className="mr-3">TRUMP: </h3>
                    <div style={{ width: 50 }}>
                      <img
                        style={{ objectFit: "contain" }}
                        src={getSource(trump)}
                      />
                    </div>
                  </>
                )}
              </Row>
            </Col>
          </Row>
          {!playerId && (
            <Row>
              <Form>
                <FormGroup>
                  <Label for="name">User Name</Label>
                  <Input
                    type="text"
                    name="playerName"
                    id="name"
                    value={playerName}
                    onChange={this.handleChange}
                  />
                </FormGroup>
                <Button onClick={this.addPlayer}>ADD PLAYER</Button>
              </Form>
            </Row>
          )}
          <ul>
            {players.map(player => {
              return (
                <li
                  key={player.playerId}
                  className={
                    currentPlayer === player.playerId
                      ? styles.current_player_container
                      : ""
                  }
                >
                  <Row>
                    <Col sm="4">
                      <h2
                        className={
                          currentPlayer === player.playerId
                            ? styles.current_player
                            : ""
                        }
                        style={
                          !player.present
                            ? { opacity: 0.5, fontStyle: "italic" }
                            : {}
                        }
                      >
                        {player.name}
                      </h2>
                    </Col>
                    {bids[player.playerId] != null ? (
                      <>
                        <Col sm="2">
                          <h2>{`Bid: ${bids[player.playerId].bid}`}</h2>
                        </Col>
                        <Col sm="2">
                          <h2>{`Won: ${score[player.playerId] || "0"}`}</h2>
                        </Col>
                        {trick && trick.cards && trick.cards[player.playerId] && (
                          <Col sm="2">
                            <div className={styles.card}>
                              <img
                                src={getSource(
                                  trick.cards[player.playerId].suit
                                )}
                              />
                              <h2
                                style={{
                                  color: getColor(
                                    trick.cards[player.playerId].suit
                                  )
                                }}
                              >
                                {trick.cards[player.playerId].value}
                              </h2>
                            </div>
                          </Col>
                        )}
                      </>
                    ) : (
                      <Col sm="2">
                        {playerId === player.playerId &&
                          currentPlayer === playerId && (
                            <Form>
                              <InputGroup>
                                <Input
                                  data-lpignore="true"
                                  type="text"
                                  value={bid}
                                  name="bid"
                                  id="bid"
                                  onChange={this.handleChange}
                                />
                                <InputGroupAddon addonType="append">
                                  <Button onClick={this.submitBid}>BID</Button>
                                </InputGroupAddon>
                              </InputGroup>
                            </Form>
                          )}
                      </Col>
                    )}
                  </Row>
                </li>
              );
            })}
          </ul>
          {isHost && status && status === "pending" && (
            <Row>
              <Button color="success" onClick={this.startGame}>
                START GAME
              </Button>
            </Row>
          )}
        </Container>
        <CardRow cards={hand} playCard={this.playCard} />
        <Modal isOpen={Boolean(winner)} toggle={this.closeModal}>
          <ModalBody>
            <Container>
              {winner && <h2>{`${this.getWinner(winner)} won!`}</h2>}
              <Button onClick={this.closeModal}>CLOSE</Button>
            </Container>
          </ModalBody>
        </Modal>
        <Spinner loading={loading} />
      </>
    );
  }
}

Game.contextType = CombinedContext;

Game.getInitialProps = context => {
  const { req, query } = context;
  const { gameId } = query;

  return { gameId };
};

export default Game;
