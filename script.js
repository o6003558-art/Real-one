import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onChildAdded, remove, onChildRemoved, set, get, update, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- 1. إعدادات Firebase ---
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

// --- 2. إعدادات Cloudinary (تأكد من تغيير هذه القيم) ---
const CLOUD_NAME = "dmrcz5jbh"; 
const UPLOAD_PRESET = "Real-one"; 
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;

// --- 3. إعدادات الأدمن ---
const ADMIN_EMAIL = "o6003558@gmail.com"; 

let currentUserData = null;

// مراقبة حالة تسجيل الدخول وتحديث الواجهة
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

// --- 4. وظيفة الرفع لـ Cloudinary ---
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

// إرسال رسالة نصية عادية
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

// دالة التحميل البرمجي (لإجبار المتصفح على تحميل الملف بدلاً من فتحه)
window.downloadMedia = async (url, filename) => {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename || 'download';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
        window.open(url, '_blank'); // fallback لو حصل مشكلة في الـ fetch
    }
};

// --- 5. عرض الرسائل في الشات ---
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

        let mediaHtml = "";
        if (msg.fileUrl) {
            if (msg.fileType === 'image') {
                mediaHtml = `
                    <img src="${msg.fileUrl}" style="max-width:100%; border-radius:10px; margin-bottom:5px; cursor:pointer;" onclick="window.open('${msg.fileUrl}')">
                    <button class="download-btn" onclick="window.downloadMedia('${msg.fileUrl}', '${msg.fileName}')">
                        📥 حفظ الصورة
                    </button>
                `;
            } else {
                mediaHtml = `
                    <div style="background:rgba(255,255,255,0.1); padding:10px; border-radius:8px; margin-bottom:5px;">
                        <span style="display:block; font-size:12px; margin-bottom:5px;">📄 ${msg.fileName}</span>
                        <button class="download-btn" onclick="window.downloadMedia('${msg.fileUrl}', '${msg.fileName}')">
                            📥 تحميل الملف
                        </button>
                    </div>
                `;
            }
        }

        let textHtml = msg.text ? `<div style="font-size:15px; margin:5px 0;">${msg.text}</div>` : "";

        div.innerHTML = `
            <div style="font-size:10px; font-weight:bold; color: ${isMsgFromAdmin ? '#ffeb3b' : '#fff'}; margin-bottom:4px;">
                ${displayName} ${isMsgFromAdmin ? '[Admin]' : ''}
            </div>
            ${mediaHtml}
            ${textHtml}
            <div style="font-size:9px; opacity:0.6; display:flex; justify-content:space-between; margin-top:5px;">
                <span>${new Date(msg.time).toLocaleTimeString('ar-EG')}</span>
                ${amIAdmin ? `<button onclick="window.deleteMessage('${msgId}')" style="color:#ff4d4d; background:none; border:none; cursor:pointer; font-weight:bold;">[حذف]</button>` : ""}
            </div>
        `;
    });
    chatBox.appendChild(div);
    window.scrollTo(0, document.body.scrollHeight);
});

// --- 6. وظائف الحساب والمنبثقات ---
window.handleAuth = (type) => {
    const email = document.getElementById("email-input").value;
    const pass = document.getElementById("password-input").value;
    const regName = document.getElementById("reg-username-input")?.value.trim();

    if (type === 'signup') {
        if (!regName) return alert("الاسم مطلوب للتسجيل!");
        createUserWithEmailAndPassword(auth, email, pass).then(res => {
            set(ref(db, 'users/' + res.user.uid), { username: regName, email: email, joinDate: Date.now() });
            window.closeModals();
        }).catch(err => alert("خطأ: " + err.message));
    } else {
        signInWithEmailAndPassword(auth, email, pass).then(window.closeModals).catch(err => alert("خطأ: " + err.message));
    }
};

window.deleteMessage = (id) => { if(confirm("هل تريد حذف هذه الرسالة؟")) remove(ref(db, "messages/" + id)); };
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
