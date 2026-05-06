import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onChildAdded, remove, onChildRemoved, set, get, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAMV3-20MM0bvwQ8xrofLyY_h2y7rlUd90",
  authDomain: "real-ffb38.firebaseapp.com",
  databaseURL: "https://real-ffb38-default-rtdb.firebaseio.com",
  projectId: "real-ffb38",
  storageBucket: "real-ffb38.firebasestorage.app",
  messagingSenderId: "896035772842",
  appId: "1:896035772842:web:829d43c7818880685c33d3"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const messagesRef = ref(db, "messages");

let currentUserData = null;

// مراقبة حالة المستخدم
onAuthStateChanged(auth, async (user) => {
    const inputArea = document.getElementById("input-area");
    const loginNotice = document.getElementById("login-notice");
    const authBtn = document.getElementById("auth-btn");
    const profileBtn = document.getElementById("profile-btn");
    const userInfo = document.getElementById("user-info");

    if (user) {
        inputArea.style.display = "flex";
        loginNotice.style.display = "none";
        authBtn.innerText = "خروج";
        authBtn.onclick = () => signOut(auth);
        profileBtn.style.display = "inline-block";
        
        const snapshot = await get(ref(db, 'users/' + user.uid));
        currentUserData = snapshot.val() || { username: "عضو جديد", lastUpdate: 0 };
        userInfo.innerText = "أهلاً، " + currentUserData.username;
    } else {
        inputArea.style.display = "none";
        loginNotice.style.display = "block";
        authBtn.innerText = "دخول";
        authBtn.onclick = () => window.openAuthModal();
        profileBtn.style.display = "none";
        userInfo.innerText = "زائر";
    }
});

window.handleAuth = (type) => {
    const email = document.getElementById("email-input").value;
    const pass = document.getElementById("password-input").value;
    if (type === 'login') {
        signInWithEmailAndPassword(auth, email, pass).then(window.closeModals).catch(err => alert(err.message));
    } else {
        createUserWithEmailAndPassword(auth, email, pass).then(res => {
            set(ref(db, 'users/' + res.user.uid), { username: "User_" + Math.floor(Math.random()*100), lastUpdate: 0 });
            window.closeModals();
        }).catch(err => alert(err.message));
    }
};

window.sendMessage = () => {
    const input = document.getElementById("message-input");
    const isAdmin = localStorage.getItem("adminKey") === "omar_admin_77";
    if (input.value.trim() && auth.currentUser) {
        push(messagesRef, {
            senderId: auth.currentUser.uid,
            senderName: currentUserData.username,
            text: input.value,
            time: Date.now(),
            role: isAdmin ? "Admin 👑" : "User 👤" 
        });
        input.value = "";
    }
};

onChildAdded(messagesRef, (data) => {
    const chatBox = document.getElementById("chat-box");
    const msg = data.val();
    const div = document.createElement("div");
    div.classList.add("message");
    div.id = data.key;
    
    const isMe = auth.currentUser && msg.senderId === auth.currentUser.uid;
    div.classList.add(isMe ? "my-message" : "others-message");

    const isAdmin = localStorage.getItem("adminKey") === "omar_admin_77";
    const deleteBtn = isAdmin ? `<button onclick="window.deleteMessage('${data.key}')" style="color:red; background:none; border:none; cursor:pointer;">[X]</button>` : "";

    div.innerHTML = `
        <div style="font-size:10px; opacity:0.7; font-weight:bold">${msg.senderName} (${msg.role})</div>
        <div style="margin:5px 0">${msg.text}</div>
        <div style="font-size:9px; opacity:0.5; display:flex; justify-content:space-between">
            ${new Date(msg.time).toLocaleTimeString('ar-EG')} ${deleteBtn}
        </div>
    `;
    chatBox.appendChild(div);
    window.scrollTo(0, document.body.scrollHeight);
});

window.deleteMessage = (id) => { if(confirm("حذف؟")) remove(ref(db, "messages/" + id)); };
onChildRemoved(messagesRef, (data) => document.getElementById(data.key)?.remove());

window.openAuthModal = () => document.getElementById("auth-modal").style.display = "flex";
document.getElementById("profile-btn").onclick = () => document.getElementById("profile-modal").style.display = "flex";
window.closeModals = () => {
    document.getElementById("auth-modal").style.display = "none";
    document.getElementById("profile-modal").style.display = "none";
};
