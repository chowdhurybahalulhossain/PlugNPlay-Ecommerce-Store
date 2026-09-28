const authTitle = document.getElementById('authTitle');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const messageBox = document.getElementById('authMessage');
const switchText = document.getElementById('switchText');
const switchBtn = document.getElementById('switchBtn');

let mode = 'login';

const showMessage = (text, type) => {
    messageBox.textContent = text;
    messageBox.className = `auth-message ${type}`;
};

const setMode = (newMode) => {
    mode = newMode;
    const isLogin = mode === 'login';
    authTitle.textContent = isLogin ? 'Sign in' : 'Create account';
    loginForm.classList.toggle('hidden', !isLogin);
    signupForm.classList.toggle('hidden', isLogin);
    switchText.textContent = isLogin ? 'New here?' : 'Already have an account?';
    switchBtn.textContent = isLogin ? 'Create an account' : 'Sign in';
    messageBox.className = 'auth-message';
};

switchBtn.addEventListener('click', () => setMode(mode === 'login' ? 'signup' : 'login'));

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const button = e.submitter;
    button.disabled = true;
    try {
        const data = await apiRequest('/auth/login', 'POST', {
            email: document.getElementById('loginEmail').value,
            password: document.getElementById('loginPassword').value
        });
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        showToast('Signed in');
        setTimeout(() => { window.location.href = 'index.html'; }, 600);
    } catch (err) {
        showMessage(err.message, 'error');
        button.disabled = false;
    }
});

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const button = e.submitter;
    button.disabled = true;
    try {
        await apiRequest('/auth/signup', 'POST', {
            name: document.getElementById('signupName').value,
            email: document.getElementById('signupEmail').value,
            password: document.getElementById('signupPassword').value
        });
        setMode('login');
        showMessage('Account created. Sign in to continue.', 'success');
    } catch (err) {
        showMessage(err.message, 'error');
    } finally {
        button.disabled = false;
    }
});