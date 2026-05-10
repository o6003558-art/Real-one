import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onChildAdded, remove, onChildRemoved, set, get, update, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- إعدادات Firebase ---
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

// --- ⚠️ إعدادات Cloudinary (بديل الفيزا) ⚠️ ---
const CLOUD_NAME = "dmrcz5jbh"; // ضع اسم الكلاود هنا
const UPLOAD_PRESET = "Real-one"; // ضع الـ Preset المفتوح هنا
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;

// --- إعدادات الأدمن ---
const ADMIN_EMAIL = "o6003558@gmail.com"; 

let currentUserData = null;

// مراقبة حالة تسجيل الدخول
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
        
        onValue(ref(db, 'users/' + user.uid), (snapshot) => {
            currentUserData = snapshot.val() || { username: "عضو جديد" };
            let adminTag = (user.email === ADMIN_EMAIL) ? " <span style='color:#ff9800'>(Admin 👑)</span>" : "";
            userInfo.innerHTML = `أهلاً، ${currentUserData.username} ${adminTag}`;
        });
    } else {
        inputArea.style.display = "none";
        loginNotice.style.display = "block";
        authBtn.innerText = "دخول";
        authBtn.onclick = () => window.openAuthModal();
        profileBtn.style.display = "none";
        userInfo.innerText = "زائر";
        currentUserData = null;
    }
});

// --- وظيفة الرفع (Cloudinary) ---
window.uploadFile = async (e) => {
    const file = e.target.files[0];
    if (!file || !auth.currentUser) return;

    const inputMsg = document.getElementById("message-input");
    const originalPlaceholder = inputMsg.placeholder;
    inputMsg.placeholder = "جاري رفع الملف... ⏳";
    inputMsg.disabled = true;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    try {
        const response = await fetch(CLOUDINARY_URL, { method: "POST", body: formData });
        const data = await response.json();

        if (data.secure_url) {
            const isImage = file.type.startsWith('image/');
            push(messagesRef, {
                senderId: auth.currentUser.uid,
                senderEmail: auth.currentUser.email,
                text: inputMsg.value,
                fileUrl: data.secure_url,
                fileName: file.name,
                fileType: isImage ? 'image' : 'file',
                time: Date.now()
            });
            inputMsg.value = "";
        }
    } catch (error) {
        alert("خطأ في الرفع: " + error.message);
    } finally {
        inputMsg.placeholder = originalPlaceholder;
        inputMsg.disabled = false;
        e.target.value = ""; 
    }
};

// إرسال رسالة نصية
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

// استقبال الرسايل وعرضها
onChildAdded(messagesRef, (data) => {
    const chatBox = document.getElementById("chat-box");
    const msg = data.val();
    const msgId = data.key;
    const div = document.createElement("div");
    div.className = `message ${auth.currentUser && msg.senderId === auth.currentUser.uid ? "my-message" : "others-message"}`;
    div.id = msgId;

    onValue(ref(db, 'users/' + msg.senderId), (snapshot) => {
        const userData = snapshot.val();
        const displayName = userData ? userData.username : "مستخدم";
        const amIAdmin = auth.currentUser?.email === ADMIN_EMAIL;
        const isMsgFromAdmin = msg.senderEmail === ADMIN_EMAIL;

        let content = "";
        if (msg.fileUrl) {
            if (msg.fileType === 'image') {
                content += `<img src="${msg.fileUrl}" style="max-width:100%; border-radius:10px; margin-bottom:5px; display:block;" onclick="window.open('${msg.fileUrl}')">`;
            } else {
                content += `<div style="background:rgba(0,0,0,0.1); padding:8px; border-radius:5px;"><a href="${msg.fileUrl}" target="_blank" style="color:#007bff; text-decoration:none;">📄 ملف: ${msg.fileName}</a></div>`;
            }
        }
        if (msg.text) content += `<div>${msg.text}</div>`;

        div.innerHTML = `
            <div style="font-size:10px; font-weight:bold; color: ${isMsgFromAdmin ? '#ffeb3b' : '#fff'}">
                ${displayName} ${isMsgFromAdmin ? '[Admin]' : ''}
            </div>
            <div style="margin:5px 0;">${content}</div>
            <div style="font-size:9px; opacity:0.6; display:flex; justify-content:space-between;">
                <span>${new Date(msg.time).toLocaleTimeString('ar-EG')}</span>
                ${amIAdmin ? `<button onclick="window.deleteMessage('${msgId}')" style="color:red; background:none; border:none; cursor:pointer;">[مسح]</button>` : ""}
            </div>
        `;
    });
    chatBox.appendChild(div);
    window.scrollTo(0, document.body.scrollHeight);
});

// وظائف تسجيل الدخول والحساب
window.handleAuth = (type) => {
    const email = document.getElementById("email-input").value;
    const pass = document.getElementById("password-input").value;
    const regName = document.getElementById("reg-username-input")?.value.trim();

    if (type === 'signup') {
        if (!regName) return alert("الاسم مطلوب للتسجيل!");
        createUserWithEmailAndPassword(auth, email, pass).then(res => {
            set(ref(db, 'users/' + res.user.uid), { username: regName, email: email, joinDate: Date.now() });
            window.closeModals();
        }).catch(err => alert(err.message));
    } else {
        signInWithEmailAndPassword(auth, email, pass).then(window.closeModals).catch(err => alert(err.message));
    }
};

window.deleteMessage = (id) => { if(confirm("حذف الرسالة؟")) remove(ref(db, "messages/" + id)); };
onChildRemoved(messagesRef, (data) => document.getElementById(data.key)?.remove());
window.openAuthModal = () => document.getElementById("auth-modal").style.display = "flex";
window.closeModals = () => {
    document.getElementById("auth-modal").style.display = "none";
    document.getElementById("profile-modal").style.display = "none";
};
document.getElementById("profile-btn").onclick = () => document.getElementById("profile-modal").style.display = "flex";
document.getElementById("save-username-btn").onclick = () => {
    const newName = document.getElementById("username-input").value.trim();
    if (newName) update(ref(db, 'users/' + auth.currentUser.uid), { username: newName });
    window.closeModals();
};
