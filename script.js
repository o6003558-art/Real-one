import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onChildAdded, remove, set, update, onValue, onChildChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
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

const CLOUD_NAME = "dmrcz5jbh"; 
const UPLOAD_PRESET = "Real-one"; 
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;
const ADMIN_EMAIL = "o6003558@gmail.com"; 

let allMessages = {}; 
let userPrefs = JSON.parse(localStorage.getItem('chatSettings')) || { myColor: "#005c4b", othersColor: "#202c33" };

// --- 1. التمرير الذكي (Smart Scroll) مصلح ---
const chatBox = document.getElementById("chat-box");
const scrollBtn = document.getElementById("smart-scroll-btn");

chatBox.onscroll = () => {
    // إظهار الزرار فقط لو المستخدم طلع لفوق شوية
    if (chatBox.scrollTop + chatBox.clientHeight < chatBox.scrollHeight - 300) {
        scrollBtn.style.display = "flex";
        scrollBtn.innerText = "↓";
    } else {
        // لو هو تحت خالص، ممكن نخليه سهم لفوق عشان يطلعه لأول الشات
        scrollBtn.innerText = "↑";
    }
};

scrollBtn.onclick = () => {
    if (scrollBtn.innerText === "↓") {
        chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: 'smooth' });
    } else {
        chatBox.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

// --- 2. ميزة النجمة بالضغط المزدوج (Double Tap) ---
window.toggleStar = (id) => {
    if (!auth.currentUser) return;
    const msg = allMessages[id];
    let stars = msg.starredBy || [];
    const uid = auth.currentUser.uid;
    stars = stars.includes(uid) ? stars.filter(i => i !== uid) : [...stars, uid];
    update(ref(db, `messages/${id}`), { starredBy: stars });
};

// --- 3. إرسال الرسائل والرفع ---
window.sendMessage = () => {
    const input = document.getElementById("message-input");
    if (input.value.trim() && auth.currentUser) {
        push(messagesRef, {
            senderId: auth.currentUser.uid, senderEmail: auth.currentUser.email,
            text: input.value, time: Date.now(), starredBy: []
        });
        input.value = "";
    }
};

window.uploadFile = async (e) => {
    const file = e.target.files[0];
    if (!file || !auth.currentUser) return;
    const formData = new FormData();
    formData.append("file", file); formData.append("upload_preset", UPLOAD_PRESET);
    try {
        const res = await fetch(CLOUDINARY_URL, { method: "POST", body: formData });
        const data = await res.json();
        push(messagesRef, {
            senderId: auth.currentUser.uid, senderEmail: auth.currentUser.email,
            text: document.getElementById("message-input").value,
            fileUrl: data.secure_url, fileName: file.name,
            fileType: file.type.startsWith('image/') ? 'image' : 'file',
            time: Date.now(), starredBy: []
        });
        document.getElementById("message-input").value = "";
    } catch (e) { alert("خطأ رفع"); }
};

// --- 4. العرض (Render) ---
onChildAdded(messagesRef, (data) => {
    allMessages[data.key] = data.val();
    renderMessage(data.key, data.val());
});

onChildChanged(messagesRef, (data) => {
    allMessages[data.key] = data.val();
    renderMessage(data.key, data.val());
});

function renderMessage(id, msg) {
    let div = document.getElementById(id) || document.createElement("div");
    const isMe = auth.currentUser && msg.senderId === auth.currentUser.uid;
    div.id = id;
    div.className = `message ${isMe ? "my-message" : "others-message"}`;
    div.style.backgroundColor = isMe ? userPrefs.myColor : userPrefs.othersColor;

    // منطق الضغط المزدوج (Double Tap)
    let lastTap = 0;
    div.onclick = (e) => {
        const now = Date.now();
        if (now - lastTap < 300) { window.toggleStar(id); }
        lastTap = now;
    };

    onValue(ref(db, `users/${msg.senderId}`), (snap) => {
        const name = snap.val()?.username || "عضو";
        const isStarred = msg.starredBy?.includes(auth.currentUser?.uid);
        let media = msg.fileUrl ? (msg.fileType === 'image' ? `<img src="${msg.fileUrl}" style="max-width:100%; border-radius:5px;"><br>` : `📄 ${msg.fileName}<br>`) : "";
        
        div.innerHTML = `
            <small style="color:#00a884; font-weight:bold;">${name} ${isStarred ? '⭐' : ''}</small>
            <div style="margin-top:5px;">${media}${msg.text || ""}</div>
            <div style="font-size:9px; opacity:0.5; margin-top:5px; text-align:left;">
                ${new Date(msg.time).toLocaleTimeString('ar-EG')}
            </div>
        `;
    }, { onlyOnce: true });

    if (!div.parentElement) chatBox.appendChild(div);
    // سكرول تلقائي للأسفل لو الرسالة جديدة
    chatBox.scrollTop = chatBox.scrollHeight;
}

// --- 5. Auth & Modals ---
onAuthStateChanged(auth, (user) => {
    const inputArea = document.getElementById("input-area");
    const loginNotice = document.getElementById("login-notice");
    if (user) {
        inputArea.style.display = "flex";
        loginNotice.style.display = "none";
        document.getElementById("auth-btn").innerText = "خروج";
        document.getElementById("auth-btn").onclick = () => signOut(auth);
        onValue(ref(db, `users/${user.uid}`), s => document.getElementById("user-info").innerText = "أهلاً، " + (s.val()?.username || "عضو"));
    } else {
        inputArea.style.display = "none";
        loginNotice.style.display = "block";
        document.getElementById("auth-btn").innerText = "دخول";
        document.getElementById("auth-btn").onclick = () => window.openAuthModal();
        document.getElementById("user-info").innerText = "زائر";
    }
});

// باقي الوظائف (handleAuth, closeModals, showTab, saveColors) كما هي..
window.openAuthModal = () => document.getElementById("auth-modal").style.display = "flex";
window.closeModals = () => document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
window.saveColors = () => {
    userPrefs.myColor = document.getElementById('my-msg-color').value;
    userPrefs.othersColor = document.getElementById('others-msg-color').value;
    localStorage.setItem('chatSettings', JSON.stringify(userPrefs));
    location.reload();
};
window.handleAuth = (type) => {
    const email = document.getElementById("email-input").value;
    const pass = document.getElementById("password-input").value;
    if (type === 'signup') {
        const name = document.getElementById("reg-username-input").value;
        createUserWithEmailAndPassword(auth, email, pass).then(r => {
            set(ref(db, `users/${r.user.uid}`), { username: name, email }); window.closeModals();
        });
    } else {
        signInWithEmailAndPassword(auth, email, pass).then(window.closeModals);
    }
};
document.getElementById("media-list-btn").onclick = () => document.getElementById("media-modal").style.display = "flex";
document.getElementById("settings-btn").onclick = () => document.getElementById("settings-modal").style.display = "flex";
