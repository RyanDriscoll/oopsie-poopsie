import React from "react";
import App from "next/app";
import fetch from "isomorphic-unfetch";
import getCookies from "next-cookies";
import Head from "next/head";
import Router from "next/router";
import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/main.scss";
import { auth, ref } from "../lib/firebase";
import { CombinedProvider } from "../context/CombinedContext";

import Layout from "../components/Layout";

export default class MyApp extends App {
  initialState = {
    setState: this.setState.bind(this),
    loading: false,
    players: []
  };

  state = this.initialState;

  render() {
    const { Component, pageProps, user } = this.props;

    return (
      <CombinedProvider value={this.state}>
        <Head>
          <title>oopsie poopsie</title>
          <link rel="icon" type="image/png" href="/images/favicon.ico" />
        </Head>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </CombinedProvider>
    );
  }
}
