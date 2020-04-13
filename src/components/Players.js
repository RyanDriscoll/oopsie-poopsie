import React, { useEffect } from "react"
import Row from "reactstrap/lib/Row"
import Col from "reactstrap/lib/Col"
import { getSource, getColor } from "../utils/helpers"
import Form from "reactstrap/lib/Form"
import InputGroup from "reactstrap/lib/InputGroup"
import Input from "reactstrap/lib/Input"
import InputGroupAddon from "reactstrap/lib/InputGroupAddon"
import Button from "reactstrap/lib/Button"
import * as classNames from "classnames"
import styles from "../styles/components/players.module.scss"
const Players = ({
  players,
  currentPlayer,
  bids,
  roundScore,
  trick,
  bid,
  handleToggle,
  submitBid,
  dealer,
  thisPlayer,
  gameScore,
  status
}) => {
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
            <li
              key={playerId}
              className={classNames({
                [styles.current_player_arrow]: isCurrent
              })}
            >
              <Row>
                <Col xs="4">
                  <div data-player-score={playerScore}>
                    <h2
                      className={classNames({
                        [styles.current_player]: isCurrent,
                        [styles.not_present]: !present,
                        [styles.dealer]: isDealer
                      })}
                    >
                      {name}
                    </h2>
                  </div>
                </Col>
                {bids && bids[playerId] != null ? (
                  <>
                    <Col xs="2">
                      <h2>{`Bid: ${bids[playerId]}`}</h2>
                    </Col>
                    <Col xs="2">
                      <h2>{`Won: ${roundScore[playerId] || "0"}`}</h2>
                    </Col>
                    {trick && trick.cards && trick.cards[playerId] && (
                      <Col xs="2">
                        <div className={styles.card}>
                          <img src={getSource(trick.cards[playerId].suit)} />
                          <h2
                            style={{
                              color: getColor(trick.cards[playerId].suit)
                            }}
                          >
                            {trick.cards[playerId].value}
                          </h2>
                        </div>
                      </Col>
                    )}
                  </>
                ) : (
                  <Col xs="2">
                    {thisPlayer === playerId && currentPlayer === playerId && (
                      <Form>
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
                            value={bid}
                            name="bid"
                            id="bid"
                            className={styles.bid}
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
                          <Button
                            color="primary"
                            onClick={submitBid}
                            style={{ marginLeft: 10 }}
                          >
                            BID
                          </Button>
                        </InputGroup>
                      </Form>
                    )}
                  </Col>
                )}
              </Row>
            </li>
          )
        })}
    </ul>
  )
}

export default Players
