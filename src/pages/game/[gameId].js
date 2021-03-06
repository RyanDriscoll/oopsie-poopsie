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
import Players from "../../components/Players"
import { withRouter } from "next/router"
import ModalHeader from "reactstrap/lib/ModalHeader"
import NotificationController from "../../components/NotificationController"
import {
  newGame,
  replayGame,
  startGame,
  playCard,
  submitBid,
  updatePlayer,
  addPlayer,
  nextRound
} from "../../utils/api"
import CustomTrump from "../../components/CustomTrump"
import TurnChange from "../../components/TurnChange"

const INITIAL_STATE = {
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
  winner: null,
  roundScore: {},
  showScore: false,
  showYourTurn: false,
  trump: null,
  queuedCard: null
}

class Game extends Component {
  constructor(props) {
    super(props)
    this.state = INITIAL_STATE

    this.gameRef
    this.playersRef
    this.handRef
    this.bidRef
    this.trickRef
    this.trumpRef
    this.autoPlayTimeout
  }

  async componentDidMount() {
    this.initializeGame()
  }

  async componentWillUnmount() {
    this.removeListeners()
    const { playerId } = this.state
    const { gameId } = this.props
    if (playerId) {
      await updatePlayer({ playerId, gameId, present: true })
    }
  }

  async componentDidUpdate(prevProps, prevState) {
    const { playerId } = this.state
    if (playerId && prevState.playerId !== playerId) {
      this.listenForWindowClose(playerId)
    }
    if (
      this.props.gameId &&
      prevProps.gameId &&
      this.props.gameId !== prevProps.gameId
    ) {
      this.removeListeners()
      await this.initializeGame()
    }
  }

  initializeGame = async () => {
    try {
      this.setState(INITIAL_STATE)
      const { gameId } = this.props
      const playerId = localStorage.getItem(`oh-shit-${gameId}-player-id`)
      const playerName = localStorage.getItem("player-name") || ""
      Object.keys(localStorage).forEach(key => {
        const val = localStorage[key]
        if (key.startsWith("oh-shit") && val !== playerId) {
          localStorage.removeItem(key)
        }
      })
      this.setState({ playerId, playerName })
      await this.listenToPlayers(gameId, playerId)
      if (playerId) {
        await Promise.all([
          updatePlayer({ playerId, gameId, present: true }),
          this.listenToGame({ gameId, playerId })
        ])
      }
      this.context.setState({ mounted: true })
    } catch (error) {
      this.context.setState({ mounted: true, error: true })
      console.error(`$$>>>>: Game -> componentDidMount -> error`, error)
    }
  }

  removeListeners = () => {
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
      this.context.setState({ error: true })
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
          this.setState(
            prevState => ({
              game: { ...prevState.game, [key]: value }
            }),
            async () => {
              if (key === "roundId") {
                await Promise.all([
                  this.listenToRound(value),
                  this.listenToHand({ playerId, roundId: value })
                ])
              }
            }
          )
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
        }),
        this.gameRef.on("child_removed", data => {
          const key = data.key
          this.setState(prevState => ({
            game: { ...prevState.game, [key]: null }
          }))
        })
      ])
    } catch (error) {
      this.context.setState({ error: true })
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
            this.setState(prevState => {
              const cardIndex = prevState.hand.findIndex(
                c => c.cardId === card.cardId
              )
              if (cardIndex === -1) {
                return {
                  hand: [...prevState.hand, card]
                }
              }
            })
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
        this.context.setState({ error: true })
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
      this.context.setState({ error: true })
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
      this.context.setState({ error: true })
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
      this.context.setState({ error: true })
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
      this.context.setState({ error: true })
      console.error(`$$>>>>: Game -> listenToRound -> error`, error)
    }
  }

  yourTurn = async () => {
    const { queuedCard } = this.state
    const { visible } = this.context
    if (queuedCard) {
      this.autoPlayTimeout = setTimeout(async () => {
        await this.playCard(queuedCard)
        this.setState({ queuedCard: null })
      }, 700)
    } else {
      if (!visible) {
        this.setState({ showYourTurn: true })
      }
    }
  }

  randomPlay = () => {
    const {
      hand,
      tricks,
      trickIndex,
      game: { status }
    } = this.state
    if (status === "play") {
      let handCopy = [...hand]
      let leadSuit
      const trick = tricks[trickIndex]
      if (trick && trick.leadSuit) {
        leadSuit = trick.leadSuit
      }
      let randomIndex = Math.floor(Math.random() * handCopy.length)
      let card = handCopy[randomIndex]
      while (!isLegal({ hand, leadSuit, card: handCopy[randomIndex] })) {
        handCopy.splice(randomIndex, 1)
        randomIndex = Math.floor(Math.random() * handCopy.length)
        card = handCopy[randomIndex]
      }
      if (card) {
        this.playCard(card)
      }
    } else if (status === "bid") {
      const randomBid = Math.floor(Math.random() * (hand.length + 1))
      this.submitBid(randomBid)
    }
  }

  playAgain = async () => {
    try {
      this.context.setState({ loading: true })
      const {
        game: { name, numCards, noBidPoints, dirty, timeLimit, gameId },
        playerName
      } = this.state
      const body = {
        game: name,
        name: playerName,
        numCards,
        noBidPoints,
        dirty,
        timeLimit: timeLimit ? Number(timeLimit) : null
      }
      const response = await newGame(body)
      if (response.ok) {
        const { playerId, gameId: gameIdResponse } = await response.json()
        localStorage.setItem(`oh-shit-${gameIdResponse}-player-id`, playerId)
        await replayGame({ oldGameId: gameId, newGameId: gameIdResponse })
      }
      this.context.setState({ loading: false })
    } catch (error) {
      this.context.setState({ loading: false, error: true })
      console.error(`$$>>>>: playAgain -> error`, error)
    }
  }

  addPlayer = async () => {
    try {
      this.context.setState({ loading: true })
      const { gameId } = this.props
      const { playerName } = this.state
      const response = await addPlayer({ playerName, gameId })
      if (response.ok) {
        const { playerId } = await response.json()
        localStorage.setItem(`oh-shit-${gameId}-player-id`, playerId)
        localStorage.setItem("player-name", playerName)
        this.setState({ playerId })
        this.listenToGame({ gameId, playerId })
        this.context.setState({ loading: false })
      }
    } catch (error) {
      this.context.setState({ loading: false, error: true })
      console.error(`$$>>>>: Game -> addPlayer -> error`, error)
    }
  }

  startGame = async () => {
    try {
      this.context.setState({ loading: true })
      const { gameId } = this.props
      let {
        players,
        game: { numCards }
      } = this.state
      await startGame({ gameId })
      this.context.setState({ loading: false })
    } catch (error) {
      this.context.setState({ loading: false, error: true })
      console.error(`$$>>>>: Game -> startGame -> error`, error)
    }
  }

  playCard = async card => {
    try {
      if (this.autoPlayTimeout) {
        clearTimeout(this.autoPlayTimeout)
      }
      this.context.setState({ loading: true })
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
        isLegal({ hand, card, leadSuit }) &&
        (!trick || !trick.cards || !trick.cards[playerId])
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
      this.context.setState({ loading: false })
    } catch (error) {
      this.context.setState({ loading: false, error: true })
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
      this.context.setState({ error: true })
      console.error(`$$>>>>: nextRound -> error`, error)
    }
  }

  submitBid = async optionalBid => {
    try {
      this.context.setState({ loading: true })
      const bid = optionalBid ? optionalBid : this.state.bid
      const { gameId } = this.props
      const { playerId, game, bids, players } = this.state
      const { numPlayers, roundId, timeLimit } = game
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
      this.context.setState({ loading: false })
    } catch (error) {
      this.context.setState({ loading: false, error: true })
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
      game: { roundId, status },
      winner
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
    const { isMobile, router } = this.props
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
      numCards,
      nextGame,
      timeLimit
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
      nextGame = game.nextGame
      timeLimit = game.timeLimit
    }

    const trick = tricks[trickIndex]
    if (trick) {
      leadSuit = trick.leadSuit
    }

    const user = players[playerId]
    const userName = (user && user.name) || ""

    const { dark, timer } = this.context

    const timerShowMax = timeLimit > 10 ? 10 : 5

    return (
      <>
        <div className={styles.game_page}>
          {playerId === currentPlayer && timer >= 0 && timer <= timerShowMax && (
            <div className={styles.countdown}>
              <h1 className="red-text">{timer}</h1>
            </div>
          )}
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
            timeLimit={timeLimit}
            winnerModalShowing={Boolean(winner)}
            status={status}
          />
        </div>
        <CardRow
          cards={hand}
          playCard={this.playCard}
          queuedCard={queuedCard}
          leadSuit={leadSuit}
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
              <Col>
                {status === "over" ? (
                  <>
                    <div className="mt-3 text-center">
                      <Button
                        color="primary"
                        onClick={() => {
                          router.push("/")
                        }}
                      >
                        HOME
                      </Button>
                    </div>
                    {isHost && (
                      <div className="mt-3 text-center">
                        <Button color="success" onClick={this.playAgain}>
                          PLAY AGAIN
                        </Button>
                      </div>
                    )}
                    {nextGame && (
                      <div className="mt-3 text-center">
                        <Link href={`/game/[gameId]`} as={`/game/${nextGame}`}>
                          <a>JOIN NEXT GAME</a>
                        </Link>
                      </div>
                    )}
                  </>
                ) : (
                  <Button color="primary" onClick={this.closeModal}>
                    CLOSE
                  </Button>
                )}
              </Col>
            </Row>
          </ModalBody>
        </Modal>
        {(status === "play" || status === "bid") && (
          <TurnChange
            timeLimit={timeLimit}
            playerId={playerId}
            currentPlayer={currentPlayer}
            winner={winner}
            randomPlay={this.randomPlay}
            yourTurn={this.yourTurn}
          />
        )}
        {!isMobile && (
          <NotificationController
            showNotification={showYourTurn}
            onClose={() => this.setState({ showYourTurn: false })}
            userName={userName}
          />
        )}
      </>
    )
  }
}

Game.contextType = CombinedContext

Game.getInitialProps = context => {
  const { req, query } = context
  const { gameId } = query
  let userAgent
  if (req) {
    userAgent = req.headers["user-agent"]
  } else {
    userAgent = navigator.userAgent
  }
  const isMobile = Boolean(
    userAgent.match(
      /Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i
    )
  )

  return { gameId, isMobile }
}

export default withRouter(Game)
