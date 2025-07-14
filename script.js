// script.js - Milk Bottle Tracker with Enhanced PDF/XLSX Export & IndexedDB Sync

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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

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
    for (const item of getAll.result) {
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
  const q = query(collection(db, "users", currentUser.uid, "entries"), orderBy("timestamp", "desc"));
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

logoutBtn?.addEventListener("click", () => signOut(auth));

// 🟢 Export as XLSX using SheetJS
exportExcelBtn?.addEventListener("click", () => {
  const rows = [...document.querySelectorAll("#entry-list tr")];
  const ws_data = [["Date", "Bottles", "Amount", "Status"]];
  rows.forEach(row => {
    const cells = row.querySelectorAll("td");
    if (cells.length >= 4) {
      const date = cells[0].innerText;
      const bottles = cells[1].querySelector("input")?.value || "";
      const amount = cells[2].innerText;
      const status = cells[3].innerText;
      ws_data.push([date, bottles, amount, status]);
    }
  });

  const now = new Date();
  const formattedDate = now.toLocaleString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
  });

  const ws = XLSX.utils.aoa_to_sheet([]);
  XLSX.utils.sheet_add_aoa(ws, [["Milk Bottle Tracker Report"]], { origin: "A1" });
  XLSX.utils.sheet_add_aoa(ws, [[`Generated: ${formattedDate}`]], { origin: "A2" });
  XLSX.utils.sheet_add_aoa(ws, [[`Total Bottles: ${totalBottlesSpan.textContent}`, `Total Amount: ₹${totalAmountSpan.textContent}`]], { origin: "A3" });
  XLSX.utils.sheet_add_aoa(ws, [[""]], { origin: "A4" });
  XLSX.utils.sheet_add_aoa(ws, ws_data, { origin: "A5" });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Milk Report");
  XLSX.writeFile(wb, "Milk_Bottle_Tracker_Report.xlsx");
});

// 🟢 Export styled PDF (exclude Actions)
exportPdfBtn?.addEventListener("click", () => {
  const logoURL = "https://rmoharana038.github.io/Milk-Bottle-Tracker/icon.png";
  const now = new Date();
  const formattedDate = now.toLocaleString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
  });

  const allRows = document.querySelectorAll("#entry-list tr");
  let tableRows = "";
  allRows.forEach(row => {
    const cells = row.querySelectorAll("td");
    if (cells.length >= 4) {
      const date = cells[0].innerHTML;
      const bottles = cells[1].querySelector("input")?.value || "";
      const amount = cells[2].innerHTML;
      const status = cells[3].innerText;
      tableRows += `<tr><td>${date}</td><td>${bottles}</td><td>${amount}</td><td>${status}</td></tr>`;
    }
  });

  const html = `
    <html>
      <head>
        <title>Milk Bottle Tracker Report</title>
        <style>
          body { font-family: Arial; padding: 20px; }
          h2 { color: #2c3e50; }
          table { border-collapse: collapse; width: 100%; margin-top: 15px; }
          th, td { border: 1px solid #ccc; padding: 8px; text-align: center; }
          th { background-color: #f0f0f0; }
        </style>
      </head>
      <body>
        <img src="${logoURL}" alt="Logo" style="height: 60px" />
        <h2>Milk Bottle Tracker Report</h2>
        <p><strong>Generated:</strong> ${formattedDate}</p>
        <p><strong>Total Bottles:</strong> ${totalBottlesSpan.textContent} | <strong>Total Amount:</strong> ₹${totalAmountSpan.textContent}</p>
        <table>
          <thead>
            <tr><th>Date</th><th>Bottles</th><th>Amount</th><th>Status</th></tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body>
    </html>
  `;

  const printWin = window.open("", "", "width=900,height=700");
  printWin.document.write(html);
  printWin.document.close();
  printWin.print();
});

// Sync on reconnect
window.addEventListener("online", () => {
  if (currentUser && localDB) checkPendingSync();
});
