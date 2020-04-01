/* eslint-disable no-param-reassign */
/* eslint-disable global-require */
/* eslint-disable import/no-extraneous-dependencies */
// const withCSS = require("@zeit/next-css");
const webpack = require("webpack");
const dotenv = require("dotenv");

dotenv.config({ path: ".env.build" });

module.exports = {
  env: {
    FB_API_KEY: process.env.FB_API_KEY,
    AUTH_DOMAIN: process.env.AUTH_DOMAIN,
    DB_URL: process.env.DB_URL,
    PROJECT_ID: process.env.PROJECT_ID,
    STORAGE_BUCKET: process.env.STORAGE_BUCKET,
    MESSAGING_SENDER_ID: process.env.MESSAGING_SENDER_ID,
    APP_ID: process.env.APP_ID,
    FB_ADMIN_CREDENTIAL: process.env.FB_ADMIN_CREDENTIAL,
    MEASUREMENT_ID: process.env.MEASUREMENT_ID
  }
};
