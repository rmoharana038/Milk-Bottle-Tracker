// script.js - Milk Bottle Tracker with PDF & Styled XLSX Export

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

// 🧾 Export XLSX (Styled with logo & 🥛 header)
exportExcelBtn?.addEventListener("click", () => {
  const date = new Date().toLocaleString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  const header = ["🥛 Milk Bottle Tracker — Monthly Report"];
  const generated = [`Generated: ${date}`];
  const summary = [`Total Bottles: ${totalBottlesSpan.textContent}`, `Total Amount: ₹${totalAmountSpan.textContent}`];

  const tableHeaders = ["Date & Time", "Bottles", "Amount", "Status"];
  const dataRows = [];

  document.querySelectorAll("#entry-list tr").forEach(tr => {
    const tds = tr.querySelectorAll("td");
    if (tds.length >= 4) {
      const date = tds[0].innerText.trim();
      const bottles = tds[1].querySelector("input")?.value || "";
      const amount = tds[2].innerText.split("\n")[0];
      const status = tds[3].innerText.trim();
      dataRows.push([date, bottles, amount, status]);
    }
  });

  const allData = [
    header, [], generated, [], summary, [], tableHeaders, ...dataRows
  ];

  const ws = XLSX.utils.aoa_to_sheet(allData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Monthly Report");

  // Style header
  const headerStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" }, sz: 14 },
    fill: { fgColor: { rgb: "4CAF50" } },
    alignment: { horizontal: "center" }
  };

  ["A7", "B7", "C7", "D7"].forEach(cell => {
    if (ws[cell]) ws[cell].s = headerStyle;
  });

  // Border all data
  const borderStyle = { style: "thin", color: { rgb: "CCCCCC" } };
  const range = XLSX.utils.decode_range(ws["!ref"]);
  for (let R = 0; R <= range.e.r; R++) {
    for (let C = 0; C <= 3; C++) {
      const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
      if (!cell) continue;
      cell.s = cell.s || {};
      cell.s.border = {
        top: borderStyle, bottom: borderStyle,
        left: borderStyle, right: borderStyle
      };
    }
  }

  ws["!cols"] = [{ wch: 28 }, { wch: 10 }, { wch: 15 }, { wch: 12 }];
  XLSX.writeFile(wb, "Milk_Bottle_Tracker_Report.xlsx");
});

// 🖨️ PDF Export
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

  const table = document.querySelector("table")?.cloneNode(true);
  if (table) {
    table.querySelectorAll("th:last-child, td:last-child").forEach(el => el.remove());
  }

  const summary = `
    <p><strong>Total Bottles:</strong> ${totalBottlesSpan.textContent} |
       <strong>Total Amount:</strong> ₹${totalAmountSpan.textContent}</p>
  `;

  const win = window.open("", "", "width=900,height=700");
  win.document.write(`
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
        <h2>🥛 Milk Bottle Tracker — Monthly Report</h2>
        <p><strong>Generated:</strong> ${formattedDate}</p>
        ${summary}
        ${table?.outerHTML || ""}
      </body>
    </html>
  `);
  win.document.close();
  win.print();
});

window.addEventListener("online", () => {
  if (currentUser && localDB) checkPendingSync();
});
