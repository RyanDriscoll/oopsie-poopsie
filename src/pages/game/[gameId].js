import { Component } from "react";
import fetch from "isomorphic-unfetch";
import Link from "next/link";
import Container from "reactstrap/lib/Container";
import Button from "reactstrap/lib/Button";
import Form from "reactstrap/lib/Form";
import FormGroup from "reactstrap/lib/FormGroup";
import Label from "reactstrap/lib/Label";
import Input from "reactstrap/lib/Input";
import InputGroup from "reactstrap/lib/InputGroup";
import InputGroupAddon from "reactstrap/lib/InputGroupAddon";
import InputGroupText from "reactstrap/lib/InputGroupText";
import Row from "reactstrap/lib/Row";
import Col from "reactstrap/lib/Col";
import CombinedContext from "../../context/CombinedContext";
import { ref } from "../../lib/firebase";
import styles from "../../styles/pages/game.module.scss";
import CardRow from "../../components/CardRow";

class Game extends Component {
  state = {
    game: null,
    players: [],
    playerId: null,
    playerName: "",
    hand: [],
    isHost: false
  };

  gameRef;
  playersRef;
  handRef;

  async componentDidMount() {
    const playerId = localStorage.getItem("oh-shit-player-id");
    this.setState({ playerId });
    if (playerId) {
      this.listenToHand(playerId);
    }
    const { gameId } = this.props;
    this.listenToPlayers(gameId, playerId);
    this.listenToGame(gameId);
  }

  componentWillUnmount() {
    if (this.gameRef) {
      this.gameRef.off();
    }
    if (this.playersRef) {
      this.playersRef.off();
    }
    if (this.handRef) {
      this.handRef.off();
    }
  }

  listenToPlayers = async (gameId, playerId) => {
    try {
      this.playersRef = ref(`players`)
        .orderByChild("gameId")
        .equalTo(gameId);

      await this.playersRef.on("child_added", data => {
        const player = data.val();
        this.setState(prevState => {
          const newState = {
            players: [...prevState.players, player]
          };
          if (player.host && player.playerId === playerId) {
            newState.isHost = true;
          }
          return newState;
        });
      });
    } catch (error) {
      console.error(`$$>>>>: Game -> listenToPlayers -> error`, error);
    }
  };

  listenToGame = async gameId => {
    try {
      this.gameRef = ref(`games/${gameId}`);
      let initialDataLoaded = false;
      await Promise.all([
        this.gameRef.on("child_added", data => {
          if (initialDataLoaded) {
            const value = data.val();
            const key = data.key;
            this.setState(prevState => ({
              game: { ...prevState.game, [key]: value }
            }));
          }
        }),
        this.gameRef.on("child_changed", data => {
          if (initialDataLoaded) {
            const value = data.val();
            const key = data.key;
            this.setState(prevState => ({
              game: { ...prevState.game, [key]: value }
            }));
          }
        }),
        this.gameRef.once("value").then(data => {
          const game = data.val();
          this.setState({ game });
          initialDataLoaded = true;
        })
      ]);
    } catch (error) {
      console.error(`$$>>>>: Game -> listenToGame -> error`, error);
    }
  };

  listenToHand = async playerId => {
    try {
      this.handRef = ref(`hands/${playerId}/cards`);
      await Promise.all([
        this.handRef.on("child_added", data => {
          const card = data.val();
          this.setState(prevState => ({
            hand: [...prevState.hand, card]
          }));
        }),
        this.handRef.on("child_removed", data => {
          const value = data.val();
          const key = data.key;
          this.setState(prevState => ({
            hand: prevState.hand.filter(c => c.cardId !== key)
          }));
        })
      ]);
    } catch (error) {
      console.error(`$$>>>>: Game -> listenToGame -> error`, error);
    }
  };

  addPlayer = async () => {
    try {
      const { gameId } = this.props;
      const { playerName } = this.state;
      const playerRef = ref("players").push();
      const playerId = playerRef.key;
      await playerRef.update({ name: playerName, gameId, playerId });
      localStorage.setItem("oh-shit-player-id", playerId);
      this.setState({ playerId });
      this.listenToHand(playerId);
    } catch (error) {
      console.error(`$$>>>>: Game -> addPlayer -> error`, error);
    }
  };

  startGame = async () => {
    try {
      const { gameId } = this.props;
      let { players } = this.state;
      const response = await fetch(
        "https://us-central1-oh-shit-ac7c3.cloudfunctions.net/api/start-game",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ gameId, players })
        }
      );
      console.log(`$$>>>>: Game -> startGame -> response`, response);
    } catch (error) {
      console.error(`$$>>>>: Game -> startGame -> error`, error);
    }
  };

  handleChange = e => {
    this.setState({
      playerName: e.target.value
    });
  };

  render() {
    const { game, players, playerId, playerName, isHost, hand } = this.state;
    return (
      <>
        <Container className={styles.game_page}>
          <Row>
            <h2>{game && game.name}</h2>
          </Row>
          {!playerId && (
            <Row>
              <Form>
                <FormGroup>
                  <Label for="name">User Name</Label>
                  <Input
                    type="text"
                    name="name"
                    id="name"
                    value={playerName}
                    onChange={this.handleChange}
                  />
                </FormGroup>
                <Button onClick={this.addPlayer}>ADD PLAYER</Button>
              </Form>
            </Row>
          )}
          <Row>
            <ul>
              {players.map(player => (
                <li key={player.playerId}>
                  <h3>{player.name}</h3>
                </li>
              ))}
            </ul>
          </Row>
          {isHost && game && game.status && game.status === "pending" && (
            <Row>
              <Button color="success" onClick={this.startGame}>
                START GAME
              </Button>
            </Row>
          )}
        </Container>
        <CardRow cards={hand} />
      </>
    );
  }
}

Game.contextType = CombinedContext;

Game.getInitialProps = context => {
  const { req, query } = context;
  const { gameId } = query;

  return { gameId };
};

export default Game;
