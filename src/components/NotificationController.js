import React from "react"
import dynamic from "next/dynamic"
// import Notification from "react-web-notification"
const Notification = dynamic(() => import("react-web-notification"), {
  ssr: false
})

class NotificationController extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      ignore: false,
      title: "",
      askAgain: true
    }
  }

  componentDidMount() {
    window.Notification.requestPermission()
  }

  componentDidUpdate(prevProps) {
    if (this.props.showNotification && !prevProps.showNotification) {
      console.log("SHOW NOTIFICATION")
      this.showNotification()
    }
    if (!this.props.showNotification && prevProps.showNotification) {
      this.setState({ ignore: true, title: "" })
    }
  }

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

  handleNotificationOnClick = (e, tag) => {
    console.log(e, "Notification clicked tag:" + tag)
  }

  handleNotificationOnError = (e, tag) => {
    console.log(e, "Notification error tag:" + tag)
  }

  handleNotificationOnClose = (e, tag) => {
    console.log(e, "Notification closed tag:" + tag)
    this.props.onClose()
  }

  handleNotificationOnShow = (e, tag) => {
    this.playSound()
    console.log(e, "Notification shown tag:" + tag)
  }

  playSound = filename => {
    document.getElementById("sound").play()
  }

  showNotification() {
    if (this.state.ignore) {
      return
    }

    const title = "your turn!"
    const body = "go already..."
    const icon = "/public/images/poop.png"
    // const icon = 'http://localhost:3000/Notifications_button_24.png';

    // Available options
    // See https://developer.mozilla.org/en-US/docs/Web/API/Notification/Notification
    const options = {
      body: body,
      icon: icon,
      lang: "en",
      dir: "ltr"
    }
    this.setState({
      title: title,
      options: options
    })
  }

  render() {
    return (
      <div>
        <Notification
          ignore={this.state.ignore && this.state.title !== ""}
          notSupported={this.handleNotSupported}
          onPermissionGranted={this.handlePermissionGranted}
          onPermissionDenied={this.handlePermissionDenied}
          onShow={this.handleNotificationOnShow}
          onClick={this.handleNotificationOnClick}
          onClose={this.handleNotificationOnClose}
          onError={this.handleNotificationOnError}
          timeout={2000}
          title={this.state.title}
          options={this.state.options}
        />
        <audio id="sound" preload="auto">
          <source src="/audio/notification.mp3" type="audio/mpeg" />
          <embed
            hidden={true}
            autostart="false"
            loop={false}
            src="/audio/notification.mp3"
          />
        </audio>
      </div>
    )
  }
}

export default NotificationController
