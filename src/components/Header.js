import React, { useState, useContext } from "react"
import Link from "next/link"
import classNames from "classnames"
import Modal from "reactstrap/lib/Modal"
import ModalHeader from "reactstrap/lib/ModalHeader"
import ModalBody from "reactstrap/lib/ModalBody"
import CombinedContext from "../context/CombinedContext"
import styles from "../styles/components/header.module.scss"
import { Sound, Mute, Sun, Moon } from "../components/Icons"

const Header = () => {
  const [showRules, setShowRules] = useState(false)
  const toggleRules = () => {
    setShowRules(!showRules)
  }
  const { mute, dark, mounted, setState } = useContext(CombinedContext)

  const handleSound = () => {
    setState(prevState => ({
      mute: !prevState.mute
    }))
  }

  const handleDark = () => {
    setState(prevState => ({
      dark: !prevState.dark
    }))
  }

  return (
    <>
      <header id={styles.header}>
        <Link href="/">
          <a className={styles.img_container}>
            <img
              src="/images/poop.png"
              alt="Oh Shit Logo"
              className={classNames({
                [styles.huge]: !mounted
              })}
            />
          </a>
        </Link>
        <h1>oopsie poopsie...</h1>

        <div className={styles.rules}>
          <div title={dark ? "Light mode" : "Dark mode"} onClick={handleDark}>
            {dark ? (
              <Sun className={styles.icon} />
            ) : (
              <Moon className={styles.icon} />
            )}
          </div>
          <div
            title={`Notification sounds ${mute ? "muted" : "active"}`}
            onClick={handleSound}
          >
            {mute ? (
              <Mute className={styles.icon} />
            ) : (
              <Sound className={styles.icon} />
            )}
          </div>
          <button onClick={toggleRules}>
            <h4 className="red-text">rules</h4>
          </button>
        </div>
      </header>
      <Modal
        centered
        size="lg"
        isOpen={showRules}
        toggle={toggleRules}
        contentClassName="rules-modal"
      >
        <ModalHeader toggle={toggleRules}>rules</ModalHeader>
        <ModalBody>
          <h2>Game Objective</h2>
          <p>The aim of the game is to score more points than your opponent.</p>

          <h2>Rounds</h2>
          <p>
            There is a total of 19 rounds in the game. The number of cards dealt
            to each player is determined by the round. Ten cards are initially
            dealt and then one less each consecutive round until only one card
            is being dealt. After the one card round an additionally card is
            dealt each round until there are 10 cards dealt.
          </p>

          <h3>Starting the game</h3>
          <p>The following steps are repeated for each round:</p>

          <ol>
            <li>
              Cards are dealt starting with the player to the left of the
              dealer.
            </li>
            <li>The trump suit is shown (see trumps).</li>
            <li>
              Each player makes their bid for the round starting with the player
              to the left of the dealer (see bidding and scoring).
            </li>
            <li>
              The player to the left of the dealer plays a card of their choice.
            </li>
            <li>
              In a clockwise direction each player plays a card. If a player can
              follow suit they must.
            </li>
            <li>
              After each player has played their cards the trick is evaluated.
              The person who played the highest card of the lead suit (the suit
              the first player played) wins the trick. The only exception would
              be if a player could not follow suit and trumped the trick. Under
              these circumstances the person who played the highest trump wins
              the trick.
            </li>
            <li>The person who won the trick then leads the next trick.</li>
            <li>Steps 5 - 7 are repeated until all cards have been played.</li>
            <li>
              Record the scores and deal the next round.(see scoring and
              bidding)
            </li>
          </ol>
          <h3>The Value of Cards</h3>
          <p>
            Card values from lowest to highest are: 2, 3, 4, 5, 6, 7, 8, 9, 10,
            J, Q, K, A. Hence an ace would beat any other card and a 2 would
            beat nothing. The exception to these values is if a card is a trump.
            The highest trump card is the Jack of the trump suit and the Jack of
            the same colour also becomes a trump and is the second highest card
            in the game. Hence, if spades was trumps the highest valued card in
            the game would be the Jack of Spades and the second highest would be
            the Jack of Clubs. Under these circumstance the Jack of Clubs would
            be played at any time a spade could be played.
          </p>
          <h3>Trump Suit</h3>
          <p>
            After the cards are dealt each round, a card is turned over and its
            suit is declared the trump for the round. A trump like any other
            suit can only be played if it is lead or if a player does not have
            any cards of the suit that was lead. However, unlike other suits, if
            a player can't follow suit and instead plays a trump the highest
            trump will beat all other cards regardless of their values. Hence,
            if spades was trumps, a player lead with the Ace of Hearts, the next
            player didn't have any hearts and instead chose to play a Two of
            Spades because it is a trump card the second player would win the
            trick.
          </p>

          <p>
            As noted earlier the Jack of a trump suit is the highest card in the
            game. Furthermore, the Jack of the same colour in the off-suit is
            the second highest. The off-suit trump for the all purposes in the
            round becomes the trump suit.
          </p>

          <h3>Scoring and Bidding</h3>
          <p>
            At the beginning of each round, after looking at their cards,
            players bid how many tricks they expect to win. Bidding starts with
            the player to the left of the dealer. As a result, the dealer always
            bids last. The dealer may not make a bid that will result in the sum
            of player bids for the round being equal to the number of cards in
            the round.
          </p>

          <p>
            At the end of each round, players are awarded one point for each
            trick they won. Furthermore, players who achieve their bid exactly
            are awarded a bonus 10 points for the round. Notably, players who
            win more than what they bid do not receive the bonus points.
          </p>
          <a
            href="http://playohsit.appspot.com/OhShitRules.html"
            target="_blank"
          >
            Rules Credited to playoshit.appspot.com
          </a>
        </ModalBody>
      </Modal>
    </>
  )
}

export default Header
