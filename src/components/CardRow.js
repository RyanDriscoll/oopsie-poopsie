import styles from "../styles/components/card-row.module.scss";

export default ({ cards }) => {
  const getColor = suit => (suit === "C" || suit === "S" ? "black" : "red");
  const getSource = suit => {
    switch (suit) {
      case "C":
        return "/images/club.png";
      case "H":
        return "/images/heart.png";
      case "S":
        return "/images/spade.png";
      case "D":
        return "/images/diamond.png";
    }
  };
  return (
    <ul inline className={styles.card_row}>
      {cards &&
        cards.map(card => (
          <li key={card.cardId}>
            <div>
              <img src={getSource(card.suit)} />
              <h2 style={{ color: getColor(card.suit) }}>{card.value}</h2>
            </div>
          </li>
        ))}
    </ul>
  );
};
