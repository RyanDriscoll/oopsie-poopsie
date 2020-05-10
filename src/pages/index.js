import React, { useState, useRef, useContext, useEffect } from "react"
import Link from "next/link"
import Container from "reactstrap/lib/Container"
import Button from "reactstrap/lib/Button"
import Form from "reactstrap/lib/Form"
import FormGroup from "reactstrap/lib/FormGroup"
import Label from "reactstrap/lib/Label"
import Input from "reactstrap/lib/Input"
import InputGroup from "reactstrap/lib/InputGroup"
import InputGroupAddon from "reactstrap/lib/InputGroupAddon"
import Dropdown from "reactstrap/lib/Dropdown"
import DropdownItem from "reactstrap/lib/DropdownItem"
import DropdownMenu from "reactstrap/lib/DropdownMenu"
import DropdownToggle from "reactstrap/lib/DropdownToggle"
import Row from "reactstrap/lib/Row"
import { withRouter } from "next/router"
import { absoluteUrl } from "../utils/helpers"
import { newGame } from "../utils/api"
import styles from "../styles/pages/home.module.scss"
import { CopyIcon } from "../components/Icons"
import Col from "reactstrap/lib/Col"
import CombinedContext from "../context/CombinedContext"
import classnames from "classnames"

const timeLimitOptions = ["none", "90", "60", "30", "10"]

const CreateGame = ({ origin, router }) => {
  const [name, setName] = useState("")
  const [game, setGame] = useState("")
  const [gameCode, setGameCode] = useState("")
  const [gameId, setGameId] = useState("")
  const [url, setUrl] = useState("")
  const [copySuccess, setCopySuccess] = useState("")
  const [dirty, setDirty] = useState(false)
  const [bidPoints, setBidPoints] = useState(false)
  const [timeLimit, setTimeLimit] = useState("")
  const [numCards, setNumCards] = useState(5)
  const [create, setCreate] = useState(true)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const gameUrlRef = useRef(null)

  const { setState } = useContext(CombinedContext)

  useEffect(() => {
    setState({ mounted: true })
    setName(localStorage.getItem("player-name") || "")
    return () => {
      setState({ mounted: false })
    }
  }, [])

  const toggle = () => {
    setDropdownOpen(prevState => !prevState)
  }

  const handleChange = e => {
    const { name, value } = e.target
    switch (name) {
      case "name":
        setName(value)
        break
      case "game":
        setGame(value)
        break
      case "game-code":
        setGameCode(value)
        break
      default:
        break
    }
  }

  const handleNumCards = inc => {
    const newNumCards = inc ? numCards + 1 : numCards - 1
    if (newNumCards <= 10 && newNumCards >= 1) {
      setNumCards(newNumCards)
    }
  }

  const handleDropDown = (e, val) => {
    setTimeLimit(val || null)
    setTimeout(() => {
      setDropdownOpen(false)
    }, 10)
  }

  const initializeGame = async () => {
    try {
      setState({ loading: true })
      const body = {
        game,
        name,
        numCards,
        bidPoints,
        dirty,
        timeLimit: timeLimit ? Number(timeLimit) : null
      }
      const response = await newGame(body)
      if (response.ok) {
        const { playerId, gameId: gameIdResponse } = await response.json()
        localStorage.setItem(`oh-shit-${gameIdResponse}-player-id`, playerId)
        localStorage.setItem(`player-name`, name)
        setGameId(gameIdResponse)
        setUrl(`${origin}/game/${gameIdResponse}`)
        setName("")
        setGame("")
      }
      setState({ loading: false })
    } catch (error) {
      setState({ loading: false, error: true })
      console.error(`$$>>>>: initializeGame -> error`, error)
    }
  }

  const joinGame = () => {
    router.push("/game/[gameId]", `/game/${gameCode}`)
  }

  const copyToClipboard = e => {
    gameUrlRef.current.select()
    document.execCommand("copy")
    e.target.focus()
    setCopySuccess("Copied!")
  }

  return (
    <Container id={styles.home}>
      {gameId ? (
        <>
          <Row className="justify-content-center m-4">
            <Col xs="10" sm="7">
              <h2>Game Code</h2>
              <h2 className="red-text m-4">{gameId}</h2>
            </Col>
          </Row>
          <Row className="justify-content-center m-4">
            <h3>Share this link to invite other players</h3>
          </Row>
          <Row
            className="justify-content-center"
            style={{ position: "relative" }}
          >
            <Col xs="10" sm="7">
              <InputGroup>
                <Input
                  value={url}
                  readOnly
                  innerRef={gameUrlRef}
                  data-lpignore="true"
                />
                <InputGroupAddon addonType="append">
                  <Button onClick={copyToClipboard}>
                    <CopyIcon style={{ width: 18 }} />
                  </Button>
                </InputGroupAddon>
              </InputGroup>
              <h6 className={styles.copied}>{copySuccess}</h6>
            </Col>
          </Row>
          <Row className="justify-content-center m-5">
            <Link href={"/game/[gameId]"} as={`/game/${gameId}`}>
              <a className={styles.enter_game_button}>ENTER GAME</a>
            </Link>
          </Row>
        </>
      ) : (
        <Row className="justify-content-center">
          <Col xs="12" sm="9">
            <Row className="my-5">
              <Col xs="6">
                <h2
                  className={classnames({
                    [styles.toggle]: true,
                    [styles.selected]: create
                  })}
                  onClick={() => setCreate(true)}
                >
                  create a new game
                </h2>
              </Col>
              <Col xs="6">
                <h2
                  className={classnames({
                    [styles.toggle]: true,
                    [styles.selected]: !create
                  })}
                  onClick={() => setCreate(false)}
                >
                  join an existing game
                </h2>
              </Col>
            </Row>
          </Col>
          <Col xs="10" sm="7">
            {create ? (
              <Form>
                <FormGroup>
                  <Label for="game">Game Name</Label>
                  <Input
                    data-lpignore="true"
                    type="text"
                    name="game"
                    id="game"
                    value={game}
                    onChange={handleChange}
                    placeholder="optional"
                  />
                </FormGroup>
                <FormGroup>
                  <Label for="name">User Name</Label>
                  <Input
                    data-lpignore="true"
                    type="text"
                    name="name"
                    id="name"
                    value={name}
                    onChange={handleChange}
                  />
                </FormGroup>
                <Col xs="12" className="p-0">
                  <FormGroup>
                    <Label for="num-cards">Number of cards</Label>
                    <InputGroup>
                      <InputGroupAddon addonType="prepend">
                        <Button
                          color="danger"
                          onClick={() => handleNumCards(false)}
                        >
                          -
                        </Button>
                      </InputGroupAddon>
                      <Input
                        data-lpignore="true"
                        type="text"
                        value={numCards}
                        name="num-cards"
                        id="num-cards"
                        className={styles.num_cards}
                        readOnly
                      />
                      <InputGroupAddon addonType="append">
                        <Button
                          color="success"
                          onClick={() => handleNumCards(true)}
                        >
                          +
                        </Button>
                      </InputGroupAddon>
                    </InputGroup>
                  </FormGroup>
                </Col>

                <Col xs="12" className="p-0 mb-3">
                  <Label>Time limit</Label>

                  <Dropdown isOpen={dropdownOpen} toggle={toggle}>
                    <DropdownToggle caret>
                      {timeLimit ? `${timeLimit} seconds` : "None"}
                    </DropdownToggle>
                    <DropdownMenu flip={true} style={{ borderRadius: 0 }}>
                      <DropdownItem onClick={e => handleDropDown(e)}>
                        none
                      </DropdownItem>
                      <DropdownItem onClick={e => handleDropDown(e, 90)}>
                        90 seconds
                      </DropdownItem>
                      <DropdownItem onClick={e => handleDropDown(e, 60)}>
                        60 seconds
                      </DropdownItem>
                      <DropdownItem onClick={e => handleDropDown(e, 30)}>
                        30 seconds
                      </DropdownItem>
                      <DropdownItem onClick={e => handleDropDown(e, 10)}>
                        10 seconds
                      </DropdownItem>
                    </DropdownMenu>
                  </Dropdown>
                </Col>

                <FormGroup check>
                  <Label check>
                    <Input
                      type="checkbox"
                      id="bid-checkbox"
                      checked={dirty}
                      onChange={() => setDirty(!dirty)}
                    />{" "}
                    Dirty bids only
                  </Label>
                </FormGroup>

                <FormGroup check>
                  <Label check>
                    <Input
                      type="checkbox"
                      id="bid-point-checkbox"
                      checked={bidPoints}
                      onChange={() => setBidPoints(!bidPoints)}
                    />{" "}
                    Earn points for bad bids
                  </Label>
                </FormGroup>

                <div className="d-flex justify-content-center mt-3">
                  <Button
                    disabled={!name}
                    color="primary"
                    onClick={initializeGame}
                  >
                    NEW GAME
                  </Button>
                </div>
              </Form>
            ) : (
              <Form>
                <FormGroup>
                  <Label for="game-code">Game Code</Label>
                  <Input
                    data-lpignore="true"
                    type="text"
                    name="game-code"
                    id="game-code"
                    value={gameCode}
                    onChange={handleChange}
                    placeholder="Jb2X"
                  />
                </FormGroup>
                <div className="d-flex justify-content-center mt-3">
                  <Button
                    disabled={gameCode.length < 4}
                    color="primary"
                    onClick={joinGame}
                  >
                    JOIN GAME
                  </Button>
                </div>
              </Form>
            )}
          </Col>
        </Row>
      )}
    </Container>
  )
}

CreateGame.getInitialProps = ({ req, res }) => {
  const { origin } = absoluteUrl(req, "localhost:3000")
  return { origin }
}

export default withRouter(CreateGame)
