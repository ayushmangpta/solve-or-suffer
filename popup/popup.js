document.addEventListener("DOMContentLoaded", async () => {
  const bgData = await browser.runtime.sendMessage({ action: "getLockStatus" });
  if (bgData.isLocked) {
    document.getElementById("mainUI").classList.add("hidden");
    document.getElementById("lockScreen").classList.remove("hidden");
    document.getElementById("problemLink").href = bgData.currentProblemUrl;
  } else {
    loadCollections();
  }

  // Tabs
  document.getElementById("tabCollections").addEventListener("click", () => switchTab("collectionsView"));
  document.getElementById("tabUpload").addEventListener("click", () => {
    // Firefox closes popups when file choosers open. 
    // To fix this, we open the extension page in a full tab to handle uploads.
    if (!window.location.search.includes("tab=true")) {
      const url = browser.runtime.getURL("popup/popup.html?tab=true#upload");
      browser.tabs.create({ url });
      window.close();
    } else {
      switchTab("uploadView");
    }
  });

  // If we opened this as a tab for uploading, show that view immediately
  if (window.location.hash === "#upload") {
    switchTab("uploadView");
  }

  // Mark solved from popup
  document.getElementById("markPopupSolvedBtn").addEventListener("click", async () => {
    await browser.runtime.sendMessage({ action: "markSolved" });
    window.close();
  });

  // CSV Upload
  document.getElementById("uploadBtn").addEventListener("click", handleCSVUpload);

  // Add generic collection
  document.getElementById("addCollectionBtn").addEventListener("click", async () => {
    const name = prompt("Collection Name:");
    if (!name) return;
    await addCollection({ id: Date.now().toString(), name, problems: [] });
    loadCollections();
  });

  // Force lock right now for testing
  const forceLockBtn = document.getElementById("forceLockBtn");
  if (forceLockBtn) {
    forceLockBtn.addEventListener("click", async () => {
      await browser.runtime.sendMessage({ action: "forceLock" });
      window.close(); // close popup/tab
    });
  }
});

function switchTab(tabId) {
  document.getElementById("collectionsView").classList.add("hidden");
  document.getElementById("uploadView").classList.add("hidden");
  document.getElementById(tabId).classList.remove("hidden");
  
  document.getElementById("tabCollections").classList.toggle("active", tabId === "collectionsView");
  document.getElementById("tabUpload").classList.toggle("active", tabId === "uploadView");
}

async function loadCollections() {
  const data = await browser.storage.local.get("collections");
  const collections = data.collections || [];
  const list = document.getElementById("collectionsList");
  list.innerHTML = "";

  collections.forEach(col => {
    const div = document.createElement("div");
    div.className = "collection-item";
    div.innerHTML = `
      <strong>${col.name}</strong> (${col.problems.length} problems)
      <button class="add-prob-btn" data-id="${col.id}">Add</button>
      <button class="del-col-btn" data-id="${col.id}">X</button>
      <div class="problems-list"></div>
    `;

    const probList = div.querySelector(".problems-list");
    col.problems.forEach((p, idx) => {
      const pDiv = document.createElement("div");
      pDiv.className = "problem-item";
      pDiv.innerHTML = `
        <a href="${p.link}" target="_blank">${p.name}</a>
        <button class="del-prob-btn" data-col="${col.id}" data-idx="${idx}">x</button>
      `;
      probList.appendChild(pDiv);
    });

    list.appendChild(div);
  });

  // Attach events
  document.querySelectorAll(".del-col-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      if(confirm("Delete collection?")) {
        await deleteCollection(e.target.dataset.id);
        loadCollections();
      }
    });
  });

  document.querySelectorAll(".add-prob-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const name = prompt("Problem Name:");
      const link = prompt("LeetCode Link:");
      if (name && link) {
        await addProblem(e.target.dataset.id, { name, link });
        loadCollections();
      }
    });
  });

  document.querySelectorAll(".del-prob-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      await deleteProblem(e.target.dataset.col, parseInt(e.target.dataset.idx));
      loadCollections();
    });
  });
}

function handleCSVUpload() {
  const nameInput = document.getElementById("csvCollectionName").value.trim();
  const fileInput = document.getElementById("csvFileInput").files[0];
  const status = document.getElementById("uploadStatus");

  if (!nameInput || !fileInput) {
    status.innerText = "Please provide name and file.";
    return;
  }

  const reader = new FileReader();
  reader.onload = async (e) => {
    const text = e.target.result;
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const problems = [];
    
    // Parse extremely basic CSV (name, link)
    for (const line of lines) {
      const parts = line.split(',');
      if (parts.length >= 2) {
        const name = parts[0].trim().replace(/^["']|["']$/g, '');
        let link = parts[1].trim().replace(/^["']|["']$/g, '');
        
        // Clean up any trailing commas or garbage that might be at the end of the line
        link = link.replace(/,+$/, '').trim();

        problems.push({ name, link });
      }
    }

    if (problems.length > 0) {
      await addCollection({ id: Date.now().toString(), name: nameInput, problems });
      status.innerText = "Upload successful!";
      document.getElementById("csvCollectionName").value = "";
      document.getElementById("csvFileInput").value = "";
      loadCollections();
      switchTab("collectionsView"); // Switch back to see the new collection
    } else {
      status.innerText = "Invalid CSV format. Need: name,link";
    }
  };
  reader.readAsText(fileInput);
}

// Storage helpers
async function addCollection(collection) {
  const data = await browser.storage.local.get("collections");
  const collections = data.collections || [];
  collections.push(collection);
  await browser.storage.local.set({ collections });
}

async function deleteCollection(id) {
  const data = await browser.storage.local.get("collections");
  let collections = data.collections || [];
  collections = collections.filter(c => c.id !== id);
  await browser.storage.local.set({ collections });
}

async function addProblem(colId, problem) {
  const data = await browser.storage.local.get("collections");
  const collections = data.collections || [];
  const col = collections.find(c => c.id === colId);
  if (col) {
    col.problems.push(problem);
    await browser.storage.local.set({ collections });
  }
}

async function deleteProblem(colId, probIdx) {
  const data = await browser.storage.local.get("collections");
  const collections = data.collections || [];
  const col = collections.find(c => c.id === colId);
  if (col) {
    col.problems.splice(probIdx, 1);
    await browser.storage.local.set({ collections });
  }
}
