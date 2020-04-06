import React, { createRef } from "react"
import dynamic from "next/dynamic"
import CombinedContext from "../context/CombinedContext"
// import Notification from "react-web-notification"
const Notification = dynamic(() => import("react-web-notification"), {
  ssr: false
})

class NotificationController extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      ignore: false
    }

    this.sound = createRef()
  }
  static contextType = CombinedContext

  handlePermissionGranted = () => {
    console.log("Permission Granted")
    this.setState({
      ignore: false
    })
  }
  handlePermissionDenied = () => {
    console.log("Permission Denied")
    this.setState({
      ignore: true
    })
  }
  handleNotSupported = () => {
    console.log("Web Notification not Supported")
    this.setState({
      ignore: true
    })
  }

  handleNotificationOnClose = (e, tag) => {
    this.props.onClose()
  }

  handleNotificationOnShow = (e, tag) => {
    if (!this.context.mute) {
      this.playSound()
    }
  }

  playSound = filename => {
    if (this.sound) {
      this.sound.play()
    }
  }

  render() {
    return this.props.showNotification ? (
      <div>
        <Notification
          ignore={this.state.ignore}
          notSupported={this.handleNotSupported}
          onPermissionGranted={this.handlePermissionGranted}
          onPermissionDenied={this.handlePermissionDenied}
          onShow={this.handleNotificationOnShow}
          onClose={this.handleNotificationOnClose}
          timeout={2000}
          title={"oopsie poopsie..."}
          options={{
            body: `your turn, ${this.props.userName}`,
            icon: "/images/poop.png"
          }}
        />
        <audio
          id="sound"
          preload="auto"
          ref={el => {
            this.sound = el
          }}
        >
          <source src="/audio/notification.mp3" type="audio/mpeg" />
          <embed
            hidden={true}
            autostart="false"
            loop={false}
            src="/audio/notification.mp3"
          />
        </audio>
      </div>
    ) : null
  }
}

export default NotificationController
