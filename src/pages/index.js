import React, { useState, useRef } from "react";
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
import { ref } from "../lib/firebase";
import { withRouter } from "next/router";
import { absoluteUrl } from "../utils/helpers";
import styles from "../styles/pages/home.module.scss";
import { CopyIcon } from "../components/Icons";

const CreateGame = ({ router, origin }) => {
  const [name, setName] = useState("");
  const [game, setGame] = useState("");
  const [gameId, setGameId] = useState("");
  const [url, setUrl] = useState("");
  const [copySuccess, setCopySuccess] = useState("");

  const gameUrlRef = useRef(null);

  const handleChange = e => {
    const { name, value } = e.target;
    if (name === "name") {
      setName(value);
    } else {
      setGame(value);
    }
  };

  const newGame = async e => {
    try {
      const newGameRef = ref("games").push();
      const gameId = newGameRef.key;
      const playerRef = ref(`players`).push();
      const playerId = playerRef.key;
      const updateObj = {};
      updateObj[`games/${gameId}/name`] = game;
      updateObj[`games/${gameId}/gameId`] = gameId;
      updateObj[`games/${gameId}/status`] = "pending";
      updateObj[`players/${playerId}/name`] = name;
      updateObj[`players/${playerId}/gameId`] = gameId;
      updateObj[`players/${playerId}/host`] = true;
      updateObj[`players/${playerId}/playerId`] = playerId;
      await ref().update(updateObj);
      localStorage.setItem("oh-shit-player-id", playerId);
      setGameId(gameId);
      setUrl(`${origin}/game/${gameId}`);
      setName("");
      setGame("");
    } catch (error) {
      console.error(`$$>>>>: newGame -> error`, error);
    }
  };

  const copyToClipboard = e => {
    gameUrlRef.current.select();
    document.execCommand("copy");
    e.target.focus();
    setCopySuccess("Copied!");
  };

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
            <InputGroup>
              <Input value={url} readOnly innerRef={gameUrlRef} />
              <InputGroupAddon addonType="append">
                <Button onClick={copyToClipboard}>
                  <CopyIcon style={{ width: 18 }} />
                </Button>
              </InputGroupAddon>
            </InputGroup>
            <h6 className={styles.copied}>{copySuccess}</h6>
          </Row>
          <Row className="justify-content-center m-5">
            <Link href={"/game/[gameId]"} as={`/game/${gameId}`}>
              <a className={styles.enter_game_button}>ENTER GAME</a>
            </Link>
          </Row>
        </>
      ) : (
        <Form>
          <FormGroup>
            <Label for="game">Game Name</Label>
            <Input
              type="text"
              name="game"
              id="game"
              value={game}
              onChange={handleChange}
            />
          </FormGroup>
          <FormGroup>
            <Label for="game">User Name</Label>
            <Input
              type="text"
              name="name"
              id="name"
              value={name}
              onChange={handleChange}
            />
          </FormGroup>
          <Button onClick={newGame}>NEW GAME</Button>
        </Form>
      )}
    </Container>
  );
};

CreateGame.getInitialProps = ({ req, res }) => {
  const { origin } = absoluteUrl(req, "localhost:3000");
  return { origin };
};

export default withRouter(CreateGame);
