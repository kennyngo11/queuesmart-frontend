// js/auth.js

const API_BASE_URL = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', function() {
    const currentPage = window.location.pathname;
    const isLoggedIn = localStorage.getItem('queuesmartUser');
    
    // Redirect to dashboard if already logged in and on login/register page
    if (isLoggedIn && (currentPage.includes('index.html') || currentPage.includes('register.html') || currentPage === '/')) {
        window.location.href = 'dashboard.html';
    }
});

// Login Form Handler
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const errorElement = document.getElementById('loginError');
        
        // Clear previous errors
        errorElement.textContent = '';
        
        // Show loading state
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Logging in...';
        submitBtn.disabled = true;
        
        try {
            // Call backend API
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Store user session
                localStorage.setItem('queuesmartUser', JSON.stringify({
                    email: data.user.email,
                    name: data.user.name,
                    role: data.user.role,
                    token: data.token,
                    loginTime: new Date().toISOString()
                }));
                
                // Redirect to dashboard
                window.location.href = 'dashboard.html';
            } else {
                errorElement.textContent = data.error || 'Login failed';
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
            
        } catch (error) {
            console.error('Login error:', error);
            errorElement.textContent = 'Unable to connect to server. Please try again.';
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
}

// Register Form Handler
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;
        const errorElement = document.getElementById('registerError');
        
        // Clear previous errors
        errorElement.textContent = '';
        errorElement.style.color = '#ef4444';
        
        // Show loading state
        const submitBtn = registerForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Creating account...';
        submitBtn.disabled = true;
        
        try {
            // Call backend API
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Show success message
                errorElement.style.color = '#10b981';
                errorElement.textContent = 'Account created successfully!';
                
                // Auto-login after registration
                setTimeout(async () => {
                    try {
                        const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ email, password })
                        });
                        
                        const loginData = await loginResponse.json();
                        
                        if (loginData.success) {
                            localStorage.setItem('queuesmartUser', JSON.stringify({
                                email: loginData.user.email,
                                name: loginData.user.name,
                                role: loginData.user.role,
                                token: loginData.token,
                                loginTime: new Date().toISOString()
                            }));
                            
                            window.location.href = 'dashboard.html';
                        }
                    } catch (error) {
                        console.error('Auto-login error:', error);
                        window.location.href = 'index.html';
                    }
                }, 1000);
                
            } else {
                errorElement.textContent = data.error || 'Registration failed';
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
            
        } catch (error) {
            console.error('Registration error:', error);
            errorElement.textContent = 'Unable to connect to server. Please try again.';
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
}

// Logout function (used by dashboard)
async function logout() {
    if (confirm('Are you sure you want to logout?')) {
        const user = JSON.parse(localStorage.getItem('queuesmartUser') || '{}');
        const token = user.token;
        
        try {
            // Call backend logout
            await fetch(`${API_BASE_URL}/auth/logout?token=${token}`);
        } catch (error) {
            console.error('Logout error:', error);
        }
        
        // Clear local storage
        localStorage.removeItem('queuesmartUser');
        window.location.href = 'index.html';
    }
}
