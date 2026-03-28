let isLocked = false;
let currentProblemUrl = "";

// Initialize storage and alarms
browser.runtime.onInstalled.addListener(() => {
  browser.storage.local.get(["collections", "isLocked", "currentProblemUrl"]).then((data) => {
    if (!data.collections) {
      browser.storage.local.set({ collections: [] });
    }
    if (data.isLocked) {
      isLocked = data.isLocked;
      currentProblemUrl = data.currentProblemUrl;
    }
  });

  // Schedule alarms for twice a day (approx every 12 hours with some randomness)
  scheduleNextLock();
});

function scheduleNextLock() {
  // Random time between 8 and 16 hours
  const delayInMinutes = Math.floor(Math.random() * (16 - 8 + 1) + 8) * 60; 
  browser.alarms.create("triggerLock", { delayInMinutes });
}

browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "triggerLock") {
    triggerLock();
    scheduleNextLock();
  }
});

async function triggerLock() {
  const data = await browser.storage.local.get("collections");
  const collections = data.collections || [];
  
  let allProblems = [];
  collections.forEach(c => allProblems.push(...(c.problems || [])));

  if (allProblems.length === 0) {
    console.log("No problems available to lock.");
    return;
  }

  const randomProblem = allProblems[Math.floor(Math.random() * allProblems.length)];
  isLocked = true;
  currentProblemUrl = randomProblem.link;

  await browser.storage.local.set({ isLocked: true, currentProblemUrl });

  // Redirect current active tab
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  if (tabs.length > 0) {
    browser.tabs.update(tabs[0].id, { url: currentProblemUrl });
  }
}

// Block navigation if locked
function enforceLock(tabId, url) {
  if (!isLocked || !url) return;

  try {
    const targetUrl = new URL(url);
    
    // Let browser internal pages bypass (extensions, new tab page, devtools)
    if (targetUrl.protocol.startsWith("moz") || targetUrl.protocol.startsWith("about")) {
      return;
    }

    if (!targetUrl.hostname.includes("leetcode.com")) {
      browser.tabs.update(tabId, { url: currentProblemUrl });
    }
  } catch (e) {
    // Invalid URL format, ignore
  }
}

browser.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId !== 0) return; // Only block main frame
  enforceLock(details.tabId, details.url);
});

// Prevent opening new tabs to escape
browser.tabs.onCreated.addListener((tab) => {
  if (isLocked && tab.id) {
    browser.tabs.update(tab.id, { url: currentProblemUrl });
  }
});

// Prevent switching to existing background tabs to browse other sites
browser.tabs.onActivated.addListener(async (activeInfo) => {
  if (isLocked) {
    const tab = await browser.tabs.get(activeInfo.tabId);
    enforceLock(tab.id, tab.url);
  }
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (isLocked && changeInfo.url) {
    enforceLock(tabId, changeInfo.url);
  }
});

// Listen for messages from content script or popup
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "markSolved") {
    isLocked = false;
    currentProblemUrl = "";
    browser.storage.local.set({ isLocked: false, currentProblemUrl: "" });
    sendResponse({ success: true });
  } else if (message.action === "getLockStatus") {
    sendResponse({ isLocked, currentProblemUrl });
  } else if (message.action === "forceLock") {
    triggerLock();
    sendResponse({ success: true });
  }
});
