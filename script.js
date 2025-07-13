// script.js - Fully Updated

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

// Firebase Init
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM
const bottleInput = document.getElementById("bottle-count");
const addEntryBtn = document.getElementById("add-entry");
const entryList = document.getElementById("entry-list");
const exportExcelBtn = document.getElementById("export-excel");
const exportPdfBtn = document.getElementById("export-pdf");
const clearAllBtn = document.getElementById("clear-all");
const logoutLink = document.getElementById("logout-link");
const userNameDisplay = document.getElementById("user-name");
const currentMonthSpan = document.getElementById("current-month");
const totalEntriesSpan = document.getElementById("total-entries");
const totalBottlesSpan = document.getElementById("total-bottles");
const totalAmountSpan = document.getElementById("total-amount");

let currentUser = null;

// Set current month
const now = new Date();
const monthYear = now.toLocaleString('default', { month: 'long', year: 'numeric' });
if (currentMonthSpan) currentMonthSpan.textContent = monthYear;

// Auth check
onAuthStateChanged(auth, user => {
  if (user) {
    currentUser = user;
    if (userNameDisplay) {
      userNameDisplay.textContent = user.displayName || user.email;
    }
    listenToEntries();
  } else {
    window.location.href = "login.html";
  }
});

// Add Entry
if (addEntryBtn) {
  addEntryBtn.addEventListener("click", async () => {
    const bottles = parseInt(bottleInput.value);
    if (!bottles || bottles < 1) return alert("Enter a valid bottle count");

    const timestamp = new Date();
    const amount = bottles * 25;

    await addDoc(collection(db, "users", currentUser.uid, "entries"), {
      bottles,
      amount,
      timestamp: timestamp.toISOString()
    });

    bottleInput.value = "";
  });
}

// Live Update
function listenToEntries() {
  const q = query(collection(db, "users", currentUser.uid, "entries"), orderBy("timestamp", "desc"));
  onSnapshot(q, snapshot => {
    entryList.innerHTML = "";
    let totalEntries = 0, totalBottles = 0, totalAmount = 0;

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const id = docSnap.id;
      const date = new Date(data.timestamp);

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}<br>${date.toLocaleDateString()}</td>
        <td><input type="number" value="${data.bottles}" data-id="${id}" class="edit-bottles" min="1" /></td>
        <td>₹${data.amount}<br><span style="font-size:0.8rem;">@ ₹25/bottle</span></td>
        <td>completed</td>
        <td>
          <button class="edit-btn" style="cursor:default;" disabled>✎</button>
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

// Edit
entryList.addEventListener("change", async e => {
  if (e.target.classList.contains("edit-bottles")) {
    const id = e.target.dataset.id;
    const newBottles = parseInt(e.target.value);
    if (newBottles > 0) {
      await updateDoc(doc(db, "users", currentUser.uid, "entries", id), {
        bottles: newBottles,
        amount: newBottles * 25
      });
    }
  }
});

// Delete
entryList.addEventListener("click", async e => {
  if (e.target.classList.contains("delete-btn")) {
    const id = e.target.dataset.id;
    await deleteDoc(doc(db, "users", currentUser.uid, "entries", id));
  }
});

// Export Excel
if (exportExcelBtn) {
  exportExcelBtn.addEventListener("click", () => {
    const table = document.querySelector("table").outerHTML;
    const html = `<html><head><meta charset='utf-8'></head><body><h2>Milk Bottle Tracker - ${monthYear}</h2>${table}</body></html>`;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Milk_Tracker_${monthYear}.xls`;
    a.click();
  });
}

// Export PDF
if (exportPdfBtn) {
  exportPdfBtn.addEventListener("click", () => {
    const printWin = window.open('', '', 'width=800,height=600');
    printWin.document.write(`<html><head><title>Milk Bottle Tracker</title></head><body><h2>Milk Bottle Tracker - ${monthYear}</h2>${document.querySelector("table").outerHTML}</body></html>`);
    printWin.document.close();
    printWin.print();
  });
}

// Clear All
if (clearAllBtn) {
  clearAllBtn.addEventListener("click", async () => {
    const entries = await getDocs(collection(db, "users", currentUser.uid, "entries"));
    for (let docSnap of entries.docs) {
      await deleteDoc(doc(db, "users", currentUser.uid, "entries", docSnap.id));
    }
  });
}

// Logout
if (logoutLink) {
  logoutLink.addEventListener("click", () => {
    signOut(auth);
  });
}
