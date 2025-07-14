# 🥛 Milk Bottle Tracker

A modern web app to track daily milk bottle usage with advanced features like Firebase sync, offline support, analytics, and PDF/Excel export.

🔗 **Live Demo:** [rmoharana038.github.io/Milk-Bottle-Tracker](https://rmoharana038.github.io/Milk-Bottle-Tracker)

---

## 📦 Features

- ✅ **Firebase Authentication** — Secure login/logout support
- ✅ **Realtime Firestore Sync** — Entries auto-synced with Firestore
- ✅ **Offline Mode (IndexedDB)** — Works fully offline and syncs when back online
- ✅ **Entry Management** — Add, edit, and delete bottle usage entries
- ✅ **Analytics Dashboard** — Interactive bar charts for 7, 30, and 90-day insights
- ✅ **Excel Export** — Styled `.xlsx` report with logo, date, summary, and borders
- ✅ **PDF Export** — Beautiful printable report with logo, date & table
- ✅ **Responsive UI** — Fully optimized for mobile and desktop
- ✅ **PWA Enabled** — Installable on Android/desktop like a native app

---

## 📊 Technologies Used

| Frontend | Backend & Services | Libraries |
|----------|---------------------|-----------|
| HTML5, CSS3, JavaScript (ES6) | Firebase Firestore, Firebase Auth | Chart.js, SheetJS (xlsx.js) |

---

## 📁 Project Structure

```
Milk-Bottle-Tracker/
├── index.html
├── login.html
├── style.css
├── script.js
├── firebase-config.js
├── icon.png
├── manifest.json
├── sw.js
└── README.md
```

---

## ⚙️ Setup Instructions

1. **Clone the Repo**
   ```bash
   git clone https://github.com/rmoharana038/Milk-Bottle-Tracker.git
   ```

2. **Firebase Configuration**
   - Create a Firebase project.
   - Enable **Authentication** (Email/Password).
   - Set Firestore rules:
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
   - Add your config to `firebase-config.js`:
     ```js
     export default {
       apiKey: "...",
       authDomain: "...",
       projectId: "...",
       ...
     };
     ```

3. **Host on GitHub Pages**
   - Push your code to `main` branch.
   - Go to GitHub repo → Settings → Pages → Source: `main /root` → Save.
   - Your app is live!

---

## 📦 Exports Overview

### 🧾 Excel (.xlsx)

- Title: `🥛 Milk Bottle Tracker — Monthly Report`
- Includes:
  - Current date/time
  - Total bottles & amount
  - Table: Date & Time, Bottles, Amount, Status
- Styling:
  - Green headers, bold fonts, table borders

### 🖨️ PDF

- Includes:
  - Logo + Title
  - Date/time
  - Summary & full data table
- Opens print preview for download/save

---

## 📱 PWA Support

- **Add to Home Screen** support (mobile)
- **Offline Access** (via `sw.js`)
- Custom icon & manifest included

---

## 📸 Screenshots

![Dashboard Screenshot](https://rmoharana038.github.io/Milk-Bottle-Tracker/assets/dashboard.png)
![Analytics Screenshot](https://rmoharana038.github.io/Milk-Bottle-Tracker/assets/chart.png)
> _(Add your own screenshots to `/assets/` folder for better visuals)_

---

## 🙏 Credits

Made with 💙 by [Rajesh Moharana](https://github.com/rmoharana038)

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
