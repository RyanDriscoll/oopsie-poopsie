import React, { useContext } from "react"

import styles from "../styles/components/card-row.module.scss"
import { getSource, getColor } from "../utils/helpers"
import CombinedContext from "../context/CombinedContext"
const CardRow = ({ cards, playCard }) => {
  const { dark } = useContext(CombinedContext)
  return (
    <ul className={styles.card_row}>
      {cards &&
        cards.map(card => (
          <li
            className="playing-card"
            key={card.cardId}
            onClick={e => {
              e.preventDefault()
              playCard(card)
            }}
          >
            <div>
              <img src={getSource(card.suit, dark)} />
              <h2 style={{ color: getColor(card.suit, dark) }}>{card.value}</h2>
            </div>
          </li>
        ))}
    </ul>
  )
}

export default CardRow
