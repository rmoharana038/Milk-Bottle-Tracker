// script.js - Milk Bottle Tracker with Enhanced Export (PDF/Excel + IndexedDB Sync)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import firebaseConfig from "./firebase-config.js";

// Firebase init
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM elements
const bottleInput = document.getElementById("bottle-count");
const addEntryBtn = document.getElementById("add-entry");
const entryList = document.getElementById("entry-list");
const logoutBtn = document.getElementById("logout-btn");
const userNameDisplay = document.getElementById("user-name");
const totalEntriesSpan = document.getElementById("total-entries");
const totalBottlesSpan = document.getElementById("total-bottles");
const totalAmountSpan = document.getElementById("total-amount");
const calculatedAmount = document.getElementById("calculated-amount");
const entryDatetimeInput = document.getElementById("entry-datetime");
const exportExcelBtn = document.getElementById("export-excel");
const exportPdfBtn = document.getElementById("export-pdf");

let currentUser = null;
let localDB = null;

// Setup IndexedDB
const openDB = indexedDB.open("MilkTrackerDB", 1);
openDB.onupgradeneeded = e => {
  localDB = e.target.result;
  localDB.createObjectStore("entries", { keyPath: "id", autoIncrement: true });
};
openDB.onsuccess = e => {
  localDB = e.target.result;
  if (navigator.onLine && currentUser) checkPendingSync();
};

// Save to IndexedDB
function saveToIndexedDB(entry) {
  const tx = localDB.transaction("entries", "readwrite");
  tx.objectStore("entries").add(entry);
}

// Sync local entries
function checkPendingSync() {
  if (!navigator.onLine || !currentUser || !localDB) return;
  const tx = localDB.transaction("entries", "readwrite");
  const store = tx.objectStore("entries");
  const getAll = store.getAll();
  getAll.onsuccess = async () => {
    const items = getAll.result;
    for (const item of items) {
      await addDoc(collection(db, "users", currentUser.uid, "entries"), item);
      store.delete(item.id);
    }
  };
}

// Auth state check
onAuthStateChanged(auth, user => {
  if (user) {
    currentUser = user;
    userNameDisplay.textContent = user.displayName || user.email;
    listenToEntries();
    if (navigator.onLine && localDB) checkPendingSync();
  } else {
    window.location.href = "login.html";
  }
});

// Calculate amount
bottleInput?.addEventListener("input", () => {
  const bottles = parseInt(bottleInput.value);
  calculatedAmount.textContent = bottles > 0 ? bottles * 25 : 0;
});

// Add entry
addEntryBtn?.addEventListener("click", async () => {
  const bottles = parseInt(bottleInput.value);
  if (!bottles || bottles < 1) return alert("Enter a valid bottle count");

  const time = entryDatetimeInput.value ? new Date(entryDatetimeInput.value) : new Date();
  const payload = {
    bottles,
    amount: bottles * 25,
    timestamp: time.toISOString()
  };

  if (navigator.onLine && currentUser) {
    await addDoc(collection(db, "users", currentUser.uid, "entries"), payload);
  } else {
    saveToIndexedDB(payload);
    alert("Saved offline. Will sync when reconnected.");
  }

  bottleInput.value = "";
  entryDatetimeInput.value = "";
  calculatedAmount.textContent = "0";
});

// Entry listener
function listenToEntries() {
  const q = query(
    collection(db, "users", currentUser.uid, "entries"),
    orderBy("timestamp", "desc")
  );
  onSnapshot(q, snapshot => {
    entryList.innerHTML = "";
    let totalEntries = 0,
      totalBottles = 0,
      totalAmount = 0;

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const id = docSnap.id;
      const dt = new Date(data.timestamp);
      const dateStr = dt.toLocaleDateString();
      const timeStr = dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${dateStr}<br><small>${timeStr}</small></td>
        <td><input type="number" value="${data.bottles}" min="1" class="edit-bottles" data-id="${id}" /></td>
        <td>₹${data.amount}<br><span style="font-size:0.8rem;">@ ₹25/bottle</span></td>
        <td>Completed</td>
        <td><button class="delete-btn" data-id="${id}">🗑️</button></td>
      `;
      entryList.appendChild(row);

      totalEntries++;
      totalBottles += data.bottles;
      totalAmount += data.amount;
    });

    totalEntriesSpan.textContent = totalEntries;
    totalBottlesSpan.textContent = totalBottles;
    totalAmountSpan.textContent = totalAmount;
  });
}

// Edit entry
entryList.addEventListener("change", async e => {
  if (e.target.classList.contains("edit-bottles")) {
    const id = e.target.dataset.id;
    const newBottles = parseInt(e.target.value);
    if (newBottles > 0 && navigator.onLine) {
      await updateDoc(doc(db, "users", currentUser.uid, "entries", id), {
        bottles: newBottles,
        amount: newBottles * 25
      });
    } else {
      alert("Cannot edit while offline.");
    }
  }
});

// Delete entry
entryList.addEventListener("click", async e => {
  if (e.target.classList.contains("delete-btn")) {
    const id = e.target.dataset.id;
    if (navigator.onLine) {
      await deleteDoc(doc(db, "users", currentUser.uid, "entries", id));
    } else {
      alert("Cannot delete while offline.");
    }
  }
});

// Logout
logoutBtn?.addEventListener("click", () => {
  signOut(auth);
});

// Export Excel (.xlsx-compatible with styling & summary)
exportExcelBtn?.addEventListener("click", () => {
  const logoURL = "https://rmoharana038.github.io/Milk-Bottle-Tracker/icon.png";
  const now = new Date();
  const formattedDate = now.toLocaleString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  const table = document.querySelector("table")?.outerHTML || "";
  const summary = `
    <p><strong>Total Bottles:</strong> ${totalBottlesSpan.textContent} |
       <strong>Total Amount:</strong> ₹${totalAmountSpan.textContent}</p>
  `;

  const htmlContent = `
    <html>
      <head>
        <meta charset='utf-8'>
        <style>
          body { font-family: Arial; padding: 20px; }
          h2 { color: #2c3e50; }
          table { border-collapse: collapse; width: 100%; }
          table, th, td { border: 1px solid #ccc; padding: 8px; text-align: center; }
          th { background: #f7f7f7; }
        </style>
      </head>
      <body>
        <img src="${logoURL}" alt="Logo" style="height: 60px" />
        <h2>Milk Bottle Tracker Report</h2>
        <p><strong>Generated:</strong> ${formattedDate}</p>
        ${summary}
        ${table}
      </body>
    </html>
  `;

  const blob = new Blob([htmlContent], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "Milk_Bottle_Tracker_Report.xls";
  a.click();
});

// Export PDF (styled)
exportPdfBtn?.addEventListener("click", () => {
  const logoURL = "https://rmoharana038.github.io/Milk-Bottle-Tracker/icon.png";
  const now = new Date();
  const formattedDate = now.toLocaleString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  const table = document.querySelector("table")?.outerHTML || "";
  const summary = `
    <p><strong>Total Bottles:</strong> ${totalBottlesSpan.textContent} |
       <strong>Total Amount:</strong> ₹${totalAmountSpan.textContent}</p>
  `;

  const printWin = window.open("", "", "width=900,height=700");
  printWin.document.write(`
    <html>
      <head>
        <title>Milk Bottle Tracker</title>
        <style>
          body { font-family: Arial; padding: 20px; }
          h2 { color: #2c3e50; }
          table { border-collapse: collapse; width: 100%; }
          table, th, td { border: 1px solid #ccc; padding: 8px; text-align: center; }
          th { background: #f0f0f0; }
        </style>
      </head>
      <body>
        <img src="${logoURL}" alt="Logo" style="height: 60px" />
        <h2>Milk Bottle Tracker Report</h2>
        <p><strong>Generated:</strong> ${formattedDate}</p>
        ${summary}
        ${table}
      </body>
    </html>
  `);
  printWin.document.close();
  printWin.print();
});

// Sync check on reconnect
window.addEventListener("online", () => {
  if (currentUser && localDB) checkPendingSync();
});
