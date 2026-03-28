// Inject overlay if locked
browser.runtime.sendMessage({ action: "getLockStatus" }).then((status) => {
  if (status.isLocked) {
    const checkUrl = window.location.href.split('?')[0];
    const targetUrl = status.currentProblemUrl.split('?')[0];

    // If we are on the target problem page, show the "Mark as Solved" overlay
    if (checkUrl.includes(targetUrl) || targetUrl.includes(checkUrl)) {
      const overlay = document.createElement("div");
      overlay.id = "solve-or-suffer-overlay";
      
      const btn = document.createElement("button");
      btn.innerText = "I Solved It! (Unlock Browser)";
      btn.id = "solve-or-suffer-btn";
      
      btn.addEventListener("click", () => {
        browser.runtime.sendMessage({ action: "markSolved" }).then(() => {
          overlay.remove();
          alert("Browser Unlocked! Great job solving the problem.");
        });
      });

      overlay.appendChild(btn);
      document.body.appendChild(overlay);
    }
  }
});
