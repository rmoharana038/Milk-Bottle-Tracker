// script.js
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
  query
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import firebaseConfig from "./firebase-config.js";

// Init Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM references
const bottleInput = document.getElementById("bottle-count");
const addEntryBtn = document.getElementById("add-entry");
const entryList = document.getElementById("entry-list");
const logoutBtn = document.getElementById("logout-btn");
const userNameDisplay = document.getElementById("user-name");
const currentMonthSpan = document.getElementById("current-month");
const totalEntriesSpan = document.getElementById("total-entries");
const totalBottlesSpan = document.getElementById("total-bottles");
const totalAmountSpan = document.getElementById("total-amount");

let currentUser = null;

// Show current month
const now = new Date();
const monthYear = now.toLocaleString('default', { month: 'long', year: 'numeric' });
currentMonthSpan.textContent = monthYear;

// Auth state
onAuthStateChanged(auth, user => {
  if (user) {
    currentUser = user;
    userNameDisplay.textContent = user.displayName || user.email;
    listenToEntries();
  } else {
    window.location.href = "login.html";
  }
});

// Add entry
addEntryBtn.addEventListener("click", async () => {
  const bottles = parseInt(bottleInput.value);
  if (!bottles || bottles < 1) return alert("Enter a valid bottle count");

  const date = new Date();
  const payload = {
    bottles,
    amount: bottles * 25,
    timestamp: date.toISOString()
  };

  await addDoc(collection(db, "users", currentUser.uid, "entries"), payload);
  bottleInput.value = "";
});

// Load entries
function listenToEntries() {
  const entriesRef = collection(db, "users", currentUser.uid, "entries");
  const q = query(entriesRef);
  onSnapshot(q, snapshot => {
    entryList.innerHTML = "";
    let totalEntries = 0, totalBottles = 0, totalAmount = 0;

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const dateObj = new Date(data.timestamp);
      const row = document.createElement("tr");

      const date = dateObj.toLocaleDateString();
      const time = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      row.innerHTML = `
        <td>${date}</td>
        <td>${time}</td>
        <td><input type="number" value="${data.bottles}" min="1" data-id="${docSnap.id}" class="edit-bottles" /></td>
        <td>₹${data.amount}</td>
        <td><button class="delete-btn" data-id="${docSnap.id}">Delete</button></td>
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

// Delete entry
entryList.addEventListener("click", async e => {
  if (e.target.classList.contains("delete-btn")) {
    const id = e.target.dataset.id;
    await deleteDoc(doc(db, "users", currentUser.uid, "entries", id));
  }
});

// Edit bottles inline
entryList.addEventListener("change", async e => {
  if (e.target.classList.contains("edit-bottles")) {
    const id = e.target.dataset.id;
    const newBottles = parseInt(e.target.value);
    const newAmount = newBottles * 25;
    await updateDoc(doc(db, "users", currentUser.uid, "entries", id), {
      bottles: newBottles,
      amount: newAmount
    });
  }
});

// Logout
logoutBtn.addEventListener("click", () => {
  signOut(auth);
});

// Clear all
document.getElementById("clear-all").addEventListener("click", async () => {
  const entries = await getDocs(collection(db, "users", currentUser.uid, "entries"));
  for (let docSnap of entries.docs) {
    await deleteDoc(doc(db, "users", currentUser.uid, "entries", docSnap.id));
  }
});

// Export to Excel
document.getElementById("export-excel").addEventListener("click", () => {
  const table = document.querySelector("table").outerHTML;
  const html = `
    <html><head><meta charset='utf-8'></head><body>
    <h2>Milk Bottle Tracker - ${monthYear}</h2>${table}</body></html>`;
  const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Milk_Tracker_${monthYear}.xls`;
  a.click();
});

// Export to PDF (print view)
document.getElementById("export-pdf").addEventListener("click", () => {
  const printWin = window.open('', '', 'width=800,height=600');
  printWin.document.write(`
    <html><head><title>Milk Bottle Tracker</title></head><body>
    <h2>Milk Bottle Tracker - ${monthYear}</h2>
    ${document.querySelector("table").outerHTML}
    </body></html>`);
  printWin.document.close();
  printWin.print();
});
