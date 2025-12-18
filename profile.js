// Firebase Configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signOut, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, collection, query, where, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

let currentUser = null;
let userData = null;

// Check Authentication
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = 'index.html';
    } else {
        currentUser = user;
        await loadProfile();
    }
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', async (e) => {
    e.preventDefault();
    await signOut(auth);
    window.location.href = 'index.html';
});

// Convert File to Base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Load Profile
async function loadProfile() {
    try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        userData = userDoc.data();
        
        // Update profile UI
        document.getElementById('profileUsername').textContent = userData.username;
        document.getElementById('profilePicture').src = userData.profilePicture;
        document.getElementById('profileStats').textContent = 
            `${userData.totalPosts || 0} Posts | ${userData.totalLikes || 0} Likes`;
        
        // Show developer badge if user is developer
        if (userData.isDeveloper) {
            document.getElementById('developerBadge').style.display = 'block';
            document.getElementById('adminPanel').style.display = 'block';
            await loadAdminPanel();
        }
        
        // Load user posts
        await loadUserPosts();
        
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

// Load User Posts
async function loadUserPosts() {
    const userPostsContainer = document.getElementById('userPosts');
    userPostsContainer.innerHTML = '<p style="text-align: center; color: #a0b3d9;">Memuatkan...</p>';
    
    try {
        const postsQuery = query(
            collection(db, 'posts'),
            where('userId', '==', currentUser.uid)
        );
        const querySnapshot = await getDocs(postsQuery);
        
        if (querySnapshot.empty) {
            userPostsContainer.innerHTML = '<p style="text-align: center; color: #a0b3d9;">Tiada postingan lagi.</p>';
            return;
        }
        
        userPostsContainer.innerHTML = '';
        
        querySnapshot.forEach((doc) => {
            const post = doc.data();
            const postItem = document.createElement('div');
            postItem.className = 'user-post-item';
            
            if (post.fileType.startsWith('image')) {
                postItem.innerHTML = `<img src="${post.fileUrl}" alt="Post">`;
            } else {
                postItem.innerHTML = `<video src="${post.fileUrl}"></video>`;
            }
            
            userPostsContainer.appendChild(postItem);
        });
        
    } catch (error) {
        console.error('Error loading posts:', error);
        userPostsContainer.innerHTML = '<p style="text-align: center; color: #F44336;">Ralat memuatkan postingan.</p>';
    }
}

// Profile Picture Upload
document.getElementById('profilePictureInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file size (limit 2MB for profile pictures)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
        alert('Saiz gambar terlalu besar! Maksimum 2MB.');
        return;
    }
    
    try {
        // Convert to Base64
        const base64Data = await fileToBase64(file);
        
        // Update Firestore
        await updateDoc(doc(db, 'users', currentUser.uid), {
            profilePicture: base64Data
        });
        
        document.getElementById('profilePicture').src = base64Data;
        alert('Gambar profil berjaya dikemaskini! ✓');
        
    } catch (error) {
        console.error('Error uploading profile picture:', error);
        alert('Ralat upload gambar!');
    }
});

// Edit Username Modal
document.getElementById('editUsernameBtn').addEventListener('click', () => {
    const modal = document.getElementById('editUsernameModal');
    modal.classList.add('active');
    
    const lastChange = userData.lastUsernameChange;
    const infoText = document.getElementById('lastChangeInfo');
    
    if (lastChange) {
        const daysSince = Math.floor((Date.now() - new Date(lastChange).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince < 3) {
            infoText.textContent = `Anda boleh tukar username lagi dalam ${3 - daysSince} hari.`;
            infoText.style.color = '#F44336';
            document.querySelector('#editUsernameForm button').disabled = true;
        } else {
            infoText.textContent = 'Anda boleh tukar username sekarang.';
            infoText.style.color = '#4CAF50';
            document.querySelector('#editUsernameForm button').disabled = false;
        }
    } else {
        infoText.textContent = 'Ini adalah pertama kali anda menukar username.';
        infoText.style.color = '#a0b3d9';
    }
});

// Edit Username Form
document.getElementById('editUsernameForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const newUsername = document.getElementById('newUsername').value.trim();
    const password = document.getElementById('verifyPassword').value;
    
    if (newUsername.length < 3) {
        alert('Username mestilah 3 karakter atau lebih!');
        return;
    }
    
    try {
        // Verify password
        const credential = EmailAuthProvider.credential(
            currentUser.email,
            password
        );
        await reauthenticateWithCredential(currentUser, credential);
        
        // Check if can change username
        const lastChange = userData.lastUsernameChange;
        if (lastChange) {
            const daysSince = Math.floor((Date.now() - new Date(lastChange).getTime()) / (1000 * 60 * 60 * 24));
            if (daysSince < 3) {
                alert(`Anda boleh tukar username lagi dalam ${3 - daysSince} hari!`);
                return;
            }
        }
        
        // Update username
        const isDeveloper = newUsername.toLowerCase().endsWith('dev');
        await updateDoc(doc(db, 'users', currentUser.uid), {
            username: newUsername,
            isDeveloper: isDeveloper,
            lastUsernameChange: new Date().toISOString()
        });
        
        alert('Username berjaya dikemaskini! ✓');
        document.getElementById('editUsernameModal').classList.remove('active');
        document.getElementById('editUsernameForm').reset();
        await loadProfile();
        
    } catch (error) {
        console.error('Error updating username:', error);
        if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            alert('Password salah!');
        } else {
            alert('Ralat: ' + error.message);
        }
    }
});

// Change Password Modal
document.getElementById('changePasswordBtn').addEventListener('click', () => {
    document.getElementById('changePasswordModal').classList.add('active');
});

// Change Password Form
document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;
    
    if (newPassword.length < 6) {
        alert('Password baru mestilah 6 karakter atau lebih!');
        return;
    }
    
    if (newPassword !== confirmNewPassword) {
        alert('Password baru tidak sepadan!');
        return;
    }
    
    try {
        // Verify current password
        const credential = EmailAuthProvider.credential(
            currentUser.email,
            currentPassword
        );
        await reauthenticateWithCredential(currentUser, credential);
        
        // Update password
        await updatePassword(currentUser, newPassword);
        
        alert('Password berjaya dikemaskini! ✓');
        document.getElementById('changePasswordModal').classList.remove('active');
        document.getElementById('changePasswordForm').reset();
        
    } catch (error) {
        console.error('Error changing password:', error);
        if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            alert('Password semasa salah!');
        } else {
            alert('Ralat: ' + error.message);
        }
    }
});

// Load Admin Panel
async function loadAdminPanel() {
    try {
        // Get total users count
        const statsDoc = await getDoc(doc(db, 'stats', 'general'));
        if (statsDoc.exists()) {
            document.getElementById('totalUsers').textContent = statsDoc.data().totalLogins || 0;
        }
        
        // Load all users
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersList = document.getElementById('usersList');
        usersList.innerHTML = '';
        
        usersSnapshot.forEach((doc) => {
            const user = doc.data();
            const userId = doc.id;
            
            if (userId === currentUser.uid) return; // Skip current user
            
            const userItem = document.createElement('div');
            userItem.className = 'user-item';
            userItem.innerHTML = `
                <div class="user-item-info">
                    <img src="${user.profilePicture}" alt="Profile">
                    <div>
                        <strong>${user.username}${user.isDeveloper ? ' ⚡' : ''}</strong>
                        <br>
                        <small style="color: #a0b3d9;">${user.totalPosts || 0} posts</small>
                    </div>
                </div>
                <div class="user-item-actions">
                    <button class="btn-secondary" onclick="window.changeUserPicture('${userId}')">Tukar Gambar</button>
                    <button class="btn-danger" onclick="window.banUser('${userId}', '${user.username}')">Ban</button>
                </div>
            `;
            usersList.appendChild(userItem);
        });
        
    } catch (error) {
        console.error('Error loading admin panel:', error);
    }
}

// Admin Functions
window.changeUserPicture = async (userId) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Check file size
        const maxSize = 2 * 1024 * 1024; // 2MB
        if (file.size > maxSize) {
            alert('Saiz gambar terlalu besar! Maksimum 2MB.');
            return;
        }
        
        try {
            // Convert to Base64
            const base64Data = await fileToBase64(file);
            
            await updateDoc(doc(db, 'users', userId), {
                profilePicture: base64Data
            });
            
            alert('Gambar profil pengguna berjaya dikemaskini! ✓');
            await loadAdminPanel();
            
        } catch (error) {
            console.error('Error:', error);
            alert('Ralat upload gambar!');
        }
    };
    
    input.click();
};

window.banUser = async (userId, username) => {
    if (!confirm(`Adakah anda pasti ingin ban pengguna "${username}"? Ini akan menghapus semua data mereka.`)) {
        return;
    }
    
    try {
        // Delete user's posts
        const postsQuery = query(collection(db, 'posts'), where('userId', '==', userId));
        const postsSnapshot = await getDocs(postsQuery);
        
        for (const postDoc of postsSnapshot.docs) {
            await deleteDoc(postDoc.ref);
        }
        
        // Delete user document
        await deleteDoc(doc(db, 'users', userId));
        
        alert(`Pengguna "${username}" telah di-ban! ✓`);
        await loadAdminPanel();
        
    } catch (error) {
        console.error('Error banning user:', error);
        alert('Ralat ban pengguna!');
    }
};

// Close Modals
document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.addEventListener('click', function() {
        this.closest('.modal').classList.remove('active');
    });
});

window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});
