import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onChildAdded, remove, onChildRemoved, set, get, update, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- إعدادات Firebase (نفس إعداداتك) ---
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
const usersRef = ref(db, "users");

// --- إعدادات Cloudinary (تذكر استبدالها) ---
const CLOUD_NAME = ""; 
const UPLOAD_PRESET = "Real-one"; 
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;

const ADMIN_EMAIL = "o6003558@gmail.com"; 
let allMessages = {}; // لتخزين الرسايل وبناء قائمة الوسائط

// --- [ليفل الوحش] نظام الألوان الشخصية (localStorage) ---
let userPrefs = JSON.parse(localStorage.getItem('chatSettings')) || {
    myColor: "#005c4b",
    othersColor: "#202c33"
};

window.saveColors = () => {
    userPrefs.myColor = document.getElementById('my-msg-color').value;
    userPrefs.othersColor = document.getElementById('others-msg-color').value;
    localStorage.setItem('chatSettings', JSON.stringify(userPrefs));
    location.reload(); // إعادة تحميل لتطبيق الألوان على كل الشات
};

window.resetColors = () => {
    localStorage.removeItem('chatSettings');
    location.reload();
};

// --- نظام تسجيل الدخول ---
onAuthStateChanged(auth, (user) => {
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
        onValue(ref(db, 'users/' + user.uid), (snapshot) => {
            let data = snapshot.val() || { username: "عضو جديد" };
            userInfo.innerHTML = `أهلاً، ${data.username} ${user.email === ADMIN_EMAIL ? "👑" : ""}`;
        });
    } else {
        inputArea.style.display = "none";
        loginNotice.style.display = "block";
        authBtn.innerText = "دخول";
        userInfo.innerText = "زائر";
    }
});

// --- وظيفة الرفع والارسال ---
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
                senderId: auth.currentUser.uid,
                senderEmail: auth.currentUser.email,
                text: document.getElementById("message-input").value,
                fileUrl: data.secure_url,
                fileName: file.name,
                fileType: file.type.startsWith('image/') ? 'image' : 'file',
                time: Date.now()
            });
            document.getElementById("message-input").value = "";
        }
    } catch (err) { alert("خطأ في الرفع"); }
};

window.sendMessage = () => {
    const input = document.getElementById("message-input");
    if (input.value.trim() && auth.currentUser) {
        push(messagesRef, {
            senderId: auth.currentUser.uid,
            senderEmail: auth.currentUser.email,
            text: input.value,
            time: Date.now()
        });
        input.value = "";
    }
};

// --- عرض الرسايل وبناء قائمة الوسائط ---
onChildAdded(messagesRef, (data) => {
    const msg = data.val();
    const msgId = data.key;
    allMessages[msgId] = msg; // حفظ في الذاكرة المؤقتة
    renderMessage(msgId, msg);
    updateMediaList();
});

onChildRemoved(messagesRef, (data) => {
    document.getElementById(data.key)?.remove();
    delete allMessages[data.key];
    updateMediaList();
});

function renderMessage(id, msg) {
    const chatBox = document.getElementById("chat-box");
    const isMe = auth.currentUser && msg.senderId === auth.currentUser.uid;
    const div = document.createElement("div");
    div.className = `message ${isMe ? "my-message" : "others-message"}`;
    div.id = id;

    // تطبيق الألوان من الـ localStorage
    div.style.backgroundColor = isMe ? userPrefs.myColor : userPrefs.othersColor;

    onValue(ref(db, 'users/' + msg.senderId), (snapshot) => {
        const uName = snapshot.val()?.username || "مستخدم";
        let mediaHtml = "";
        if (msg.fileUrl) {
            if (msg.fileType === 'image') {
                mediaHtml = `<img src="${msg.fileUrl}" style="max-width:100%; border-radius:8px;" onclick="window.open('${msg.fileUrl}')">`;
            } else {
                mediaHtml = `<div class="file-box"><a href="${msg.fileUrl}" target="_blank">📄 ${msg.fileName}</a></div>`;
            }
        }

        div.innerHTML = `
            <small style="display:block; font-weight:bold; opacity:0.8; margin-bottom:5px;">${uName}</small>
            ${mediaHtml}
            <div>${msg.text || ""}</div>
            <div style="font-size:9px; text-align:left; opacity:0.5; margin-top:5px;">
                ${new Date(msg.time).toLocaleTimeString('ar-EG')}
                ${auth.currentUser?.email === ADMIN_EMAIL ? `<span onclick="deleteMsg('${id}')" style="color:red; cursor:pointer; margin-right:10px;">[حذف]</span>` : ""}
            </div>
        `;
    });
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// --- [ليفل الوحش] تحديث قائمة الوسائط والروابط ---
function updateMediaList() {
    const imgCont = document.getElementById('media-images');
    const fileCont = document.getElementById('media-files');
    const linkCont = document.getElementById('media-links');
    
    imgCont.innerHTML = ''; fileCont.innerHTML = ''; linkCont.innerHTML = '';

    Object.keys(allMessages).forEach(id => {
        const m = allMessages[id];
        
        // صور
        if (m.fileUrl && m.fileType === 'image') {
            imgCont.innerHTML += `<img src="${m.fileUrl}" onclick="window.open('${m.fileUrl}')" class="media-thumb">`;
        }
        // ملفات
        else if (m.fileUrl && m.fileType === 'file') {
            fileCont.innerHTML += `<div class="media-item"><a href="${m.fileUrl}" target="_blank">📄 ${m.fileName}</a></div>`;
        }
        
        // روابط (نبحث عن http في النص)
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        if (m.text && m.text.match(urlRegex)) {
            const links = m.text.match(urlRegex);
            links.forEach(link => {
                linkCont.innerHTML += `<div class="media-item"><a href="${link}" target="_blank">🔗 ${link}</a></div>`;
            });
        }
    });
}

// --- وظائف عامة ---
window.deleteMsg = (id) => { if(confirm("حذف؟")) remove(ref(db, "messages/" + id)); };
window.openAuthModal = () => document.getElementById("auth-modal").style.display = "flex";
window.closeModals = () => {
    document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
};
document.getElementById("settings-btn").onclick = () => {
    document.getElementById('my-msg-color').value = userPrefs.myColor;
    document.getElementById('others-msg-color').value = userPrefs.othersColor;
    document.getElementById("settings-modal").style.display = "flex";
};
document.getElementById("media-list-btn").onclick = () => document.getElementById("media-modal").style.display = "flex";

window.showTab = (tabId) => {
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).style.display = 'block';
    event.target.classList.add('active');
};

window.handleAuth = (type) => {
    const email = document.getElementById("email-input").value;
    const pass = document.getElementById("password-input").value;
    const name = document.getElementById("reg-username-input").value;
    if (type === 'signup') {
        createUserWithEmailAndPassword(auth, email, pass).then(res => {
            set(ref(db, 'users/' + res.user.uid), { username: name, email: email });
            window.closeModals();
        }).catch(err => alert(err.message));
    } else {
        signInWithEmailAndPassword(auth, email, pass).then(window.closeModals).catch(err => alert(err.message));
    }
};

document.getElementById("profile-btn").onclick = () => document.getElementById("profile-modal").style.display = "flex";
document.getElementById("save-username-btn").onclick = () => {
    const n = document.getElementById("username-input").value;
    if(n) update(ref(db, 'users/' + auth.currentUser.uid), { username: n });
    window.closeModals();
};
