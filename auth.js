// Firebase Configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCbL4blFxndbRs4zJgAKMe6l14QIJjeuDI",
    authDomain: "novavid-23fbd.firebaseapp.com",
    projectId: "novavid-23fbd",
    storageBucket: "novavid-23fbd.firebasestorage.app",
    messagingSenderId: "1075242399672",
    appId: "1:1075242399672:web:ba2f1e489144c18646814d",
    measurementId: "G-GVRYZ3Q469"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const showRegisterBtn = document.getElementById('showRegister');
const showLoginBtn = document.getElementById('showLogin');
const loginFormElement = document.getElementById('loginFormElement');
const registerFormElement = document.getElementById('registerFormElement');
const authMessage = document.getElementById('authMessage');

// Toggle between Login and Register
showRegisterBtn.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.remove('active');
    registerForm.classList.add('active');
    authMessage.style.display = 'none';
});

showLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.classList.remove('active');
    loginForm.classList.add('active');
    authMessage.style.display = 'none';
});

// Show Message Function
function showMessage(message, type) {
    authMessage.textContent = message;
    authMessage.className = `message ${type}`;
    authMessage.style.display = 'block';
    setTimeout(() => {
        authMessage.style.display = 'none';
    }, 5000);
}

// Register Function
registerFormElement.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('registerUsername').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    
    // Validation
    if (username.length < 3) {
        showMessage('Username mestilah 3 karakter atau lebih!', 'error');
        return;
    }
    
    if (password.length < 6) {
        showMessage('Password mestilah 6 karakter atau lebih!', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showMessage('Password tidak sepadan!', 'error');
        return;
    }
    
    try {
        // Create email from username
        const email = `${username.toLowerCase()}@novavid.app`;
        
        // Create user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Check if developer
        const isDeveloper = username.toLowerCase().endsWith('dev');
        
        // Save user data to Firestore
        await setDoc(doc(db, 'users', user.uid), {
            username: username,
            email: email,
            createdAt: new Date().toISOString(),
            profilePicture: 'https://via.placeholder.com/150',
            isDeveloper: isDeveloper,
            lastUsernameChange: null,
            totalPosts: 0,
            totalLikes: 0
        });
        
        // Update login count
        const statsRef = doc(db, 'stats', 'general');
        const statsDoc = await getDoc(statsRef);
        
        if (statsDoc.exists()) {
            const currentCount = statsDoc.data().totalLogins || 0;
            await updateDoc(statsRef, {
                totalLogins: currentCount + 1
            });
        } else {
            await setDoc(statsRef, {
                totalLogins: 1
            });
        }
        
        showMessage('Pendaftaran berjaya! Mengalihkan...', 'success');
        setTimeout(() => {
            window.location.href = 'home.html';
        }, 1500);
        
    } catch (error) {
        console.error('Error:', error);
        if (error.code === 'auth/email-already-in-use') {
            showMessage('Username sudah digunakan!', 'error');
        } else {
            showMessage('Ralat berlaku: ' + error.message, 'error');
        }
    }
});

// Login Function
loginFormElement.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    try {
        // Create email from username
        const email = `${username.toLowerCase()}@novavid.app`;
        
        // Sign in user
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        // Update login count
        const statsRef = doc(db, 'stats', 'general');
        const statsDoc = await getDoc(statsRef);
        
        if (statsDoc.exists()) {
            const currentCount = statsDoc.data().totalLogins || 0;
            await updateDoc(statsRef, {
                totalLogins: currentCount + 1
            });
        } else {
            await setDoc(statsRef, {
                totalLogins: 1
            });
        }
        
        showMessage('Login berjaya! Mengalihkan...', 'success');
        setTimeout(() => {
            window.location.href = 'home.html';
        }, 1500);
        
    } catch (error) {
        console.error('Error:', error);
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            showMessage('Username atau password salah!', 'error');
        } else if (error.code === 'auth/invalid-credential') {
            showMessage('Username atau password salah!', 'error');
        } else {
            showMessage('Ralat berlaku: ' + error.message, 'error');
        }
    }
});

// Check if user is already logged in
auth.onAuthStateChanged((user) => {
    if (user) {
        window.location.href = 'home.html';
    }
});
