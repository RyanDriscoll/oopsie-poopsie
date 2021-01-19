/* eslint-disable prefer-arrow-callback */
const chai = require("chai");
const { assert, expect, should } = chai;
const sinon = require("sinon");
const admin = require("firebase-admin");
const functions = require("firebase-functions");
const supertest = require("supertest");
const { generateUid } = require("../utils");

const projectConfig = {
  databaseURL: "https://oh-shit-test.firebaseio.com",
  storageBucket: "oh-shit-test.appspot.com",
  projectId: "oh-shit-test",
};

const test = require("firebase-functions-test")(
  projectConfig,
  "./secrets/serviceKey.json"
);

const ref = path => admin.database().ref(path);

describe("Oh Shit Cloud Functions", function () {
  this.timeout(5000);
  let myFunctions, authHeader, timer;

  before(async function () {
    myFunctions = require("../");
    await ref().remove();
  });

  after(async function () {
    test.cleanup();
    clearTimeout(timer);
    // await ref().remove();
    // await ref(`databaseNotEmpty`).set(true);
  });

  describe("api/new-game", function () {
    let data;

    beforeEach(function () {
      data = {
        gameName: "test game",
        playerName: "Steve McQueen",
        numCards: 5,
        bidPoints: false,
        dirty: false,
        timeLimit: null,
      };
    });

    it("should return 200 success", async function () {
      const response = await supertest(myFunctions.api)
        .post("/new-game")
        .send(data)
        .expect(200)
        .catch(err => {
          throw err;
        });
      expect(response.body.playerId).to.not.be.null;
      expect(response.body.gameId).to.not.be.null;
    });
  });

  describe("api/add-player", function () {
    let data;

    beforeEach(function () {
      data = { playerName: "Joe McQueen", gameId: "123" };
    });

    it("should return 200 success", async function () {
      const response = await supertest(myFunctions.api)
        .post("/add-player")
        .send(data)
        .expect(200)
        .catch(err => {
          throw err;
        });
      expect(response.body.playerId).to.not.be.null;
    });
  });

  describe("api/start-game", function () {
    let gameData, gameId, playerId;

    beforeEach(async function () {
      gameData = {
        gameName: "test game",
        playerName: "Steve McQueen",
        numCards: 5,
        bidPoints: false,
        dirty: false,
        timeLimit: null,
      };

      const gameResponse = await supertest(myFunctions.api)
        .post("/new-game")
        .send(gameData);

      gameId = gameResponse.body.gameId;
      playerId = gameResponse.body.playerId;

      const playerResponse = await supertest(myFunctions.api)
        .post("/add-player")
        .send({
          playerName: "Gary McQueen",
          gameId,
        });
    });

    it("should return 200 success", async function () {
      const response = await supertest(myFunctions.api)
        .post("/start-game")
        .send({ gameId })
        .expect(200)
        .catch(err => {
          throw err;
        });

      await supertest(myFunctions.api).post("/submit-bid").send({
        playerId,
        gameId,
        nextPlayerId: "123",
      });
    });
  });
  describe.only("makeUpperCase", () => {
    // Test Case: setting messages/11111/original to 'input' should cause 'INPUT' to be written to
    // messages/11111/uppercase
    it("should upper case input and write it to /uppercase", () => {
      // [START assertOnline]
      // Create a DataSnapshot with the value 'input' and the reference path 'messages/11111/original'.
      const snap = test.database.makeDataSnapshot(
        { value: "input", name: "foo" },
        "messages/11111/original"
      );

      // Wrap the makeUppercase function
      const wrapped = test.wrap(myFunctions.makeUppercase);
      // Call the wrapped function with the snapshot you constructed.
      return wrapped(snap).then(() => {
        // Read the value of the data at messages/11111/uppercase. Because `admin.initializeApp()` is
        // called in functions/index.js, there's already a Firebase app initialized. Otherwise, add
        // `admin.initializeApp()` before this line.
        return admin
          .database()
          .ref("messages/11111/uppercase")
          .once("value")
          .then(createdSnap => {
            // Assert that the value is the uppercased version of our input.
            assert.equal(createdSnap.val(), "INPUT");
            console.log(`$$>>>>: createdSnap.val()`, createdSnap.val());
          });
      });
      // [END assertOnline]
    });
  });

  describe("onAllBidsIn", async function () {
    let bid, bidId, snap, params, wrapped;

    beforeEach(async function () {
      wrapped = test.wrap(myFunctions.makeUppercase);
      //   const round = {
      //     gameId: "abcd",
      //     numPlayers: 2,
      //     bids: {
      //       playerOne: 0,
      //     },
      //   };
      //   snap = test.database.makeDataSnapshot(round, "/rounds/{roundId}");
      //   params = { roundId: "1234", playerId: "playerOne" };
      //   await wrapped(snap, { params });
    });

    afterEach(function () {
      // return ref().remove();
    });

    it("should do nothing if all bids are not in yet", async function () {
      const snap = test.database.makeDataSnapshot(
        "stuff",
        "messages/11111/original"
      );
      await wrapped(snap);

      const stuffSnap = await admin
        .database()
        .ref("messages/11111/original")
        .once("value");
      console.log(`$$>>>>: stuffSnap`, stuffSnap.val());
      // const beforeSnap = test.database.makeDataSnapshot(
      //   {
      //     gameId: "abcd",
      //     numPlayers: 2,
      //     bids: {
      //       playerOne: 0,
      //     },
      //   },
      //   "/rounds/{roundId}"
      // );
      // const afterSnap = test.database.makeDataSnapshot(
      //   {
      //     gameId: "abcd",
      //     numPlayers: 2,
      //     bids: {
      //       playerOne: 0,
      //       playerTwo: 2,
      //     },
      //   },
      //   "/rounds/{roundId}"
      // );
      // const change = test.makeChange(beforeSnap, afterSnap);
      // params = { roundId: "1234" };
      // await wrapped(change, { params });

      // const numPlayer = await ref()
      //   .once("value")
      //   .then(snap => snap.exists());
      // console.log(`$$>>>>: numPlayer`, numPlayer);
    });
  });
});
