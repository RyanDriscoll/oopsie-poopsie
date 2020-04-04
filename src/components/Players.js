import React from "react"
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
  handleChange,
  submitBid,
  dealer,
  thisPlayer
}) => {
  return (
    <ul className={styles.players}>
      {players &&
        players.map(({ playerId, present, name }) => {
          const isCurrent = currentPlayer === playerId
          const isDealer = dealer === playerId
          return (
            <li
              key={playerId}
              className={classNames({
                [styles.current_player_arrow]: isCurrent
              })}
            >
              <Row>
                <Col sm="4">
                  <h2
                    className={classNames({
                      [styles.current_player]: isCurrent,
                      [styles.not_present]: !present,
                      [styles.dealer]: isDealer
                    })}
                  >
                    {name}
                  </h2>
                </Col>
                {bids && bids[playerId] != null ? (
                  <>
                    <Col sm="2">
                      <h2>{`Bid: ${bids[playerId]}`}</h2>
                    </Col>
                    <Col sm="2">
                      <h2>{`Won: ${roundScore[playerId] || "0"}`}</h2>
                    </Col>
                    {trick && trick.cards && trick.cards[playerId] && (
                      <Col sm="2">
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
                  <Col sm="2">
                    {thisPlayer === playerId && currentPlayer === playerId && (
                      <Form>
                        <InputGroup>
                          <Input
                            data-lpignore="true"
                            type="text"
                            value={bid}
                            name="bid"
                            id="bid"
                            onChange={handleChange}
                          />
                          <InputGroupAddon addonType="append">
                            <Button onClick={submitBid}>BID</Button>
                          </InputGroupAddon>
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
