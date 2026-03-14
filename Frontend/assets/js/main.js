// assets/js/main.js
document.addEventListener("DOMContentLoaded", function () {
  // --- Mobile Sidebar Logic ---
  const menuBtn = document.getElementById("menu-btn");
  const mobileMenu = document.getElementById("mobile-menu");
  const closeBtn = document.getElementById("close-btn");
  const overlay = document.getElementById("overlay");

  if (menuBtn && mobileMenu && closeBtn && overlay) {
    function openMenu() {
      mobileMenu.classList.remove("-translate-x-full");
    }

    function closeMenu() {
      mobileMenu.classList.add("-translate-x-full");
    }

    menuBtn.addEventListener("click", openMenu);
    closeBtn.addEventListener("click", closeMenu);
    overlay.addEventListener("click", closeMenu);
  }

  // --- Upload Page Logic ---
  const dropZone = document.getElementById("drop-zone");
  const fileInput = document.getElementById("file-input");
  const fileNameDisplay = document.getElementById("file-name");
  const textInput = document.getElementById("text-input");
  const analyzeBtn = document.getElementById("analyze-btn");



  // Trigger backend analysis and then go to analysis page
  if (analyzeBtn) {
    analyzeBtn.addEventListener("click", async () => {
      const file = fileInput && fileInput.files && fileInput.files[0];
      const text = textInput ? textInput.value.trim() : "";

      if (!file && !text) {
        alert("Please upload a document or paste text to analyze.");
        return;
      }

      try {
        let response;
        if (file) {
          const formData = new FormData();
          formData.append("file", file);
          const authToken = localStorage.getItem('token');
          response = await fetch("/upload", {
            method: "POST",
            headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {},
            body: formData,
          });
        } else {
          const authToken2 = localStorage.getItem('token');
          response = await fetch("/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(authToken2 ? { 'Authorization': `Bearer ${authToken2}` } : {}) },
            body: JSON.stringify({ text }),
          });
        }

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          console.error("Analysis error:", data);
          if (response.status === 403) {
            alert("Your session has expired. Redirecting to login...");
            if (typeof window.logout === 'function') window.logout();
            else {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              window.location.href = 'login.html';
            }
            return;
          }
          const msg = data.error || "Analysis failed.";
          alert(`${msg} (Status: ${response.status})`);
          return;
        }

        localStorage.setItem("jurisgenieAnalysis", JSON.stringify(data.analysis || data));
        window.location.href = "analysis.html";
      } catch (err) {
        console.error("Error calling analysis API:", err);
        alert("Network Error: Could not connect to the service. Please ensure the server is running on port 8000.");
      }
    });
  }

  // --- Interactive Analysis Logic (Analysis Page) ---
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");
  const chatWindow = document.getElementById("chat-window");

  if (chatForm && chatInput && chatWindow) {
    chatForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const message = chatInput.value.trim();
      if (!message) return;

      // Include analyzed document context if available
      let context = "";
      try {
        const stored = localStorage.getItem("jurisgenieAnalysis");
        if (stored) {
          const parsed = JSON.parse(stored);
          context = parsed.simplified_text || "";
        }
      } catch {
        context = "";
      }

      // User bubble
      chatWindow.innerHTML += `<div class="text-right text-indigo-600 mb-2">${message}</div>`;
      chatInput.value = "";

      try {
        console.log("Sending message:", message);
        console.log("Sending message:", message);
        const authToken = localStorage.getItem('token');
        const response = await fetch("/query", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}) },
          body: JSON.stringify({ query: message })
        });

        const data = await response.json();
        console.log("Received response:", data);

        // Gracefully handle backend errors or unexpected shapes
        if (!response.ok || !data) {
          const errorText =
            (data && data.error) ||
            "Intelligence service is currently unavailable. Please try again later.";
          chatWindow.innerHTML += `<div class="text-left text-red-500 mb-4">${errorText}</div>`;
        } else {
          // Backend returns { answer, sources, cached }
          const answerText = data.answer || data.reply || "No response";
          chatWindow.innerHTML += `<div class="text-left text-gray-700 mb-4">${answerText}</div>`;
        }
        chatWindow.scrollTop = chatWindow.scrollHeight;
      } catch (error) {
        console.error("Fetch error:", error);
        chatWindow.innerHTML += `<div class="text-left text-red-500 mb-4">Error: Unable to fetch response.</div>`;
      }
    });
  }
});
