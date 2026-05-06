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

// 1. مراقبة حالة المستخدم (تعديل لضمان جلب البيانات)
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
        
        // جلب البيانات فوراً وتحديث الواجهة
        const userRef = ref(db, 'users/' + user.uid);
        const snapshot = await get(userRef);
        currentUserData = snapshot.val() || { username: "عضو جديد", lastUpdate: 0 };
        userInfo.innerText = "أهلاً، " + currentUserData.username;
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

// 2. وظائف التسجيل والدخول
window.handleAuth = (type) => {
    const email = document.getElementById("email-input").value;
    const pass = document.getElementById("password-input").value;
    if (!email || !pass) return alert("من فضلك ادخل البيانات");

    if (type === 'login') {
        signInWithEmailAndPassword(auth, email, pass).then(window.closeModals).catch(err => alert("خطأ: " + err.message));
    } else {
        createUserWithEmailAndPassword(auth, email, pass).then(async (res) => {
            const initialName = "User_" + Math.floor(Math.random()*1000);
            await set(ref(db, 'users/' + res.user.uid), { username: initialName, lastUpdate: 0 });
            window.closeModals();
        }).catch(err => alert("خطأ: " + err.message));
    }
};

// 3. وظيفة تعديل الاسم (كانت ناقصة عندك)
document.getElementById("save-username-btn").onclick = async () => {
    const newName = document.getElementById("username-input").value.trim();
    if (!newName) return alert("اكتب اسم أولاً");

    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    if (currentUserData && (now - currentUserData.lastUpdate < oneDay)) {
        const hoursLeft = Math.ceil((oneDay - (now - currentUserData.lastUpdate)) / (1000 * 60 * 60));
        return alert(`تقدر تغير اسمك كمان ${hoursLeft} ساعة`);
    }

    try {
        await update(ref(db, 'users/' + auth.currentUser.uid), {
            username: newName,
            lastUpdate: now
        });
        currentUserData.username = newName;
        currentUserData.lastUpdate = now;
        document.getElementById("user-info").innerText = "أهلاً، " + newName;
        alert("تم تحديث الاسم!");
        window.closeModals();
    } catch (e) {
        alert("فشل التحديث");
    }
};

// 4. وظيفة إرسال الرسائل
window.sendMessage = () => {
    const input = document.getElementById("message-input");
    const isAdmin = localStorage.getItem("adminKey") === "omar_admin_77";
    if (input.value.trim() && auth.currentUser && currentUserData) {
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

// 5. عرض الرسائل وحذفها
onChildAdded(messagesRef, (data) => {
    const chatBox = document.getElementById("chat-box");
    const msg = data.val();
    const div = document.createElement("div");
    div.classList.add("message");
    div.id = data.key;
    
    const isMe = auth.currentUser && msg.senderId === auth.currentUser.uid;
    div.classList.add(isMe ? "my-message" : "others-message");

    const isAdmin = localStorage.getItem("adminKey") === "omar_admin_77";
    const deleteBtn = isAdmin ? `<button onclick="window.deleteMessage('${data.key}')" style="color:red; background:none; border:none; cursor:pointer; font-size:10px; margin-right:5px;">[X]</button>` : "";

    const roleColor = msg.role && msg.role.includes("Admin") ? "#ff9800" : "#ffffff";

    div.innerHTML = `
        <div style="font-size:10px; color:${roleColor}; font-weight:bold">${msg.senderName} (${msg.role || 'User'})</div>
        <div style="margin:5px 0; font-size:15px;">${msg.text}</div>
        <div style="font-size:9px; opacity:0.6; display:flex; justify-content:space-between; border-top:1px solid rgba(255,255,255,0.1); padding-top:3px;">
            <span>${new Date(msg.time).toLocaleTimeString('ar-EG')}</span>
            ${deleteBtn}
        </div>
    `;
    chatBox.appendChild(div);
    window.scrollTo(0, document.body.scrollHeight);
});

window.deleteMessage = (id) => { if(confirm("هل تريد الحذف؟")) remove(ref(db, "messages/" + id)); };
onChildRemoved(messagesRef, (data) => document.getElementById(data.key)?.remove());

// 6. التحكم في النوافذ (Modals)
window.openAuthModal = () => { document.getElementById("auth-modal").style.display = "flex"; };
document.getElementById("profile-btn").onclick = () => { document.getElementById("profile-modal").style.display = "flex"; };
window.closeModals = () => {
    document.getElementById("auth-modal").style.display = "none";
    document.getElementById("profile-modal").style.display = "none";
};
