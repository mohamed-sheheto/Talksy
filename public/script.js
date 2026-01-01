const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const chatApp = document.getElementById("chatApp");
const authContainer = document.querySelector(".container");
const loginFormElement = document.getElementById("loginFormElement");
const signupFormElement = document.getElementById("signupFormElement");
const showSignupLink = document.getElementById("showSignup");
const showLoginLink = document.getElementById("showLogin");
const googleLoginBtn = document.getElementById("googleLogin");
const logoutBtn = document.getElementById("logoutBtn");
const userNameSpan = document.getElementById("userName");
const loginErrorDiv = document.getElementById("loginError");
const signupErrorDiv = document.getElementById("signupError");
const roomsList = document.getElementById("roomsList");
const messagesList = document.getElementById("messagesList");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const typingIndicator = document.getElementById("typingIndicator");
const membersList = document.getElementById("membersList");

const switchToSignup = function () {
  signupForm.classList.add("active");
  loginForm.classList.remove("active");
  loginErrorDiv.textContent = "";
  signupErrorDiv.textContent = "";
  if (authContainer) authContainer.classList.remove("hidden");
};

const switchToLogin = function () {
  signupForm.classList.remove("active");
  loginForm.classList.add("active");
  signupErrorDiv.textContent = "";
  loginErrorDiv.textContent = "";
  if (authContainer) authContainer.classList.remove("hidden");
};

let currentRoom = "General";
let currentUser = null;

const showHomePage = function (user) {
  loginForm.classList.remove("active");
  signupForm.classList.remove("active");
  if (chatApp) chatApp.classList.remove("hidden");
  if (authContainer) authContainer.classList.add("hidden");
  currentUser = user;
  userNameSpan.textContent = user.username || user.email;
  initChat(user);
};

const initChat = function (user) {
  // Initialize chat UI handlers (UI-only; no Socket.io logic)

  // Form submit -> render locally
  if (messageForm) {
    messageForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const content = messageInput.value.trim();
      if (!content) return;

      const message = {
        room: currentRoom,
        content,
        sender: user.username || user.email,
        timestamp: new Date().toISOString(),
      };

      renderMessage(message, true);
      messageInput.value = "";
      messageInput.focus();

      // emit via socket if available
      try {
        if (typeof socket !== "undefined" && socket.connected) {
          socket.emit("send-message", message);
        }
      } catch (err) {
        console.warn("Socket emit error:", err);
      }
    });
  }

  // Room click handling (basic, UI-only)
  if (roomsList) {
    roomsList.addEventListener("click", (e) => {
      const li = e.target.closest(".room");
      if (!li) return;
      const room = li.dataset.room;
      if (!room || room === currentRoom) return;
      roomsList
        .querySelectorAll(".room")
        .forEach((r) => r.classList.remove("active"));
      li.classList.add("active");
      currentRoom = room;
      const roomTitle = document.getElementById("roomTitle");
      if (roomTitle) roomTitle.textContent = `# ${room}`;
      if (messagesList) messagesList.innerHTML = "";
      addSystemMessage(`Joined ${room}`);

      // tell server about join
      try {
        if (typeof socket !== "undefined" && socket.connected) {
          socket.emit("join-room", { room });
        }
      } catch (err) {
        console.warn("Socket join error:", err);
      }
    });
  }

  // Socket listeners (if socket exists)
  try {
    if (typeof socket !== "undefined") {
      socket.on("new-message", (msg) => {
        // avoid double-rendering local echoes
        renderMessage(msg, false);
      });

      socket.on("user-typing", (data) => {
        if (!typingIndicator) return;
        typingIndicator.textContent = `${data.user} is typing...`;
        clearTimeout(window._typingTimeout);
        window._typingTimeout = setTimeout(() => {
          typingIndicator.textContent = "";
        }, 1200);
      });
    }
  } catch (err) {
    console.warn("Socket listeners setup failed:", err);
  }

  // Typing emitter (debounced)
  if (messageInput) {
    let typingDebounce;
    messageInput.addEventListener("input", () => {
      try {
        if (typeof socket !== "undefined" && socket.connected) {
          socket.emit("typing", {
            user: user.username || user.email,
            room: currentRoom,
          });
        }
      } catch (e) {}
      clearTimeout(typingDebounce);
      typingDebounce = setTimeout(() => {
        try {
          if (typeof socket !== "undefined" && socket.connected) {
            socket.emit("stop-typing", {
              user: user.username || user.email,
              room: currentRoom,
            });
          }
        } catch (e) {}
      }, 900);
    });
  }
};

showSignupLink.addEventListener("click", (e) => {
  e.preventDefault();
  switchToSignup();
});

showLoginLink.addEventListener("click", (e) => {
  e.preventDefault();
  switchToLogin();
});

loginFormElement.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = "Logging in...";

  try {
    const response = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });

    const data = await response.json();

    if (response.ok) showHomePage(data.user);
    else {
      loginErrorDiv.textContent = data.message || "Login Failed";
    }
  } catch (err) {
    loginErrorDiv.textContent = "Network error. Please try again.";
    console.error("Login error:", err);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
});

signupFormElement.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("signupUsername").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value;

  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = "Signing up...";

  try {
    const response = await fetch("/api/v1/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
      credentials: "include",
    });

    const data = await response.json();

    if (response.ok) showHomePage(data.user);
    else {
      signupErrorDiv.textContent = data.message || "Signup Failed";
    }
  } catch (err) {
    signupErrorDiv.textContent = "Network error. Please try again.";
    console.error("Signup error:", err);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
});

googleLoginBtn.addEventListener("click", () => {
  window.location.href = "/api/v1/auth/google";
});

if (logoutBtn) {
  logoutBtn.addEventListener("click", async (e) => {
    try {
      const response = await fetch("/api/v1/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        switchToLogin();
        if (chatApp) chatApp.classList.add("hidden");
        if (authContainer) authContainer.classList.remove("hidden");
      }
    } catch (err) {
      console.log("logout error:", err);
    }
  });
}

const checkAuthStatus = async function () {
  try {
    const response = await fetch("/api/v1/auth/", {
      credentials: "include",
    });
    if (response.ok) {
      const data = await response.json();

      if (data.user) {
        showHomePage(data.user);
        return;
      }
    }
    switchToLogin();
  } catch (err) {
    console.log("Not Authenticated");
    switchToLogin();
  }
};

window.addEventListener("DOMContentLoaded", () => {
  loginForm.classList.remove("active");

  const urlParams = new URLSearchParams(window.location.search);
  const authStatus = urlParams.get("auth");
  const error = urlParams.get("error");

  if (authStatus || error) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  if (authStatus === "success") checkAuthStatus();
  else if (error) {
    loginErrorDiv.textContent = error;
    switchToLogin();
  } else {
    checkAuthStatus();
  }
});

// Helpers for rendering messages
function renderMessage(msg, local = false) {
  if (!messagesList) return;
  const el = document.createElement("div");
  el.className = `message ${local ? "local" : "remote"}`;

  const time = msg.timestamp
    ? new Date(msg.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "";

  el.innerHTML = `
    <div class="message-meta">
      <strong class="message-sender">${escapeHtml(
        msg.sender || "System"
      )}</strong>
      <span class="message-time">${time}</span>
    </div>
    <div class="message-body">${escapeHtml(msg.content)}</div>
  `;

  messagesList.appendChild(el);
  scrollToBottom();
}

function addSystemMessage(text) {
  renderMessage({
    sender: "System",
    content: text,
    timestamp: new Date().toISOString(),
  });
}

function scrollToBottom() {
  if (!messagesList) return;
  messagesList.scrollTop = messagesList.scrollHeight;
}

function escapeHtml(unsafe) {
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
