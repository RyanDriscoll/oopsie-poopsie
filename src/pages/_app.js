import React from "react"
import App from "next/app"
import Head from "next/head"
import "bootstrap/dist/css/bootstrap.min.css"
import "../styles/main.scss"
import { CombinedProvider } from "../context/CombinedContext"

import Layout from "../components/Layout"

export default class MyApp extends App {
  constructor(props) {
    super(props)
    this.state = {
      setState: this.setState.bind(this),
      mute: true
    }
  }

  render() {
    const { Component, pageProps } = this.props

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
    )
  }
}
