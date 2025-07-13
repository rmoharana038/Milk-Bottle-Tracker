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
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import firebaseConfig from "./firebase-config.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const bottleInput = document.getElementById("bottle-count");
const addEntryBtn = document.getElementById("add-entry");
const entryList = document.getElementById("entry-list");
const userNameDisplay = document.getElementById("user-name");
const currentMonthSpan = document.getElementById("current-month");
const totalEntriesSpan = document.getElementById("total-entries");
const totalBottlesSpan = document.getElementById("total-bottles");
const totalAmountSpan = document.getElementById("total-amount");
const exportExcelBtn = document.getElementById("export-excel");
const exportPdfBtn = document.getElementById("export-pdf");
const clearAllBtn = document.getElementById("clear-all");
const logoutLink = document.getElementById("logout-link");

// Show month
const now = new Date();
const monthYear = now.toLocaleString('default', { month: 'long', year: 'numeric' });
currentMonthSpan.textContent = monthYear;

let currentUser = null;

// Auth State
onAuthStateChanged(auth, user => {
  if (user) {
    currentUser = user;
    userNameDisplay.textContent = user.displayName || user.email;
    listenToEntries();
  } else {
    window.location.href = "login.html";
  }
});

// Add Entry
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

// Listen to Entries
function listenToEntries() {
  const entriesRef = collection(db, "users", currentUser.uid, "entries");
  const q = query(entriesRef, orderBy("timestamp", "asc"));

  onSnapshot(q, snapshot => {
    entryList.innerHTML = "";
    let totalEntries = 0, totalBottles = 0, totalAmount = 0;
    const chartData = {};

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const dateObj = new Date(data.timestamp);
      const row = document.createElement("tr");

      const date = dateObj.toLocaleDateString();
      const time = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Group chart data
      const dateKey = dateObj.toLocaleDateString();
      chartData[dateKey] = (chartData[dateKey] || 0) + data.bottles;

      row.innerHTML = `
        <td>${date}</td>
        <td>${time}</td>
        <td><input type="number" value="${data.bottles}" min="1" data-id="${docSnap.id}" class="edit-bottles" /></td>
        <td>₹${data.amount}</td>
        <td><button class="delete-btn" data-id="${docSnap.id}">🗑️</button></td>
      `;
      entryList.appendChild(row);

      totalEntries++;
      totalBottles += data.bottles;
      totalAmount += data.amount;
    });

    totalEntriesSpan.textContent = totalEntries;
    totalBottlesSpan.textContent = totalBottles;
    totalAmountSpan.textContent = totalAmount;

    updateChart(chartData);
  });
}

// Update Chart
let chartInstance;
function updateChart(dataMap) {
  if (!document.getElementById("analyticsChart")) return;

  const labels = Object.keys(dataMap);
  const data = Object.values(dataMap);

  const ctx = document.getElementById("analyticsChart").getContext("2d");
  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Bottles Used",
        data,
        borderColor: "#2196f3",
        backgroundColor: "rgba(33,150,243,0.1)",
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0 }
        }
      }
    }
  });
}

// Delete Entry
entryList.addEventListener("click", async e => {
  if (e.target.classList.contains("delete-btn")) {
    const id = e.target.dataset.id;
    await deleteDoc(doc(db, "users", currentUser.uid, "entries", id));
  }
});

// Edit Bottles
entryList.addEventListener("change", async e => {
  if (e.target.classList.contains("edit-bottles")) {
    const id = e.target.dataset.id;
    const newBottles = parseInt(e.target.value);
    if (isNaN(newBottles) || newBottles < 1) return;
    await updateDoc(doc(db, "users", currentUser.uid, "entries", id), {
      bottles: newBottles,
      amount: newBottles * 25
    });
  }
});

// Logout
logoutLink?.addEventListener("click", () => signOut(auth));

// Clear All
clearAllBtn?.addEventListener("click", async () => {
  const entries = await getDocs(collection(db, "users", currentUser.uid, "entries"));
  for (let docSnap of entries.docs) {
    await deleteDoc(doc(db, "users", currentUser.uid, "entries", docSnap.id));
  }
});

// Export to Excel
exportExcelBtn?.addEventListener("click", () => {
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

// Export to PDF
exportPdfBtn?.addEventListener("click", () => {
  const printWin = window.open('', '', 'width=800,height=600');
  printWin.document.write(`
    <html><head><title>Milk Bottle Tracker</title></head><body>
    <h2>Milk Bottle Tracker - ${monthYear}</h2>
    ${document.querySelector("table").outerHTML}
    </body></html>`);
  printWin.document.close();
  printWin.print();
});
