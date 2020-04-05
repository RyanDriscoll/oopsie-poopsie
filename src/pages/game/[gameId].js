import { Component } from "react"
import fetch from "isomorphic-unfetch"
import Link from "next/link"
import Container from "reactstrap/lib/Container"
import Button from "reactstrap/lib/Button"
import Form from "reactstrap/lib/Form"
import FormGroup from "reactstrap/lib/FormGroup"
import Label from "reactstrap/lib/Label"
import Input from "reactstrap/lib/Input"
import InputGroup from "reactstrap/lib/InputGroup"
import InputGroupAddon from "reactstrap/lib/InputGroupAddon"
import InputGroupText from "reactstrap/lib/InputGroupText"
import Row from "reactstrap/lib/Row"
import Col from "reactstrap/lib/Col"
import Modal from "reactstrap/lib/Modal"
import ModalBody from "reactstrap/lib/ModalBody"
import CombinedContext from "../../context/CombinedContext"
import { ref } from "../../lib/firebase"
import styles from "../../styles/pages/game.module.scss"
import CardRow from "../../components/CardRow"
import {
  getSource,
  getColor,
  calculateLeader,
  getNextPlayer,
  isLegal,
  getScore,
  calculateGameScore,
  getWinner,
  getAvailableTricks
} from "../../utils/helpers"
import Spinner from "../../components/Spinner"
import Players from "../../components/Players"
import { withRouter } from "next/router"

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
    roundScore: {},
    showScore: false,
    showYourTurn: false,
    trump: ""
  }

  gameRef
  playersRef
  handRef
  bidRef
  trickRef
  trumpRef

  async componentDidMount() {
    try {
      const { gameId } = this.props
      const { game } = this.state
      const playerId = localStorage.getItem(`oh-shit-game-${gameId}-player-id`)
      this.setState({ playerId })
      this.listenToPlayers(gameId, playerId)
      if (playerId) {
        this.listenToGame({ gameId, playerId })
        await ref(`players/${playerId}`).update({ present: true, gameId })
      }
    } catch (error) {
      console.error(`$$>>>>: Game -> componentDidMount -> error`, error)
    }
  }

  async componentWillUnmount() {
    const { gameId } = this.props
    if (this.gameRef) {
      this.gameRef.off()
    }
    if (this.playersRef) {
      this.playersRef.off()
    }
    if (this.handRef) {
      this.handRef.off()
    }
    if (this.bidRef) {
      this.bidRef.off()
    }
    if (this.trickRef) {
      this.trickRef.off()
    }
    if (this.trumpRef) {
      this.trumpRef.off()
    }
    const { playerId } = this.state
    if (playerId) {
      await ref(`players/${playerId}`).update({ present: false, gameId })
    }
  }

  componentDidUpdate(_, prevState) {
    const { playerId } = this.state
    if (playerId && prevState.playerId !== playerId) {
      this.listenForWindowClose(playerId)
    }
  }

  listenForWindowClose = playerId => {
    const { gameId } = this.props
    window.addEventListener("beforeunload", event => {
      // Cancel the event as stated by the standard.
      event.preventDefault()
      // Chrome requires returnValue to be set.
      event.returnValue = ""

      ref(`players/${playerId}`).update({ present: false, gameId })
    })
  }

  listenToPlayers = async (gameId, playerId) => {
    try {
      this.playersRef = ref(`players`)
        .orderByChild("gameId")
        .equalTo(gameId)

      await Promise.all([
        this.playersRef.on("child_added", data => {
          const player = data.val()
          this.setState(prevState => {
            const newState = {
              players: [...prevState.players, player]
            }
            if (player.host && player.playerId === playerId) {
              newState.isHost = true
            }
            return newState
          })
        }),
        this.playersRef.on("child_changed", data => {
          const player = data.val()
          this.setState(prevState => {
            const updatedPlayers = [...prevState.players]
            const index = updatedPlayers.findIndex(
              p => p.playerId === player.playerId
            )
            updatedPlayers[index] = player
            const newState = {
              players: updatedPlayers
            }
            return newState
          })
        })
      ])
    } catch (error) {
      console.error(`$$>>>>: Game -> listenToPlayers -> error`, error)
    }
  }

  listenToGame = async ({ gameId, playerId }) => {
    try {
      this.gameRef = ref(`games/${gameId}`)
      await Promise.all([
        this.gameRef.on("child_added", data => {
          let value = data.val()
          const key = data.key
          if (key === "roundId") {
            this.listenToRound(value)
            this.listenToHand({ playerId, roundId: value })
          }
          this.setState(prevState => ({
            game: { ...prevState.game, [key]: value }
          }))
          // if (key === "currentPlayer" && value === playerId) {
          //   this.setState({ showYourTurn: true })
          // }
        }),
        this.gameRef.on("child_changed", data => {
          let value = data.val()
          const key = data.key
          // handle end of game status: 'over'
          this.setState(prevState =>
            key === "roundId"
              ? {
                  showScore: true,
                  game: { ...prevState.game, [key]: value }
                }
              : {
                  game: { ...prevState.game, [key]: value }
                }
          )
          // if (key === "currentPlayer" && value === playerId) {
          //   this.setState({ showYourTurn: true })
          // }
        }),
        this.gameRef.on("child_removed", data => {
          const key = data.key
          this.setState(prevState => ({
            game: { ...prevState.game, [key]: null }
          }))
        })
      ])
    } catch (error) {
      console.error(`$$>>>>: Game -> listenToGame -> error`, error)
    }
  }

  listenToHand = async ({ playerId, roundId }) => {
    if (!this.state.hand.length) {
      try {
        this.handRef = ref(`hands/${playerId}/rounds/${roundId}/cards`)
        await Promise.all([
          this.handRef.on("child_added", data => {
            const card = data.val()
            this.setState(prevState => ({
              hand: [...prevState.hand, card]
            }))
          }),
          this.handRef.on("child_removed", data => {
            const value = data.val()
            const key = data.key
            this.setState(prevState => ({
              hand: prevState.hand.filter(c => c.cardId !== key)
            }))
          })
        ])
      } catch (error) {
        console.error(`$$>>>>: Game -> listenToHand -> error`, error)
      }
    }
  }

  listenToTrump = async roundId => {
    try {
      this.trumpRef = ref(`rounds/${roundId}/trump`)
      if (this.trumpRef) {
        this.trumpRef.off()
      }
      this.trumpRef.on("value", data => {
        const trump = data.val()
        this.setState(prevState => ({
          trump
        }))
      })
    } catch (error) {
      console.error(`$$>>>>: error`, error)
    }
  }

  listenToTrick = async roundId => {
    try {
      if (this.trickRef) {
        this.trickRef.off()
      }
      this.trickRef = ref(`rounds/${roundId}/tricks`)
      let initialDataLoaded = false
      await Promise.all([
        this.trickRef.on("child_added", data => {
          if (initialDataLoaded) {
            const trick = data.val()
            this.setState(prevState => {
              const newTricks = [...prevState.tricks, trick]
              const roundScore = getScore(newTricks)

              return {
                tricks: newTricks,
                roundScore
              }
            })
          }
        }),
        this.trickRef.on("child_changed", data => {
          if (initialDataLoaded) {
            const trick = data.val()
            this.setState(prevState => {
              const newTricks = [...prevState.tricks]
              const trickIndex = newTricks.findIndex(
                t => t.trickId === trick.trickId
              )
              newTricks[trickIndex] = trick
              const roundScore = getScore(newTricks)
              const newState = {
                tricks: newTricks,
                roundScore
              }
              if (trick.winner) {
                newState.winner = trick.winner
              }
              return newState
            })
          }
        }),
        this.trickRef.once("value").then(data => {
          const tricks = Object.values(data.val() || {})
          let trickIndex = tricks.length - 1
          if (trickIndex === -1) {
            trickIndex = 0
          }
          const roundScore = getScore(tricks)
          this.setState({ trickIndex, tricks, roundScore })
          initialDataLoaded = true
        })
      ])
    } catch (error) {
      console.error(`$$>>>>: error`, error)
    }
  }

  listenToBid = async roundId => {
    try {
      if (this.bidRef) {
        this.bidRef.off()
      }
      this.bidRef = ref(`rounds/${roundId}/bids`)
      let initialDataLoaded = false
      await Promise.all([
        this.bidRef.on("child_added", data => {
          if (initialDataLoaded) {
            const bid = data.val()
            const playerId = data.key
            this.setState(prevState => ({
              bids: {
                ...prevState.bids,
                [playerId]: bid
              }
            }))
          }
        }),
        this.bidRef.once("value").then(data => {
          const bids = data.val()
          this.setState({ bids })
          initialDataLoaded = true
        })
      ])
    } catch (error) {
      console.error(`$$>>>>: error`, error)
    }
  }

  listenToRound = roundId => {
    try {
      this.setState(
        {
          trump: "",
          bids: {},
          tricks: []
        },
        async () => {
          await Promise.all([
            this.listenToTrump(roundId),
            this.listenToTrick(roundId),
            this.listenToBid(roundId)
          ])
        }
      )
    } catch (error) {
      console.error(`$$>>>>: Game -> listenToRound -> error`, error)
    }
  }

  addPlayer = async () => {
    try {
      this.setState({ loading: true })
      const { gameId } = this.props
      const { playerName } = this.state
      const playerRef = ref("players").push()
      const playerId = playerRef.key
      await playerRef.update({
        name: playerName,
        gameId,
        playerId,
        present: true
      })
      localStorage.setItem(`oh-shit-game-${gameId}-player-id`, playerId)
      this.setState({ playerId })
      this.listenToGame({ gameId, playerId })
      this.setState({ loading: false })
    } catch (error) {
      this.setState({ loading: false })
      console.error(`$$>>>>: Game -> addPlayer -> error`, error)
    }
  }

  startGame = async () => {
    try {
      this.setState({ loading: true })
      const { gameId } = this.props
      let { players } = this.state
      const response = await fetch(
        "https://us-central1-oh-shit-ac7c3.cloudfunctions.net/api/start-game",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ gameId, players })
        }
      )
      this.setState({ loading: false })
    } catch (error) {
      this.setState({ loading: false })
      console.error(`$$>>>>: Game -> startGame -> error`, error)
    }
  }

  playCard = async card => {
    try {
      this.setState({ loading: true })
      const {
        game,
        hand,
        tricks,
        trickIndex,
        playerId,
        players,
        trump
      } = this.state
      const trick = tricks[trickIndex]
      let leadSuit
      if (!trick || !trick.cards || !Object.values(trick.cards).length) {
        leadSuit = card.suit
      }
      if (trick.leadSuit) {
        leadSuit = trick.leadSuit
      }
      if (
        game &&
        game.status === "play" &&
        game.currentPlayer &&
        game.currentPlayer === playerId &&
        isLegal({ hand, card, leadSuit })
      ) {
        const allCards = [...Object.values(trick.cards || {}), card]
        const allCardsIn = allCards.length === game.numPlayers
        const nextRound = allCardsIn && hand.length === 1

        let leader = calculateLeader({
          cards: allCards,
          trump,
          leadSuit: leadSuit || trick.leadSuit
        })
        if (leader) {
          leader = leader.playerId
        }
        const nextPlayerId = getNextPlayer({ playerId, players })
        await fetch(
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
              roundId: game.roundId,
              trickId: trick.trickId,
              leadSuit,
              nextRound
            })
          }
        )
        if (nextRound) {
          this.nextRound()
        }
      }
      this.setState({ loading: false })
    } catch (error) {
      this.setState({ loading: false })
      console.error(`$$>>>>: Game -> error`, error)
    }
    const { game, playerId } = this.state
  }

  nextRound = async () => {
    try {
      const { game, players, bids, roundScore } = this.state
      let {
        numCards: nc,
        roundNum: rn,
        descending: desc,
        gameId,
        numRounds,
        dealer,
        score,
        roundId
      } = game
      let descending = desc
      const roundNum = rn + 1
      let numCards = descending ? nc - 1 : nc + 1
      if (numCards < 1) {
        descending = false
        numCards = 2
      }
      const gameScore = calculateGameScore({
        players,
        bids,
        roundScore,
        score
      })

      const gameOver = roundNum > numRounds

      await fetch(
        `https://us-central1-oh-shit-ac7c3.cloudfunctions.net/api/next-round`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            roundNum,
            numRounds,
            numCards,
            descending,
            players,
            gameId,
            gameScore,
            gameOver,
            dealer
          })
        }
      )
    } catch (error) {
      console.error(`$$>>>>: nextRound -> error`, error)
    }
  }

  submitBid = async () => {
    try {
      this.setState({ loading: true })
      const { gameId } = this.props
      const { bid, playerId, game, bids, players } = this.state
      const { numPlayers, roundId } = game
      const allBidsIn = (Object.keys(bids || {}).length = numPlayers)
      const nextPlayerId = getNextPlayer({ playerId, players })
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
            roundId
          })
        }
      )
      this.setState({ bid: "", loading: false })
    } catch (error) {
      this.setState({ loading: false })
      console.error(`$$>>>>: Game -> error`, error)
    }
  }

  handleDirtyGame = value => {
    const { game, bids } = this.state
    if (game.dirty) {
      const wouldMakeClean = getAvailableTricks({
        numCards: game.numCards,
        bids
      })
      if (wouldMakeClean < 0) {
        return true
      }
      return wouldMakeClean.toString() !== value
    }
    return true
  }

  handleChange = e => {
    let { value, name } = e.target
    if (
      name !== "bid" ||
      value === "" ||
      (/^(?:[0-9]|[1-9]|10)$/.test(value) && this.handleDirtyGame(value))
    ) {
      this.setState({
        [name]: value
      })
    }
  }

  closeModal = async () => {
    const {
      playerId,
      game: { roundId }
    } = this.state
    await Promise.all([
      this.listenToRound(roundId),
      this.listenToHand({ playerId, roundId })
    ])
    this.setState({
      showScore: false
    })
    this.setState(prevState => {
      return {
        winner: null,
        showScore: false
      }
    })
  }

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
      roundScore,
      loading,
      winner,
      showScore,
      showYourTurn,
      trump
    } = this.state
    let name,
      status,
      currentPlayer,
      leadSuit,
      roundId,
      gameScore,
      dealer,
      roundNum,
      numRounds,
      numCards
    if (game) {
      name = game.name
      status = game.status
      currentPlayer = game.currentPlayer
      roundId = game.roundId
      gameScore = game.score
      dealer = game.dealer
      roundNum = game.roundNum
      numRounds = game.numRounds
      numCards = game.numCards
    }

    const trick = tricks[trickIndex]
    if (trick) {
      leadSuit = trick.leadSuit
    }

    return (
      <>
        <Container className={styles.game_page}>
          <Row className="mb-5" style={{ height: 65 }}>
            <Col xs="4">
              {name && <h2 style={{ textDecoration: "underline" }}>{name}</h2>}
            </Col>
            <Col xs="4">
              {isHost && status && status === "pending" && (
                <Row>
                  <Button color="success" onClick={this.startGame}>
                    START GAME
                  </Button>
                </Row>
              )}
              {status &&
                (status === "bid" ||
                  status === "play" ||
                  status === "over") && (
                  <div className="d-flex-column justify-content-center">
                    <h3
                      style={{ fontSize: 12 }}
                    >{`ROUND: ${roundNum} of ${numRounds}`}</h3>
                    <h3
                      style={{ fontSize: 12 }}
                    >{`TOTAL TRICKS: ${numCards}`}</h3>
                    <h3
                      style={{ fontSize: 12 }}
                    >{`TRICKS AVAILABLE: ${getAvailableTricks({
                      numCards,
                      bids
                    })}`}</h3>
                  </div>
                )}
            </Col>
            <Col xs="4">
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
            <Col xs="4" className="mb-5">
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
                  <Button color="success" onClick={this.addPlayer}>
                    JOIN
                  </Button>
                </Form>
              </Row>
            </Col>
          )}
          <Players
            players={players}
            currentPlayer={currentPlayer}
            bids={bids}
            roundScore={roundScore}
            trick={trick}
            bid={bid}
            dealer={dealer}
            handleChange={this.handleChange}
            submitBid={this.submitBid}
            thisPlayer={playerId}
            gameScore={gameScore}
          />
        </Container>
        <CardRow cards={hand} playCard={this.playCard} />
        <Modal
          isOpen={Boolean(winner)}
          toggle={this.closeModal}
          onOpened={() => {
            setTimeout(() => {
              this.closeModal()
            }, 2000)
          }}
        >
          <ModalBody>
            <Container>
              {winner && <h2>{`${getWinner({ winner, players })} won!`}</h2>}
              <Button onClick={this.closeModal}>CLOSE</Button>
            </Container>
          </ModalBody>
        </Modal>
        <Modal isOpen={showScore || status === "over"} toggle={this.closeModal}>
          <ModalBody>
            <Container>
              <Row>
                <Col className="d-flex justify-content-center mb-3">
                  <h3>SCORES</h3>
                </Col>
              </Row>
              {players.map(player => (
                <Row key={player.playerId}>
                  <Col xs="6">
                    <h5>{player.name}</h5>
                  </Col>
                  <Col xs="6">
                    <h5 style={{ textAlign: "center" }}>
                      {gameScore && gameScore[player.playerId]
                        ? gameScore[player.playerId]
                        : "0"}
                    </h5>
                  </Col>
                </Row>
              ))}
              <Row>
                <Col className="d-flex justify-content-center mt-3">
                  {status === "over" ? (
                    <Button
                      color="success"
                      onClick={() => {
                        this.props.router.push("/")
                      }}
                    >
                      NEW GAME
                    </Button>
                  ) : (
                    <Button color="primary" onClick={this.closeModal}>
                      CLOSE
                    </Button>
                  )}
                </Col>
              </Row>
            </Container>
          </ModalBody>
        </Modal>
        <Modal
          isOpen={showYourTurn}
          toggle={() => this.setState({ showYourTurn: false })}
          onOpened={() => {
            setTimeout(() => {
              this.setState({ showYourTurn: false })
            }, 800)
          }}
        >
          <Container>
            <Row>
              <Col>
                <h2>your turn...</h2>
              </Col>
            </Row>
          </Container>
        </Modal>
        <Spinner loading={loading} />
      </>
    )
  }
}

Game.contextType = CombinedContext

Game.getInitialProps = context => {
  const { req, query } = context
  const { gameId } = query

  return { gameId }
}

export default withRouter(Game)
