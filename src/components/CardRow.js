import styles from "../styles/components/card-row.module.scss"
import { getSource, getColor } from "../utils/helpers"
const CardRow = ({ cards, playCard }) => {
  return (
    <ul className={styles.card_row}>
      {cards &&
        cards.map(card => (
          <li
            key={card.cardId}
            onClick={e => {
              e.preventDefault()
              playCard(card)
            }}
          >
            <div>
              <img src={getSource(card.suit)} />
              <h2 style={{ color: getColor(card.suit) }}>{card.value}</h2>
            </div>
          </li>
        ))}
    </ul>
  )
}

export default CardRow
