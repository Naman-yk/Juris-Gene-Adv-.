// ==========================================
// JurisGenie Auth System
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    const getValue = (id) => document.getElementById(id)?.value?.trim();
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');

    // --- Get redirect param ---
    const urlParams = new URLSearchParams(window.location.search);
    const redirectTo = urlParams.get('redirect') || 'upload.html';

    // --- Update Navbar based on auth state ---
    updateNavbar(token, user);

    // --- Page Protection ---
    const path = window.location.pathname;
    const isAuthPage = path.includes('login.html') || path.includes('signup.html');
    const isProtectedPage = path.includes('upload.html') || path.includes('analysis.html');

    // Redirect to login if trying to access protected pages without token
    if (!token && isProtectedPage) {
        window.location.href = `login.html?redirect=${encodeURIComponent(path.split('/').pop())}`;
        return;
    }

    // Redirect away from auth pages if already logged in
    if (token && isAuthPage) {
        window.location.href = redirectTo;
        return;
    }

    // --- Login Logic ---
    const loginButton = document.getElementById('login-btn');
    if (loginButton) {
        loginButton.addEventListener('click', async (e) => {
            e.preventDefault();
            const email = getValue('email');
            const password = getValue('password');

            if (!email || !password) {
                alert('Please fill in all fields');
                return;
            }

            try {
                const res = await fetch('/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await res.json();
                if (res.ok) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    // Redirect to the page user originally wanted
                    window.location.href = redirectTo;
                } else {
                    alert(data.error || 'Login failed');
                }
            } catch (err) {
                console.error(err);
                alert('An error occurred');
            }
        });
    }

    // --- Signup Logic ---
    const signupButton = document.getElementById('signup-btn');
    if (signupButton) {
        signupButton.addEventListener('click', async (e) => {
            e.preventDefault();
            const name = getValue('signup-name');
            const email = getValue('signup-email');
            const password = getValue('signup-password');
            const confirmPassword = getValue('confirm-password');

            if (!name || !email || !password) {
                alert('Please fill in all fields');
                return;
            }

            if (password !== confirmPassword) {
                alert('Passwords do not match');
                return;
            }

            try {
                const res = await fetch('/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password })
                });

                const data = await res.json();
                if (res.ok) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    // Redirect to the page user originally wanted
                    window.location.href = redirectTo;
                } else {
                    alert(data.error || 'Registration failed');
                }
            } catch (err) {
                console.error(err);
                alert('An error occurred');
            }
        });
    }

    // --- Logout (global) ---
    window.logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    };
});

// --- Navbar Update Function ---
function updateNavbar(token, user) {
    // Find the signup link by ID (added to all pages)
    const signupLink = document.getElementById('nav-signup-link');

    if (signupLink && token && user) {
        // Replace "Sign up" with user name + logout
        const parent = signupLink.parentElement;
        signupLink.remove();

        const userDiv = document.createElement('div');
        userDiv.className = 'hidden md:flex items-center gap-3';
        userDiv.innerHTML = `
            <span class="text-gray-700 font-medium">Hi, ${user.name || 'User'}</span>
            <button onclick="logout()" 
                class="bg-red-500 text-white px-4 py-2 rounded-xl shadow hover:bg-red-600 transition text-sm">
                Logout
            </button>
        `;
        parent.appendChild(userDiv);
    }

    // Forward redirect param through login <-> signup cross-links
    const urlParams = new URLSearchParams(window.location.search);
    const redirect = urlParams.get('redirect');
    if (redirect) {
        const signupRedirect = document.getElementById('signup-redirect-link');
        if (signupRedirect) signupRedirect.href = `signup.html?redirect=${encodeURIComponent(redirect)}`;

        const loginRedirect = document.getElementById('login-redirect-link');
        if (loginRedirect) loginRedirect.href = `login.html?redirect=${encodeURIComponent(redirect)}`;
    }
}

// --- Global Auth Check Function (called from buttons) ---
window.requireAuth = function(arg1, arg2) {
    let targetPage = 'dashboard.html';
    
    // Check if the first argument is an event or a URL string
    if (arg1 && typeof arg1 === 'object' && arg1.preventDefault) {
        // It's an event
        arg1.preventDefault();
        targetPage = arg2 || arg1.currentTarget.href || 'dashboard.html';
    } else if (typeof arg1 === 'string') {
        // It's a direct URL
        targetPage = arg1;
    }

    const token = localStorage.getItem('token');
    if (token) {
        window.location.href = targetPage;
    } else {
        window.location.href = `login.html?redirect=${encodeURIComponent(targetPage)}`;
    }
};
