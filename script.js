import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onChildAdded, remove, onChildRemoved, set, update, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
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

// --- 1. التمرير الذكي ---
const chatBox = document.getElementById("chat-box");
const scrollBtn = document.getElementById("smart-scroll-btn");
chatBox.addEventListener('scroll', () => {
    scrollBtn.innerText = chatBox.scrollTop < 200 ? "↓" : "↑";
});
scrollBtn.onclick = () => {
    const target = scrollBtn.innerText === "↓" ? chatBox.scrollHeight : 0;
    chatBox.scrollTo({ top: target, behavior: 'smooth' });
};

// --- 2. التحميل ---
window.downloadMedia = async (url, filename) => {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
    } catch (e) { window.open(url, '_blank'); }
};

// --- 3. النجمة (Starred) ---
window.toggleStar = (id) => {
    let msg = allMessages[id];
    let stars = msg.starredBy || [];
    const uid = auth.currentUser.uid;
    stars = stars.includes(uid) ? stars.filter(i => i !== uid) : [...stars, uid];
    update(ref(db, `messages/${id}`), { starredBy: stars });
};

// --- 4. الألوان ---
window.saveColors = () => {
    userPrefs.myColor = document.getElementById('my-msg-color').value;
    userPrefs.othersColor = document.getElementById('others-msg-color').value;
    localStorage.setItem('chatSettings', JSON.stringify(userPrefs));
    location.reload();
};

// --- 5. الرفع والارسال ---
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
            time: Date.now()
        });
        document.getElementById("message-input").value = "";
    } catch (e) { alert("خطأ رفع"); }
};

window.sendMessage = () => {
    const input = document.getElementById("message-input");
    if (input.value.trim() && auth.currentUser) {
        push(messagesRef, {
            senderId: auth.currentUser.uid, senderEmail: auth.currentUser.email,
            text: input.value, time: Date.now()
        });
        input.value = "";
    }
};

// --- 6. عرض الرسائل والضغطة المطولة ---
onChildAdded(messagesRef, (data) => {
    const msg = data.val(); const id = data.key;
    allMessages[id] = msg;
    renderMessage(id, msg);
});

onChildRemoved(messagesRef, (data) => {
    document.getElementById(data.key)?.remove();
    delete allMessages[data.key];
});

function renderMessage(id, msg) {
    let div = document.getElementById(id) || document.createElement("div");
    const isMe = auth.currentUser && msg.senderId === auth.currentUser.uid;
    div.id = id;
    div.className = `message ${isMe ? "my-message" : "others-message"}`;
    div.style.backgroundColor = isMe ? userPrefs.myColor : userPrefs.othersColor;

    // ميزة النجمة بالضغطة المطولة
    let timer;
    div.onmousedown = div.ontouchstart = () => timer = setTimeout(() => window.toggleStar(id), 800);
    div.onmouseup = div.ontouchend = () => clearTimeout(timer);

    onValue(ref(db, `users/${msg.senderId}`), (snap) => {
        const name = snap.val()?.username || "عضو";
        const isStarred = msg.starredBy?.includes(auth.currentUser?.uid);
        let media = "";
        if (msg.fileUrl) {
            media = msg.fileType === 'image' 
                ? `<img src="${msg.fileUrl}" style="max-width:100%; border-radius:5px;"><br>` 
                : `<div style="background:rgba(0,0,0,0.2);padding:5px;">📄 ${msg.fileName}</div>`;
            media += `<button class="download-btn" onclick="window.downloadMedia('${msg.fileUrl}','${msg.fileName}')">📥 تحميل</button>`;
        }
        div.innerHTML = `
            <small style="font-weight:bold; color:#00a884;">${name} ${isStarred ? '⭐' : ''}</small>
            <div style="margin-top:5px;">${media}${msg.text || ""}</div>
            <div style="font-size:9px; opacity:0.5; margin-top:5px; display:flex; justify-content:space-between;">
                <span>${new Date(msg.time).toLocaleTimeString('ar-EG')}</span>
                ${auth.currentUser?.email === ADMIN_EMAIL ? `<span onclick="window.deleteMsg('${id}')" style="color:red;cursor:pointer;">حذف</span>` : ""}
            </div>
        `;
    });
    if (!div.parentElement) chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// --- 7. المكتبة ---
window.updateMediaList = () => {
    const tabs = { images: '', files: '', links: '', starred: '' };
    Object.keys(allMessages).forEach(id => {
        const m = allMessages[id];
        if (m.fileUrl) {
            if (m.fileType === 'image') tabs.images += `<img src="${m.fileUrl}" class="media-thumb" onclick="window.open('${m.fileUrl}')">`;
            else tabs.files += `<div style="padding:10px;border-bottom:1px solid #444;"><a href="${m.fileUrl}" target="_blank">📄 ${m.fileName}</a></div>`;
        }
        const links = m.text?.match(/(https?:\/\/[^\s]+)/g);
        if (links) links.forEach(l => tabs.links += `<div style="padding:10px;border-bottom:1px solid #444;"><a href="${l}" target="_blank">🔗 ${l}</a></div>`);
        if (m.starredBy?.includes(auth.currentUser?.uid)) {
            tabs.starred += `<div style="padding:10px;border-bottom:1px solid #444;">⭐ ${m.text || "[وسائط]"}<br><small onclick="window.toggleStar('${id}')" style="color:red;cursor:pointer;">إزالة</small></div>`;
        }
    });
    document.getElementById('media-images').innerHTML = tabs.images;
    document.getElementById('media-files').innerHTML = tabs.files;
    document.getElementById('media-links').innerHTML = tabs.links;
    document.getElementById('media-starred').innerHTML = tabs.starred;
};

// --- 8. التحكم والـ Auth ---
onAuthStateChanged(auth, (user) => {
    const inputArea = document.getElementById("input-area");
    if (user) {
        inputArea.style.display = "flex";
        document.getElementById("login-notice").style.display = "none";
        document.getElementById("auth-btn").innerText = "خروج";
        onValue(ref(db, `users/${user.uid}`), snap => {
            document.getElementById("user-info").innerHTML = `أهلاً، ${snap.val()?.username || "عضو"}`;
        });
    } else {
        inputArea.style.display = "none";
        document.getElementById("login-notice").style.display = "block";
        document.getElementById("auth-btn").innerText = "دخول";
    }
});

window.handleAuth = (type) => {
    const email = document.getElementById("email-input").value;
    const pass = document.getElementById("password-input").value;
    const name = document.getElementById("reg-username-input").value;
    if (type === 'signup') {
        createUserWithEmailAndPassword(auth, email, pass).then(res => {
            set(ref(db, `users/${res.user.uid}`), { username: name, email: email });
            window.closeModals();
        }).catch(e => alert(e.message));
    } else {
        signInWithEmailAndPassword(auth, email, pass).then(window.closeModals).catch(e => alert(e.message));
    }
};

window.deleteMsg = (id) => { if(confirm("حذف؟")) remove(ref(db, `messages/${id}`)); };
window.openAuthModal = () => document.getElementById("auth-modal").style.display = "flex";
window.closeModals = () => document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
document.getElementById("settings-btn").onclick = () => document.getElementById("settings-modal").style.display = "flex";
document.getElementById("media-list-btn").onclick = () => { window.updateMediaList(); document.getElementById("media-modal").style.display = "flex"; };
window.showTab = (tabId) => {
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).style.display = 'block';
    event.target.classList.add('active');
};
