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

// --- 1. ميزة الـ Smart Scroll ---
const chatBox = document.getElementById("chat-box");
const scrollBtn = document.getElementById("smart-scroll-btn");

chatBox.onscroll = () => {
    // لو إحنا فوق خالص (أو قريب من فوق)، خلي السهم لتحت
    if (chatBox.scrollTop < 200) {
        scrollBtn.innerText = "↓";
    } else {
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

// --- 2. ميزة النجمة (Starring) ---
window.toggleStar = (msgId) => {
    const isStarred = allMessages[msgId].starredBy?.includes(auth.currentUser.uid);
    let currentStars = allMessages[msgId].starredBy || [];

    if (isStarred) {
        currentStars = currentStars.filter(id => id !== auth.currentUser.uid);
    } else {
        currentStars.push(auth.currentUser.uid);
    }
    
    update(ref(db, `messages/${msgId}`), { starredBy: currentStars });
};

// --- دالة التحميل والألوان ---
window.saveColors = () => {
    userPrefs.myColor = document.getElementById('my-msg-color').value;
    userPrefs.othersColor = document.getElementById('others-msg-color').value;
    localStorage.setItem('chatSettings', JSON.stringify(userPrefs));
    location.reload(); 
};

window.downloadMedia = async (url, filename) => {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl; a.download = filename || 'download';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } catch (e) { window.open(url, '_blank'); }
};

// --- تسجيل الدخول والرفع (نفس الكود السابق) ---
onAuthStateChanged(auth, (user) => {
    const inputArea = document.getElementById("input-area");
    const authBtn = document.getElementById("auth-btn");
    const userInfo = document.getElementById("user-info");
    if (user) {
        if(inputArea) inputArea.style.display = "flex";
        authBtn.innerText = "خروج";
        onValue(ref(db, 'users/' + user.uid), (snap) => {
            userInfo.innerHTML = `أهلاً، ${snap.val()?.username || "عضو"} ${user.email === ADMIN_EMAIL ? "👑" : ""}`;
        });
    } else { if(inputArea) inputArea.style.display = "none"; authBtn.innerText = "دخول"; }
});

window.uploadFile = async (e) => {
    const file = e.target.files[0];
    if (!file || !auth.currentUser) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);
    try {
        const res = await fetch(CLOUDINARY_URL, { method: "POST", body: formData });
        const data = await res.json();
        if (data.secure_url) {
            push(messagesRef, {
                senderId: auth.currentUser.uid, senderEmail: auth.currentUser.email,
                text: document.getElementById("message-input").value,
                fileUrl: data.secure_url, fileName: file.name,
                fileType: file.type.startsWith('image/') ? 'image' : 'file',
                time: Date.now(), starredBy: []
            });
            document.getElementById("message-input").value = "";
        }
    } catch (err) { alert("خطأ في الرفع"); }
};

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

// --- عرض الرسايل (مع دعم الضغطة المطولة) ---
onChildAdded(messagesRef, (data) => {
    const msg = data.val();
    const msgId = data.key;
    allMessages[msgId] = msg;
    renderMessage(msgId, msg);
    updateMediaList();
});

function renderMessage(id, msg) {
    const isMe = auth.currentUser && msg.senderId === auth.currentUser.uid;
    let div = document.getElementById(id) || document.createElement("div");
    div.className = `message ${isMe ? "my-message" : "others-message"}`;
    div.id = id;
    div.style.backgroundColor = isMe ? userPrefs.myColor : userPrefs.othersColor;

    // ميزة الضغطة المطولة
    let pressTimer;
    div.onmousedown = () => pressTimer = setTimeout(() => window.toggleStar(id), 800);
    div.onmouseup = () => clearTimeout(pressTimer);
    div.ontouchstart = () => pressTimer = setTimeout(() => window.toggleStar(id), 800);
    div.ontouchend = () => clearTimeout(pressTimer);

    onValue(ref(db, 'users/' + msg.senderId), (snapshot) => {
        const uName = snapshot.val()?.username || "مستخدم";
        const isStarred = msg.starredBy?.includes(auth.currentUser?.uid);
        
        let mediaHtml = "";
        if (msg.fileUrl) {
            if (msg.fileType === 'image') {
                mediaHtml = `<img src="${msg.fileUrl}" style="max-width:100%; border-radius:8px;"><button class="download-btn" onclick="window.downloadMedia('${msg.fileUrl}', '${msg.fileName}')">📥</button>`;
            } else {
                mediaHtml = `<div class="file-box">📄 ${msg.fileName} <button class="download-btn" onclick="window.downloadMedia('${msg.fileUrl}', '${msg.fileName}')">📥</button></div>`;
            }
        }

        div.innerHTML = `
            <small style="display:block; font-weight:bold;">${uName} ${isStarred ? '<span class="star-icon">⭐</span>' : ''}</small>
            ${mediaHtml} <div>${msg.text || ""}</div>
            <div style="font-size:9px; opacity:0.5; margin-top:5px;">
                ${new Date(msg.time).toLocaleTimeString('ar-EG')}
                ${auth.currentUser?.email === ADMIN_EMAIL ? `<span onclick="window.deleteMsg('${id}')" style="color:red; cursor:pointer;"> [حذف]</span>` : ""}
            </div>
        `;
    });
    if (!document.getElementById(id)) chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// --- تحديث قائمة الوسائط والمفضلة ---
window.updateMediaList = () => {
    const imgCont = document.getElementById('media-images');
    const starCont = document.getElementById('media-starred');
    if(!imgCont) return;
    
    imgCont.innerHTML = ''; starCont.innerHTML = '';
    // (باقي كود الصور والروابط كما هو...)

    Object.keys(allMessages).forEach(id => {
        const m = allMessages[id];
        // إضافة للمفضلة
        if (m.starredBy?.includes(auth.currentUser?.uid)) {
            starCont.innerHTML += `
                <div class="starred-msg-item">
                    <small>من: ${m.senderEmail}</small>
                    <div>${m.text || (m.fileUrl ? "[ملف/صورة]" : "")}</div>
                    <button onclick="window.toggleStar('${id}')" style="font-size:10px;">إزالة النجمة</button>
                </div>`;
        }
        // ... (كود الروابط والصور والملفات)
    });
};

// الوظائف العامة
window.deleteMsg = (id) => { if(confirm("حذف؟")) remove(ref(db, "messages/" + id)); };
window.closeModals = () => document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
document.getElementById("media-list-btn").onclick = () => { window.updateMediaList(); document.getElementById("media-modal").style.display = "flex"; };
window.showTab = (tabId) => {
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).style.display = 'block';
    if(event) event.target.classList.add('active');
};
