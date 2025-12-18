// Firebase Configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, query, orderBy, getDocs, doc, getDoc, updateDoc, arrayUnion, arrayRemove, increment } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
let currentPostId = null;

// Check Authentication
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = 'index.html';
    } else {
        currentUser = user;
        await loadFeed();
    }
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', async (e) => {
    e.preventDefault();
    await signOut(auth);
    window.location.href = 'index.html';
});

// Load Feed
async function loadFeed() {
    const feedContent = document.getElementById('feedContent');
    feedContent.innerHTML = '<p style="text-align: center; color: #a0b3d9;">Memuatkan...</p>';
    
    try {
        const postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(postsQuery);
        
        if (querySnapshot.empty) {
            feedContent.innerHTML = '<p style="text-align: center; color: #a0b3d9;">Tiada postingan lagi. Jadilah yang pertama!</p>';
            return;
        }
        
        feedContent.innerHTML = '';
        
        for (const postDoc of querySnapshot.docs) {
            const post = postDoc.data();
            const postId = postDoc.id;
            
            // Get user data
            const userDoc = await getDoc(doc(db, 'users', post.userId));
            const userData = userDoc.data();
            
            // Check if current user liked this post
            const isLiked = post.likes && post.likes.includes(currentUser.uid);
            
            const postCard = document.createElement('div');
            postCard.className = 'post-card';
            postCard.innerHTML = `
                <div class="post-header">
                    <img src="${userData.profilePicture}" alt="Profile" class="post-profile-pic">
                    <div class="post-user-info ${userData.isDeveloper ? 'developer' : ''}">
                        <h4>${userData.username}</h4>
                        <small>${formatDate(post.createdAt)}</small>
                    </div>
                </div>
                ${post.fileType.startsWith('image') ? 
                    `<img src="${post.fileUrl}" alt="Post" class="post-media">` :
                    `<video src="${post.fileUrl}" class="post-media" controls></video>`
                }
                <div class="post-content">
                    <p class="post-caption">${post.caption || ''}</p>
                </div>
                <div class="post-actions">
                    <button class="action-btn like-btn ${isLiked ? 'liked' : ''}" data-post-id="${postId}">
                        ${isLiked ? '❤️' : '🤍'}
                        <span>${post.likesCount || 0}</span>
                    </button>
                    <button class="action-btn comment-btn" data-post-id="${postId}">
                        💬
                        <span>${post.comments ? post.comments.length : 0}</span>
                    </button>
                </div>
            `;
            
            feedContent.appendChild(postCard);
        }
        
        // Add event listeners
        document.querySelectorAll('.like-btn').forEach(btn => {
            btn.addEventListener('click', handleLike);
        });
        
        document.querySelectorAll('.comment-btn').forEach(btn => {
            btn.addEventListener('click', handleCommentClick);
        });
        
    } catch (error) {
        console.error('Error loading feed:', error);
        feedContent.innerHTML = '<p style="text-align: center; color: #F44336;">Ralat memuatkan feed.</p>';
    }
}

// Handle Like
async function handleLike(e) {
    const postId = e.currentTarget.getAttribute('data-post-id');
    const postRef = doc(db, 'posts', postId);
    const postDoc = await getDoc(postRef);
    const post = postDoc.data();
    
    const isLiked = post.likes && post.likes.includes(currentUser.uid);
    
    try {
        if (isLiked) {
            // Unlike
            await updateDoc(postRef, {
                likes: arrayRemove(currentUser.uid),
                likesCount: increment(-1)
            });
        } else {
            // Like
            await updateDoc(postRef, {
                likes: arrayUnion(currentUser.uid),
                likesCount: increment(1)
            });
        }
        
        await loadFeed();
    } catch (error) {
        console.error('Error updating like:', error);
    }
}

// Handle Comment Click
async function handleCommentClick(e) {
    currentPostId = e.currentTarget.getAttribute('data-post-id');
    const modal = document.getElementById('commentModal');
    modal.classList.add('active');
    
    await loadComments();
}

// Load Comments
async function loadComments() {
    const commentsList = document.getElementById('commentsList');
    commentsList.innerHTML = '<p style="text-align: center; color: #a0b3d9;">Memuatkan komen...</p>';
    
    try {
        const postDoc = await getDoc(doc(db, 'posts', currentPostId));
        const post = postDoc.data();
        
        if (!post.comments || post.comments.length === 0) {
            commentsList.innerHTML = '<p style="text-align: center; color: #a0b3d9;">Tiada komen lagi.</p>';
            return;
        }
        
        commentsList.innerHTML = '';
        
        for (const comment of post.comments) {
            const userDoc = await getDoc(doc(db, 'users', comment.userId));
            const userData = userDoc.data();
            
            const commentItem = document.createElement('div');
            commentItem.className = 'comment-item';
            commentItem.innerHTML = `
                <div class="comment-user">${userData.username}${userData.isDeveloper ? ' ⚡' : ''}</div>
                <div class="comment-text">${comment.text}</div>
            `;
            
            commentsList.appendChild(commentItem);
        }
    } catch (error) {
        console.error('Error loading comments:', error);
        commentsList.innerHTML = '<p style="text-align: center; color: #F44336;">Ralat memuatkan komen.</p>';
    }
}

// Submit Comment
document.getElementById('submitComment').addEventListener('click', async () => {
    const commentText = document.getElementById('commentText').value.trim();
    
    if (!commentText) {
        alert('Sila masukkan komen!');
        return;
    }
    
    try {
        const postRef = doc(db, 'posts', currentPostId);
        
        await updateDoc(postRef, {
            comments: arrayUnion({
                userId: currentUser.uid,
                text: commentText,
                createdAt: new Date().toISOString()
            })
        });
        
        document.getElementById('commentText').value = '';
        await loadComments();
        await loadFeed();
    } catch (error) {
        console.error('Error adding comment:', error);
        alert('Ralat menambah komen!');
    }
});

// Close Modal
document.querySelector('.close').addEventListener('click', () => {
    document.getElementById('commentModal').classList.remove('active');
});

window.addEventListener('click', (e) => {
    const modal = document.getElementById('commentModal');
    if (e.target === modal) {
        modal.classList.remove('active');
    }
});

// Format Date
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 60) {
        return `${minutes} minit yang lalu`;
    } else if (hours < 24) {
        return `${hours} jam yang lalu`;
    } else if (days < 7) {
        return `${days} hari yang lalu`;
    } else {
        return date.toLocaleDateString('ms-MY');
    }
}
