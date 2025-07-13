// script.js - Milk Bottle Tracker (Fixed & Enhanced)

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
  getDocs,
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

// Show user info
onAuthStateChanged(auth, user => {
  if (user) {
    currentUser = user;
    userNameDisplay.textContent = user.displayName || user.email;
    listenToEntries();
  } else {
    window.location.href = "login.html";
  }
});

// Calculate amount on bottle input
if (bottleInput && calculatedAmount) {
  bottleInput.addEventListener("input", () => {
    const bottles = parseInt(bottleInput.value);
    calculatedAmount.textContent = bottles > 0 ? bottles * 25 : 0;
  });
}

// Add Entry
if (addEntryBtn) {
  addEntryBtn.addEventListener("click", async () => {
    const bottles = parseInt(bottleInput.value);
    if (!bottles || bottles < 1) return alert("Enter a valid bottle count");

    let entryTime = entryDatetimeInput.value
      ? new Date(entryDatetimeInput.value)
      : new Date();

    const payload = {
      bottles,
      amount: bottles * 25,
      timestamp: entryTime.toISOString()
    };

    await addDoc(collection(db, "users", currentUser.uid, "entries"), payload);
    bottleInput.value = "";
    entryDatetimeInput.value = "";
    calculatedAmount.textContent = "0";
  });
}

// Live listener to entries
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
        <td>
          <button class="delete-btn" data-id="${id}">🗑️</button>
        </td>
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

// Edit bottle count inline
entryList.addEventListener("change", async e => {
  if (e.target.classList.contains("edit-bottles")) {
    const id = e.target.dataset.id;
    const newBottles = parseInt(e.target.value);
    if (newBottles && newBottles > 0) {
      await updateDoc(doc(db, "users", currentUser.uid, "entries", id), {
        bottles: newBottles,
        amount: newBottles * 25
      });
    }
  }
});

// Delete entry
entryList.addEventListener("click", async e => {
  if (e.target.classList.contains("delete-btn")) {
    const id = e.target.dataset.id;
    await deleteDoc(doc(db, "users", currentUser.uid, "entries", id));
  }
});

// Logout
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    signOut(auth);
  });
}

// Export to Excel
if (exportExcelBtn) {
  exportExcelBtn.addEventListener("click", () => {
    const table = document.querySelector("table").outerHTML;
    const blob = new Blob(
      [
        `<html><head><meta charset='utf-8'></head><body>
        <h2>Milk Bottle Tracker - ${new Date().toLocaleString("default", {
          month: "long",
          year: "numeric"
        })}</h2>${table}</body></html>`
      ],
      { type: "application/vnd.ms-excel" }
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "Milk_Bottle_Tracker.xls";
    a.click();
  });
}

// Export to PDF
if (exportPdfBtn) {
  exportPdfBtn.addEventListener("click", () => {
    const printWin = window.open("", "", "width=800,height=600");
    printWin.document.write(`
      <html>
        <head><title>Milk Bottle Tracker</title></head>
        <body>
          <h2>Milk Bottle Tracker - ${new Date().toLocaleString("default", {
            month: "long",
            year: "numeric"
          })}</h2>
          ${document.querySelector("table").outerHTML}
        </body>
      </html>
    `);
    printWin.document.close();
    printWin.print();
  });
}
