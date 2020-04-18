import React, { useState, useRef } from "react"
import Link from "next/link"
import Container from "reactstrap/lib/Container"
import Button from "reactstrap/lib/Button"
import Form from "reactstrap/lib/Form"
import FormGroup from "reactstrap/lib/FormGroup"
import Label from "reactstrap/lib/Label"
import Input from "reactstrap/lib/Input"
import InputGroup from "reactstrap/lib/InputGroup"
import InputGroupAddon from "reactstrap/lib/InputGroupAddon"
import Row from "reactstrap/lib/Row"
import { withRouter } from "next/router"
import { absoluteUrl } from "../utils/helpers"
import { newGame } from "../utils/api"
import styles from "../styles/pages/home.module.scss"
import { CopyIcon } from "../components/Icons"
import Col from "reactstrap/lib/Col"

const CreateGame = ({ origin }) => {
  const [name, setName] = useState("")
  const [game, setGame] = useState("")
  const [gameId, setGameId] = useState("")
  const [url, setUrl] = useState("")
  const [copySuccess, setCopySuccess] = useState("")
  const [dirty, setDirty] = useState(false)
  const [noBidPoints, setNoBidPoints] = useState(false)
  const [numCards, setNumCards] = useState(5)

  const gameUrlRef = useRef(null)

  const handleChange = e => {
    const { name, value } = e.target
    switch (name) {
      case "name":
        setName(value)
        break
      case "game":
        setGame(value)
        break
      default:
        break
    }
  }

  const handleToggle = inc => {
    const newNumCards = inc ? numCards + 1 : numCards - 1
    if (newNumCards <= 10 && newNumCards >= 1) {
      setNumCards(newNumCards)
    }
  }

  const initializeGame = async () => {
    try {
      const body = {
        game,
        name,
        numCards,
        noBidPoints,
        dirty
      }
      const response = await newGame(body)
      if (response.ok) {
        const { playerId, gameId } = await response.json()
        localStorage.setItem(`oh-shit-game-${gameId}-player-id`, playerId)
        setGameId(gameId)
        setUrl(`${origin}/game/${gameId}`)
        setName("")
        setGame("")
      }
    } catch (error) {
      console.error(`$$>>>>: initializeGame -> error`, error)
    }
  }

  const copyToClipboard = e => {
    gameUrlRef.current.select()
    document.execCommand("copy")
    e.target.focus()
    setCopySuccess("Copied!")
  }

  return (
    <Container>
      {gameId ? (
        <>
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
          <Col xs="10" sm="7">
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
                        onClick={e => handleToggle(false, e.target.value)}
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
                        onClick={e => handleToggle(true, e.target.value)}
                      >
                        +
                      </Button>
                    </InputGroupAddon>
                  </InputGroup>
                </FormGroup>
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
                    checked={noBidPoints}
                    onChange={() => setNoBidPoints(!noBidPoints)}
                  />{" "}
                  No points for bad bids
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
