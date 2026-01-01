const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const homePage = document.getElementById("homePage");
const loginFormElement = document.getElementById("loginFormElement");
const signupFormElement = document.getElementById("signupFormElement");
const showSignupLink = document.getElementById("showSignup");
const showLoginLink = document.getElementById("showLogin");
const googleLoginBtn = document.getElementById("googleLogin");
const logoutBtn = document.getElementById("logoutBtn");
const userNameSpan = document.getElementById("userName");
const loginErrorDiv = document.getElementById("loginError");
const signupErrorDiv = document.getElementById("signupError");

const switchToSignup = function () {
  signupForm.classList.add("active");
  loginForm.classList.remove("active");
  loginErrorDiv.textContent = "";
  signupErrorDiv.textContent = "";
};

const switchToLogin = function () {
  signupForm.classList.remove("active");
  loginForm.classList.add("active");
  signupErrorDiv.textContent = "";
  loginErrorDiv.textContent = "";
};

const showHomePage = function (user) {
  loginForm.classList.remove("active");
  signupForm.classList.remove("active");
  homePage.classList.remove("hidden");
  userNameSpan.textContent = user.username || user.email;
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

logoutBtn.addEventListener("click", async (e) => {
  try {
    const response = await fetch("/api/v1/auth/logout", {
      method: "POST",
      credentials: "include",
    });

    if (response.ok) {
      switchToLogin();
      homePage.classList.add("hidden");
    }
  } catch (err) {
    console.log("logout error:", err);
  }
});

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
