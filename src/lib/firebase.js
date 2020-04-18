import * as firebase from "firebase/app"
import "firebase/auth"
import "firebase/database"

const firebaseConfig = {
  apiKey: process.env.FB_API_KEY,
  authDomain: process.env.AUTH_DOMAIN,
  databaseURL: process.env.DB_URL,
  projectId: process.env.PROJECT_ID,
  storageBucket: process.env.STORAGE_BUCKET,
  messagingSenderId: process.env.MESSAGING_SENDER_ID,
  appId: process.env.APP_ID
}

// Initialize Firebase

export const fb = !firebase.apps.length
  ? firebase.initializeApp(firebaseConfig)
  : firebase.app()

export const auth = fb.auth()
export const db = fb.database()
export const ref = path => (path ? db.ref(path) : db.ref())
