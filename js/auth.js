document.addEventListener("DOMContentLoaded", function () {

    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");

    if (loginForm) {
        loginForm.addEventListener("submit", function (e) {
            e.preventDefault();

            const email = document.getElementById("loginEmail").value.trim();
            const password = document.getElementById("loginPassword").value.trim();
            const error = document.getElementById("loginError");

            error.textContent = "";

            if (!email || !password) {
                error.textContent = "All fields are required.";
                return;
            }

            // mock successful login
            window.location.href = "dashboard.html";
        });
    }

    if (registerForm) {
        registerForm.addEventListener("submit", function (e) {
            e.preventDefault();

            const email = document.getElementById("registerEmail").value.trim();
            const password = document.getElementById("registerPassword").value.trim();
            const error = document.getElementById("registerError");

            error.textContent = "";

            if (!email || !password) {
                error.textContent = "All fields are required.";
                return;
            }

            alert("Registration successful (mock)");
            window.location.href = "index.html";
        });
    }

});
