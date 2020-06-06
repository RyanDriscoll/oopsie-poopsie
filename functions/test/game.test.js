/* eslint-disable prefer-arrow-callback */
const chai = require("chai");
const { assert, expect, should } = chai;
const sinon = require("sinon");
const admin = require("firebase-admin");
const functions = require("firebase-functions");
const supertest = require("supertest");

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
    await ref().remove();
    await ref(`databaseNotEmpty`).set(true);
  });

  describe("api/add-player", function () {
    let data;

    beforeEach(function () {
      data = { playerName: "Steve McQueen", gameId: "123" };
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
});
