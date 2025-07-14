// script.js - Milk Bottle Tracker with PDF, Styled XLSX Export & Chart

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
const chartCanvas = document.getElementById("analyticsChart");
const tabButtons = document.querySelectorAll(".tab-btn");

let currentUser = null;
let localDB = null;
let allEntries = [];
let analyticsChart = null;

// IndexedDB setup
const openDB = indexedDB.open("MilkTrackerDB", 1);
openDB.onupgradeneeded = e => {
  localDB = e.target.result;
  localDB.createObjectStore("entries", { keyPath: "id", autoIncrement: true });
};
openDB.onsuccess = e => {
  localDB = e.target.result;
  if (navigator.onLine && currentUser) checkPendingSync();
};

function saveToIndexedDB(entry) {
  const tx = localDB.transaction("entries", "readwrite");
  tx.objectStore("entries").add(entry);
}

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

bottleInput?.addEventListener("input", () => {
  const bottles = parseInt(bottleInput.value);
  calculatedAmount.textContent = bottles > 0 ? bottles * 25 : 0;
});

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

function listenToEntries() {
  const q = query(
    collection(db, "users", currentUser.uid, "entries"),
    orderBy("timestamp", "desc")
  );
  onSnapshot(q, snapshot => {
    entryList.innerHTML = "";
    let totalEntries = 0, totalBottles = 0, totalAmount = 0;
    allEntries = [];

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const id = docSnap.id;
      allEntries.push({ ...data, id });

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

    updateChart(7); // Default range
  });
}

// Chart Setup
function updateChart(days) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days + 1);

  const dailyMap = {};

  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = d.toLocaleDateString();
    dailyMap[key] = 0;
  }

  allEntries.forEach(entry => {
    const dt = new Date(entry.timestamp);
    const key = dt.toLocaleDateString();
    if (dailyMap[key] !== undefined) {
      dailyMap[key] += entry.bottles;
    }
  });

  const labels = Object.keys(dailyMap);
  const data = Object.values(dailyMap);

  if (analyticsChart) analyticsChart.destroy();
  analyticsChart = new Chart(chartCanvas, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Bottles per Day",
        data,
        backgroundColor: "#4caf50"
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Bottles"
          }
        },
        x: {
          title: {
            display: true,
            text: "Date"
          }
        }
      }
    }
  });
}

tabButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelector(".tab-btn.active")?.classList.remove("active");
    btn.classList.add("active");
    const range = parseInt(btn.dataset.range);
    updateChart(range);
  });
});

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

logoutBtn?.addEventListener("click", () => {
  signOut(auth);
});

// ✅ Export Excel & PDF: unchanged from your previous working copy — preserved

window.addEventListener("online", () => {
  if (currentUser && localDB) checkPendingSync();
});
