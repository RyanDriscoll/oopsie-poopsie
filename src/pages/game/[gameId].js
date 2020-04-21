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
  calculateLeader,
  getNextPlayer,
  isLegal,
  getScore,
  calculateGameScore,
  getWinner,
  getAvailableTricks,
  handleDirtyGame
} from "../../utils/helpers"
import Spinner from "../../components/Spinner"
import Players from "../../components/Players"
import { withRouter } from "next/router"
import ModalHeader from "reactstrap/lib/ModalHeader"
import NotificationController from "../../components/NotificationController"
import {
  startGame,
  playCard,
  submitBid,
  updatePlayer,
  addPlayer,
  nextRound
} from "../../utils/api"
import CustomTrump from "../../components/CustomTrump"

class Game extends Component {
  constructor(props) {
    super(props)
    this.state = {
      loading: false,
      game: null,
      players: {},
      playerId: null,
      playerName: "",
      hand: [],
      isHost: false,
      bid: 0,
      bids: {},
      tricks: [],
      trickIndex: 0,
      trickWinner: null,
      roundScore: {},
      showScore: false,
      showYourTurn: false,
      trump: null,
      queuedCard: null
    }

    this.gameRef
    this.playersRef
    this.handRef
    this.bidRef
    this.trickRef
    this.trumpRef
    this.autoPlayTimeout
  }

  async componentDidMount() {
    try {
      const { gameId } = this.props
      const { game } = this.state
      const playerId = localStorage.getItem(`oh-shit-game-${gameId}-player-id`)
      this.setState({ playerId })
      await this.listenToPlayers(gameId, playerId)
      if (playerId) {
        await Promise.all([
          updatePlayer({ playerId, gameId, present: true }),
          this.listenToGame({ gameId, playerId })
        ])
      }
      this.context.setState({ mounted: true })
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
      await updatePlayer({ playerId, gameId, present: true })
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
    })
    window.addEventListener("unload", async event => {
      await updatePlayer({ playerId, gameId, present: false })
    })
  }

  listenToPlayers = async (gameId, playerId) => {
    try {
      this.playersRef = ref(`players`).orderByChild("gameId").equalTo(gameId)

      await Promise.all([
        this.playersRef.on("child_added", data => {
          const player = data.val()
          this.setState(prevState => {
            const newState = {
              players: {
                ...prevState.players,
                [player.playerId]: player
              }
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
            return {
              players: {
                ...prevState.players,
                [player.playerId]: player
              }
            }
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
          console.log(`$$>>>>: Game -> listenToGame -> key`, key, value)
          if (key === "roundId") {
            this.listenToRound(value)
            this.listenToHand({ playerId, roundId: value })
          }
          this.setState(prevState => ({
            game: { ...prevState.game, [key]: value }
          }))
          if (key === "currentPlayer" && value === playerId) {
            this.yourTurn()
          }
        }),
        this.gameRef.on("child_changed", data => {
          let value = data.val()
          const key = data.key
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
          if (key === "currentPlayer" && value === playerId) {
            this.yourTurn()
          }
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
        this.setState({
          trump
        })
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
            this.setState(
              prevState => ({
                bids: {
                  ...prevState.bids,
                  [playerId]: bid
                }
              }),
              () => {
                this.setState(prevState => {
                  const { game, bids, players, bid } = prevState
                  const { numCards, dirty } = game
                  let newBid = Number(bid)
                  while (
                    dirty &&
                    !handleDirtyGame({ value: newBid, numCards, bids, players })
                  ) {
                    newBid = newBid + 1
                  }
                  if (newBid >= 0 && newBid <= numCards) {
                    return { bid: newBid }
                  }
                  return {}
                })
              }
            )
          }
        }),
        this.bidRef.once("value").then(data => {
          const bids = data.val()
          this.setState({ bids }, () => {
            this.setState(prevState => {
              const { game, bids, players, bid } = prevState
              const { numCards, dirty } = game
              let newBid = Number(bid)
              while (
                dirty &&
                !handleDirtyGame({ value: newBid, numCards, bids, players })
              ) {
                newBid = newBid + 1
              }
              if (newBid >= 0 && newBid <= numCards) {
                return { bid: newBid }
              }
              return {}
            })
          })
          initialDataLoaded = true
        })
      ])
    } catch (error) {
      console.error(`$$>>>>: error`, error)
    }
  }

  listenToRound = async roundId => {
    try {
      await Promise.all([
        this.listenToTrump(roundId),
        this.listenToTrick(roundId),
        this.listenToBid(roundId)
      ])
    } catch (error) {
      console.error(`$$>>>>: Game -> listenToRound -> error`, error)
    }
  }

  yourTurn = async () => {
    const { queuedCard } = this.state
    if (queuedCard) {
      this.autoPlayTimeout = setTimeout(async () => {
        await this.playCard(queuedCard)
        this.setState({ queuedCard: null })
      }, 700)
    } else {
      this.setState({ showYourTurn: true })
    }
  }

  addPlayer = async () => {
    try {
      this.setState({ loading: true })
      const { gameId } = this.props
      const { playerName } = this.state
      const response = await addPlayer({ playerName, gameId })
      if (response.ok) {
        const { playerId } = await response.json()
        localStorage.setItem(`oh-shit-game-${gameId}-player-id`, playerId)
        this.setState({ playerId })
        this.listenToGame({ gameId, playerId })
        this.setState({ loading: false })
      }
    } catch (error) {
      this.setState({ loading: false })
      console.error(`$$>>>>: Game -> addPlayer -> error`, error)
    }
  }

  startGame = async () => {
    try {
      this.setState({ loading: true })
      const { gameId } = this.props
      let {
        players,
        game: { numCards }
      } = this.state
      await startGame({ gameId, players, numCards })
      this.setState({ loading: false })
    } catch (error) {
      this.setState({ loading: false })
      console.error(`$$>>>>: Game -> startGame -> error`, error)
    }
  }

  playCard = async card => {
    try {
      if (this.autoPlayTimeout) {
        clearTimeout(this.autoPlayTimeout)
      }
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
        const nextPlayerId = players[playerId].nextPlayer
        const body = {
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
        }
        await playCard(body)

        if (nextRound) {
          await this.nextRound()
        }
      } else if (
        game &&
        game.status === "play" &&
        game.currentPlayer &&
        game.currentPlayer !== playerId &&
        isLegal({ hand, card, leadSuit })
      ) {
        this.setState(prevState => {
          let newCard = card
          if (
            prevState.queuedCard &&
            prevState.queuedCard.cardId === card.cardId
          ) {
            newCard = null
          }
          return {
            queuedCard: newCard
          }
        })
      }
      this.setState({ loading: false })
    } catch (error) {
      this.setState({ loading: false })
      console.error(`$$>>>>: Game -> error`, error)
    }
  }

  nextRound = async () => {
    try {
      const { game, players, bids, roundScore } = this.state
      let {
        numCards: nc,
        roundNum: rn,
        descending: desc,
        dealer: oldDealer,
        gameId,
        numRounds,
        score,
        roundId,
        noBidPoints
      } = game
      let descending = desc
      const roundNum = rn + 1
      let numCards = descending ? nc - 1 : nc + 1
      if (numCards < 1) {
        descending = false
        numCards = 2
      }
      const dealer = players[oldDealer].nextPlayer
      const gameOver = roundNum > numRounds
      const body = {
        roundNum,
        numRounds,
        numCards,
        descending,
        gameId,
        noBidPoints,
        roundId,
        gameOver,
        dealer
      }
      await nextRound(body)
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
      const allBidsIn = Object.keys(bids || {}).length === numPlayers - 1
      const nextPlayerId = players[playerId].nextPlayer
      const body = {
        gameId,
        playerId,
        nextPlayerId,
        bid,
        allBidsIn,
        roundId
      }

      await submitBid(body)
      this.setState({ loading: false })
    } catch (error) {
      this.setState({ loading: false })
      console.error(`$$>>>>: Game -> error`, error)
    }
  }

  handleChange = e => {
    const { value, name } = e.target
    this.setState({
      [name]: value
    })
  }

  handleToggle = inc => {
    this.setState(prevState => {
      const { game, bids, players, bid } = prevState
      const { numCards, dirty } = game
      let newBid = Number(bid)
      newBid = inc ? newBid + 1 : newBid - 1
      while (
        dirty &&
        !handleDirtyGame({ value: newBid, numCards, bids, players })
      ) {
        newBid = inc ? newBid + 1 : newBid - 1
      }
      if (newBid >= 0 && newBid <= numCards) {
        return { bid: newBid }
      }
      return {}
    })
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
      winner: null
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
      trump,
      queuedCard
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

    const user = players[playerId]
    const userName = (user && user.name) || ""

    const { dark } = this.context

    return (
      <>
        <div className={styles.game_page}>
          <Row className={styles.info_row}>
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
                  <>
                    <h4>{`ROUND: ${roundNum} of ${numRounds}`}</h4>
                    <h4>{`TOTAL TRICKS: ${numCards}`}</h4>
                    <h4>{`TRICKS AVAILABLE: ${getAvailableTricks({
                      numCards,
                      bids
                    })}`}</h4>
                  </>
                )}
            </Col>
            <Col xs="2" className={styles.lead_trump_container}>
              {leadSuit && (
                <>
                  <h3>LEAD</h3>
                  <img src={getSource(leadSuit, dark)} />
                </>
              )}
            </Col>
            <Col xs="2" className={styles.lead_trump_container}>
              {trump && (
                <>
                  <CustomTrump />
                  <img src={getSource(trump, dark)} />
                </>
              )}
            </Col>
          </Row>
          {!playerId && (
            <Col xs="4" className="mb-5">
              <Row>
                <Form>
                  <FormGroup>
                    <Label for="name">User Name</Label>
                    <Input
                      data-lpignore="true"
                      type="text"
                      name="playerName"
                      id="name"
                      value={playerName}
                      onChange={this.handleChange}
                    />
                  </FormGroup>
                  <Button
                    disabled={!playerName}
                    color="success"
                    onClick={this.addPlayer}
                  >
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
            setBid={bid => this.setState({ bid })}
            dealer={dealer}
            handleToggle={this.handleToggle}
            submitBid={this.submitBid}
            afterBid={() => this.setState({ bid: 0 })}
            thisPlayer={playerId}
            gameScore={gameScore}
            winnerModalShowing={Boolean(winner)}
            status={status}
          />
        </div>
        <CardRow
          cards={hand}
          playCard={this.playCard}
          queuedCard={queuedCard}
        />
        <Modal
          centered
          isOpen={Boolean(winner)}
          toggle={this.closeModal}
          onOpened={() => {
            setTimeout(() => {
              this.closeModal()
            }, 1000)
          }}
        >
          <ModalBody>
            <Container className="text-align-center">
              {winner && (
                <h2 className="mb-3">{`${getWinner({
                  winner,
                  players
                })} won!`}</h2>
              )}
              <Button onClick={this.closeModal}>CLOSE</Button>
            </Container>
          </ModalBody>
        </Modal>
        <Modal centered isOpen={status === "over"}>
          <ModalHeader>
            <Row>
              <Col className="d-flex justify-content-center mb-3">
                <h1>game over</h1>
              </Col>
            </Row>
          </ModalHeader>
          <ModalBody>
            {Object.values(players)
              .sort((a, b) => {
                const aScore =
                  gameScore && gameScore[a.playerId] ? gameScore[a.playerId] : 0
                const bScore =
                  gameScore && gameScore[b.playerId] ? gameScore[b.playerId] : 0
                if (aScore < bScore) {
                  return 1
                }
                if (aScore > bScore) {
                  return -1
                }
                return 0
              })
              .map(player => (
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
          </ModalBody>
        </Modal>
        <Spinner loading={loading} />
        <NotificationController
          showNotification={showYourTurn}
          onClose={() => this.setState({ showYourTurn: false })}
          userName={userName}
        />
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
