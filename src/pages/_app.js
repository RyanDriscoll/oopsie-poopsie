import React from "react"
import App from "next/app"
import Head from "next/head"
import "bootstrap/dist/css/bootstrap.min.css"
import "../styles/main.scss"
import { CombinedProvider } from "../context/CombinedContext"

import Layout from "../components/Layout"
import {
  DARK_BACKGROUND,
  LIGHT_BACKGROUND,
  DARK_TEXT,
  LIGHT_TEXT,
  PINK,
  RED
} from "../utils/constants"

export default class MyApp extends App {
  constructor(props) {
    super(props)
    this.state = {
      setState: this.setState.bind(this),
      mute: true,
      dark: true
    }
  }

  componentDidMount() {
    if (window && window.matchMedia) {
      this.setState({
        dark: this.prefersDark()
      })
      window
        .matchMedia("(prefers-color-scheme: dark)")
        .addEventListener("change", () => {
          this.setState({
            dark: this.prefersDark()
          })
        })
    }
  }

  prefersDark = () => {
    if (window.matchMedia) {
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        return true
      }
    }
    return false
  }

  render() {
    const { Component, pageProps } = this.props
    const { dark } = this.state

    return (
      <CombinedProvider value={this.state}>
        <Head>
          <title>oopsie poopsie</title>
          <link rel="icon" type="image/png" href="/images/favicon.ico" />
        </Head>
        <Layout>
          <Component {...pageProps} />
        </Layout>
        <style global jsx>{`
          body {
            background-color: ${dark
              ? DARK_BACKGROUND
              : LIGHT_BACKGROUND} !important;
          }
          h1,
          h2,
          h3,
          h4,
          h5,
          h6,
          p,
          label {
            color: ${dark ? DARK_TEXT : LIGHT_TEXT};
          }

          .modal-content {
            background-color: ${dark
              ? DARK_BACKGROUND
              : LIGHT_BACKGROUND} !important;
            color: ${dark ? DARK_TEXT : LIGHT_TEXT} !important;
          }

          .modal-content a {
            color: ${dark ? PINK : RED} !important;
          }
        `}</style>
      </CombinedProvider>
    )
  }
}
