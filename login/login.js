
const API_BASE = "http://localhost:3000/api";

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");
const loginButton = document.getElementById("loginButton");
const loginMessage = document.getElementById("loginMessage");

window.addEventListener("pageshow", async function () {
    try {
        const response = await fetch(
            `${API_BASE}/auth/me`,
            {
                credentials: "include",
                cache: "no-store"
            }
        );

      if (response.ok) {
    window.location.replace("../index.html");
} else {
    console.log("No active session; login page can remain open.");
}
    } catch (error) {
        console.error("Session check failed:", error);
    }
});




// Show or hide the password
togglePassword.addEventListener("click", () => {
    const isPasswordHidden = passwordInput.type === "password";

    passwordInput.type = isPasswordHidden ? "text" : "password";
    togglePassword.textContent = isPasswordHidden ? "Hide" : "Show";

    togglePassword.setAttribute(
        "aria-label",
        isPasswordHidden ? "Hide password" : "Show password"
    );
});

// Submit login credentials
loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    loginMessage.textContent = "";
    loginButton.disabled = true;
    loginButton.textContent = "Signing in...";

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            loginMessage.textContent =
                data.message || "Login failed. Please try again.";
            return;
        }

        // Confirm the session is valid before redirecting
        const sessionResponse = await fetch(`${API_BASE}/auth/me`, {
            credentials: "include"
        });

        if (!sessionResponse.ok) {
            loginMessage.textContent =
                "Login succeeded, but session verification failed.";
            return;
        }

       window.location.replace("../index.html");
    } catch (error) {
        loginMessage.textContent =
            "Unable to connect to StockFlow. Check that the backend is running.";
        console.error("Login request failed:", error);
    } finally {
        loginButton.disabled = false;
        loginButton.textContent = "Sign in";
    }
});
