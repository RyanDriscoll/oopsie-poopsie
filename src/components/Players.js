import React, { useContext } from "react"
import Row from "reactstrap/lib/Row"
import Col from "reactstrap/lib/Col"
import { getSource, getColor } from "../utils/helpers"
import Form from "reactstrap/lib/Form"
import InputGroup from "reactstrap/lib/InputGroup"
import Input from "reactstrap/lib/Input"
import InputGroupAddon from "reactstrap/lib/InputGroupAddon"
import Button from "reactstrap/lib/Button"
import classNames from "classnames"
import styles from "../styles/components/players.module.scss"
import CombinedContext from "../context/CombinedContext"
import Modal from "reactstrap/lib/Modal"
import ModalBody from "reactstrap/lib/ModalBody"
import ModalHeader from "reactstrap/lib/ModalHeader"
import ModalFooter from "reactstrap/lib/ModalFooter"
import { Container } from "next/app"
const Players = ({
  players,
  currentPlayer,
  bids,
  roundScore,
  trick,
  bid,
  handleToggle,
  submitBid,
  afterBid,
  dealer,
  thisPlayer,
  gameScore,
  status
}) => {
  const { dark } = useContext(CombinedContext)
  let newPlayers = []
  let nextPlayer = thisPlayer
  const haveNextPlayer =
    Object.values(players).length > 0 &&
    Object.values(players).every(p => p.nextPlayer)
  if (haveNextPlayer) {
    for (let i = 0; i < Object.keys(players).length; i++) {
      const player = players[nextPlayer]
      if (player) {
        newPlayers.push(player)
        nextPlayer = player.nextPlayer
      }
    }
  } else {
    newPlayers = Object.values(players)
  }

  return (
    <ul className={styles.players}>
      {newPlayers &&
        newPlayers.map(({ playerId, present, name }) => {
          const isCurrent = currentPlayer === playerId
          const isDealer = dealer === playerId
          let playerScore =
            gameScore && gameScore[playerId] ? gameScore[playerId] : "0"
          if (!status || status === "pending") {
            playerScore = ""
          }
          return (
            <li key={playerId} className={classNames({})}>
              <Row
                className={classNames({
                  [styles.current_player_arrow]: isCurrent,
                  [styles.player_row]: true,
                  "player-row": true
                })}
              >
                <Col xs="4" className="d-flex align-items-center">
                  <div className="player-score" data-player-score={playerScore}>
                    <h2
                      className={classNames({
                        [styles.current_player]: isCurrent,
                        [styles.not_present]: !present,
                        [styles.dealer]: isDealer,
                        "player-name": true
                      })}
                    >
                      {name}
                    </h2>
                  </div>
                </Col>
                {bids && bids[playerId] != null && (
                  <Col xs="3" sm="4" className="d-flex align-items-center">
                    <Row>
                      <Col xs="12" sm="6">
                        <h3>{`Bid: ${bids[playerId]}`}</h3>
                      </Col>
                      <Col xs="12" sm="6">
                        <h3>{`Won: ${roundScore[playerId] || "0"}`}</h3>
                      </Col>
                    </Row>
                  </Col>
                )}
                {trick && trick.cards && trick.cards[playerId] && (
                  <Col xs="5" sm="4">
                    <div className={styles.card}>
                      <img src={getSource(trick.cards[playerId].suit, dark)} />
                      <h2
                        style={{
                          color: getColor(trick.cards[playerId].suit, dark)
                        }}
                      >
                        {trick.cards[playerId].value}
                      </h2>
                    </div>
                  </Col>
                )}
              </Row>
              <Modal
                centered
                isOpen={
                  status === "bid" &&
                  thisPlayer === playerId &&
                  currentPlayer === playerId
                }
                onClosed={afterBid}
              >
                <ModalBody>
                  <Container>
                    <Row className="justify-content-center">
                      <h1>Bid</h1>
                    </Row>
                    <Row className="justify-content-center">
                      <Form>
                        <InputGroup>
                          <InputGroupAddon
                            className="align-items-center"
                            addonType="prepend"
                          >
                            <Button
                              className={styles.toggle_button}
                              color="danger"
                              onClick={e => handleToggle(false, e.target.value)}
                            >
                              -
                            </Button>
                          </InputGroupAddon>
                          <Input
                            data-lpignore="true"
                            type="text"
                            value={bid}
                            name="bid"
                            id="bid"
                            className={classNames(
                              styles.toggle_results,
                              "main-text"
                            )}
                            readOnly
                          />
                          <InputGroupAddon
                            className="align-items-center"
                            addonType="append"
                          >
                            <Button
                              className={styles.toggle_button}
                              color="success"
                              onClick={e => handleToggle(true, e.target.value)}
                            >
                              +
                            </Button>
                          </InputGroupAddon>
                        </InputGroup>
                      </Form>
                    </Row>
                    <Row className="justify-content-center mt-5">
                      <Button
                        className={styles.bid_button}
                        color="primary"
                        onClick={submitBid}
                      >
                        BID
                      </Button>
                    </Row>
                  </Container>
                </ModalBody>
              </Modal>
            </li>
          )
        })}
    </ul>
  )
}

export default Players
