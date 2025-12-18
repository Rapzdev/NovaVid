// Firebase Configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
let selectedFile = null;

// Check Authentication
auth.onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = 'index.html';
    } else {
        currentUser = user;
    }
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', async (e) => {
    e.preventDefault();
    await signOut(auth);
    window.location.href = 'index.html';
});

// File Input Handler
document.getElementById('fileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file size (limit 5MB untuk optimal performance)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        alert('Saiz fail terlalu besar! Maksimum 5MB. Saiz fail anda: ' + (file.size / 1024 / 1024).toFixed(2) + 'MB');
        e.target.value = '';
        return;
    }
    
    selectedFile = file;
    const filePreview = document.getElementById('filePreview');
    filePreview.innerHTML = '';
    
    const fileType = file.type.split('/')[0];
    
    if (fileType === 'image') {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        filePreview.appendChild(img);
    } else if (fileType === 'video') {
        const video = document.createElement('video');
        video.src = URL.createObjectURL(file);
        video.controls = true;
        filePreview.appendChild(video);
    }
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

// Upload Form Handler
document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!selectedFile) {
        showMessage('Sila pilih fail!', 'error');
        return;
    }
    
    const caption = document.getElementById('captionInput').value.trim();
    const uploadMessage = document.getElementById('uploadMessage');
    const uploadProgress = document.getElementById('uploadProgress');
    const progressFill = uploadProgress.querySelector('.progress-fill');
    
    try {
        // Show progress bar
        uploadProgress.classList.add('active');
        uploadMessage.style.display = 'none';
        progressFill.style.width = '10%';
        progressFill.textContent = '10%';
        
        // Convert file to Base64
        showMessage('Memproses fail...', 'success');
        progressFill.style.width = '30%';
        progressFill.textContent = '30%';
        
        const base64Data = await fileToBase64(selectedFile);
        
        progressFill.style.width = '60%';
        progressFill.textContent = '60%';
        
        // Create post document
        showMessage('Menyimpan ke database...', 'success');
        await addDoc(collection(db, 'posts'), {
            userId: currentUser.uid,
            fileUrl: base64Data, // Simpan sebagai Base64
            fileType: selectedFile.type,
            caption: caption,
            createdAt: new Date().toISOString(),
            likes: [],
            likesCount: 0,
            comments: []
        });
        
        progressFill.style.width = '90%';
        progressFill.textContent = '90%';
        
        // Update user stats
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
            totalPosts: increment(1)
        });
        
        progressFill.style.width = '100%';
        progressFill.textContent = '100%';
        
        showMessage('Upload berjaya! 🎉', 'success');
        
        // Reset form
        setTimeout(() => {
            document.getElementById('uploadForm').reset();
            document.getElementById('filePreview').innerHTML = '';
            selectedFile = null;
            uploadProgress.classList.remove('active');
            
            // Redirect to home
            window.location.href = 'home.html';
        }, 1500);
        
    } catch (error) {
        console.error('Error:', error);
        showMessage('Ralat berlaku: ' + error.message, 'error');
        uploadProgress.classList.remove('active');
    }
});

// Show Message Function
function showMessage(message, type) {
    const uploadMessage = document.getElementById('uploadMessage');
    uploadMessage.textContent = message;
    uploadMessage.className = `message ${type}`;
    uploadMessage.style.display = 'block';
}
