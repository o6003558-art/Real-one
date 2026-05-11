import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onChildAdded, remove, onChildRemoved, set, update, onValue, onChildChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
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

// --- 1. التمرير الذكي (Smart Scroll) ---
const chatBox = document.getElementById("chat-box");
const scrollBtn = document.getElementById("smart-scroll-btn");

chatBox.addEventListener('scroll', () => {
    // لو المسافة بينك وبين آخر الشات أكبر من 300 بيكسل، يظهر سهم لتحت
    const isEnd = chatBox.scrollHeight - chatBox.scrollTop - chatBox.clientHeight < 300;
    scrollBtn.innerText = isEnd ? "↑" : "↓";
});

scrollBtn.onclick = () => {
    const target = scrollBtn.innerText === "↓" ? chatBox.scrollHeight : 0;
    chatBox.scrollTo({ top: target, behavior: 'smooth' });
};

// --- 2. التحميل الآمن للملفات ---
window.downloadMedia = async (url, filename) => {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename || 'file';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
    } catch (e) { window.open(url, '_blank'); }
};

// --- 3. نظام النجمة (⭐) بالضغطة المطولة ---
window.toggleStar = (id) => {
    if (!auth.currentUser) return alert("سجل دخول الأول!");
    const msg = allMessages[id];
    let stars = msg.starredBy || [];
    const uid = auth.currentUser.uid;

    if (stars.includes(uid)) {
        stars = stars.filter(i => i !== uid);
    } else {
        stars.push(uid);
    }
    update(ref(db, `messages/${id}`), { starredBy: stars });
};

// --- 4. الألوان الشخصية ---
window.saveColors = () => {
    userPrefs.myColor = document.getElementById('my-msg-color').value;
    userPrefs.othersColor = document.getElementById('others-msg-color').value;
    localStorage.setItem('chatSettings', JSON.stringify(userPrefs));
    location.reload();
};

// --- 5. الرفع والإرسال ---
window.uploadFile = async (e) => {
    const file = e.target.files[0];
    if (!file || !auth.currentUser) return;
    
    const sendBtn = document.getElementById("send-btn");
    sendBtn.innerText = "⏳"; // مؤشر رفع
    
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    try {
        const res = await fetch(CLOUDINARY_URL, { method: "POST", body: formData });
        const data = await res.json();
        push(messagesRef, {
            senderId: auth.currentUser.uid,
            senderEmail: auth.currentUser.email,
            text: document.getElementById("message-input").value,
            fileUrl: data.secure_url,
            fileName: file.name,
            fileType: file.type.startsWith('image/') ? 'image' : 'file',
            time: Date.now(),
            starredBy: []
        });
        document.getElementById("message-input").value = "";
    } catch (e) { alert("فشل الرفع!"); }
    sendBtn.innerText = "إرسال";
};

window.sendMessage = () => {
    const input = document.getElementById("message-input");
    if (input.value.trim() && auth.currentUser) {
        push(messagesRef, {
            senderId: auth.currentUser.uid,
            senderEmail: auth.currentUser.email,
            text: input.value,
            time: Date.now(),
            starredBy: []
        });
        input.value = "";
    }
};

// --- 6. عرض ومعالجة الرسائل ---
onChildAdded(messagesRef, (data) => {
    const id = data.key;
    allMessages[id] = data.val();
    renderMessage(id, data.val());
});

// تحديث الرسالة لو النجمة اتضافت (بدون تكرار)
onChildChanged(messagesRef, (data) => {
    allMessages[data.key] = data.val();
    renderMessage(data.key, data.val());
    if(document.getElementById('media-modal').style.display === 'flex') window.updateMediaList();
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

    // ميزة الضغطة المطولة (Hold for 800ms)
    let timer;
    const startHold = () => timer = setTimeout(() => window.toggleStar(id), 800);
    const stopHold = () => clearTimeout(timer);
    
    div.onmousedown = div.ontouchstart = startHold;
    div.onmouseup = div.ontouchend = div.onmouseleave = stopHold;

    onValue(ref(db, `users/${msg.senderId}`), (snap) => {
        const name = snap.val()?.username || "عضو";
        const isStarred = msg.starredBy?.includes(auth.currentUser?.uid);
        let media = "";
        
        if (msg.fileUrl) {
            media = msg.fileType === 'image' 
                ? `<img src="${msg.fileUrl}" style="max-width:100%; border-radius:5px; cursor:pointer;" onclick="window.open('${msg.fileUrl}')"><br>` 
                : `<div style="background:rgba(0,0,0,0.2);padding:8px;border-radius:5px;">📄 ${msg.fileName}</div>`;
            media += `<button class="download-btn" onclick="window.downloadMedia('${msg.fileUrl}','${msg.fileName}')">📥 تحميل</button>`;
        }

        div.innerHTML = `
            <small style="font-weight:bold; color:#00a884; display:block;">${name} ${isStarred ? '⭐' : ''}</small>
            <div style="margin-top:5px;">${media}${msg.text || ""}</div>
            <div style="font-size:9px; opacity:0.5; margin-top:5px; display:flex; justify-content:space-between;">
                <span>${new Date(msg.time).toLocaleTimeString('ar-EG')}</span>
                ${auth.currentUser?.email === ADMIN_EMAIL ? `<span onclick="window.deleteMsg('${id}')" style="color:#ff4444;cursor:pointer;font-weight:bold;">حذف</span>` : ""}
            </div>
        `;
    }, { onlyOnce: true }); // أداء أفضل

    if (!div.parentElement) {
        chatBox.appendChild(div);
        chatBox.scrollTop = chatBox.scrollHeight;
    }
}

// --- 7. المكتبة والوسائط ---
window.updateMediaList = () => {
    const tabs = { images: '', files: '', links: '', starred: '' };
    const urlRegex = /(https?:\/\/[^\s]+)/g;

    Object.keys(allMessages).forEach(id => {
        const m = allMessages[id];
        const uid = auth.currentUser?.uid;

        if (m.fileUrl) {
            if (m.fileType === 'image') tabs.images += `<img src="${m.fileUrl}" class="media-thumb" onclick="window.open('${m.fileUrl}')">`;
            else tabs.files += `<div class="media-item"><a href="${m.fileUrl}" target="_blank">📄 ${m.fileName}</a></div>`;
        }
        
        const links = m.text?.match(urlRegex);
        if (links) links.forEach(l => tabs.links += `<div class="media-item"><a href="${l}" target="_blank">🔗 ${l}</a></div>`);
        
        if (m.starredBy?.includes(uid)) {
            tabs.starred += `
                <div class="starred-item">
                    <span>${m.text || "[وسائط]"}</span>
                    <small onclick="window.toggleStar('${id}')" style="color:#ff4444;cursor:pointer;">إزالة ⭐</small>
                </div>`;
        }
    });

    document.getElementById('media-images').innerHTML = tabs.images || "لا يوجد صور";
    document.getElementById('media-files').innerHTML = tabs.files || "لا يوجد ملفات";
    document.getElementById('media-links').innerHTML = tabs.links || "لا يوجد روابط";
    document.getElementById('media-starred').innerHTML = tabs.starred || "لا يوجد رسائل مميزة";
};

// --- 8. التحكم والـ Auth ---
onAuthStateChanged(auth, (user) => {
    const inputArea = document.getElementById("input-area");
    const authBtn = document.getElementById("auth-btn");
    const profileBtn = document.getElementById("profile-btn");

    if (user) {
        inputArea.style.display = "flex";
        document.getElementById("login-notice").style.display = "none";
        authBtn.innerText = "خروج";
        authBtn.onclick = () => signOut(auth);
        profileBtn.style.display = "inline-block";
        onValue(ref(db, `users/${user.uid}`), snap => {
            document.getElementById("user-info").innerHTML = `أهلاً، ${snap.val()?.username || "عضو"}`;
        });
    } else {
        inputArea.style.display = "none";
        document.getElementById("login-notice").style.display = "block";
        authBtn.innerText = "دخول";
        authBtn.onclick = () => window.openAuthModal();
        profileBtn.style.display = "none";
        document.getElementById("user-info").innerText = "زائر";
    }
});

window.handleAuth = (type) => {
    const email = document.getElementById("email-input").value;
    const pass = document.getElementById("password-input").value;
    const name = document.getElementById("reg-username-input").value;
    
    if (type === 'signup') {
        if(!name) return alert("اكتب اسمك الأول!");
        createUserWithEmailAndPassword(auth, email, pass).then(res => {
            set(ref(db, `users/${res.user.uid}`), { username: name, email: email });
            window.closeModals();
        }).catch(e => alert("فشل التسجيل: " + e.message));
    } else {
        signInWithEmailAndPassword(auth, email, pass).then(window.closeModals).catch(e => alert("بيانات خطأ!"));
    }
};

// وظائف عامة للمودالات
window.deleteMsg = (id) => { if(confirm("حذف الرسالة نهائياً؟")) remove(ref(db, `messages/${id}`)); };
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
