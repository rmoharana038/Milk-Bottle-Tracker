
# 🍼 Milk Bottle Tracker

A professional and responsive web app to track daily milk bottle usage, expenses, and history. Built using Firebase + Vanilla JavaScript with full PWA offline capabilities and auto-sync.

---

## 🚀 Features

- 🔐 Firebase Auth – Login / Signup / Password Reset
- 📊 Dashboard – Track total entries, bottles, and amount
- 🧾 Add / Edit / Delete entries
- 📴 Works Offline – Create entries offline using IndexedDB
- 🔄 Auto-Sync – Automatically syncs offline entries when reconnected
- 📤 Export entries to Excel and PDF
- 📈 Usage Analytics – 7 / 30 / 90 days chart (Chart.js)
- 📱 Installable PWA (Progressive Web App)
- 🔒 Per-user private data in Firestore
- 🌐 Fully responsive – Mobile & Desktop ready

---

## 🛠 Tech Stack

- HTML + CSS + JavaScript
- Firebase Auth + Firestore
- IndexedDB for offline data
- Chart.js for graphs
- PWA (manifest + service worker)

---

## 📦 Folder Structure

```
Milk-Bottle-Tracker/
├── index.html
├── login.html
├── signup.html
├── script.js
├── style.css
├── sw.js
├── manifest.json
├── firebase-config.js
├── icon.png
```

---

## 🔧 Setup Instructions

### 1. Clone the Repo

```bash
git clone https://github.com/YOUR_USERNAME/Milk-Bottle-Tracker.git
cd Milk-Bottle-Tracker
```

### 2. Setup Firebase

- Go to [Firebase Console](https://console.firebase.google.com)
- Create a new project
- Enable **Authentication > Email/Password**
- Enable **Cloud Firestore**
- Copy your Firebase credentials into `firebase-config.js`:

```js
// firebase-config.js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-app",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "XXXXXXX",
  appId: "XXXXXXXXXXXXXXX"
};
export default firebaseConfig;
```

### 3. Firestore Rules

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/entries/{entryId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 4. Run the App Locally

Open `index.html` directly in a browser  
OR use a static server like:

```bash
npx serve .
```

---

## 🌐 How Offline & Sync Works

- New entries added offline are stored in `IndexedDB`
- On reconnect, unsynced entries are pushed to Firebase
- Editing & deleting entries requires online access

---

## 📲 PWA Installation

- Open the app in Chrome or Edge
- Click "Install" from the address bar or browser menu
- App works offline after first load ✅

---

## 📤 Export Options

- Click the 📗 Excel or 📕 PDF button to download your entry table
- Title includes current month and year for clarity

---

## 🤝 Credits

Made with ❤️ by [Your Name / Brand]  
Inspired by simple tools for smart daily dairy tracking.

---

## 📜 License

MIT License – Free for personal and commercial use.
