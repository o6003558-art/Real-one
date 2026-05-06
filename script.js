import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onChildAdded, remove, onChildRemoved, set, get, update, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
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

// --- ⚠️ ضع إيميلك هنا بالظبط ⚠️ ---
const ADMIN_EMAIL = "o6003558@gmail.com"; 

let currentUserData = null;

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
        
        // مراقبة بيانات المستخدم الحالي
        const userRef = ref(db, 'users/' + user.uid);
        onValue(userRef, (snapshot) => {
            currentUserData = snapshot.val() || { username: "عضو جديد", lastUpdate: 0 };
            let adminTag = (user.email === ADMIN_EMAIL) ? " <span style='color:#ff9800'>(Admin 👑)</span>" : "";
            userInfo.innerHTML = "أهلاً، " + currentUserData.username + adminTag;
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

window.sendMessage = () => {
    const input = document.getElementById("message-input");
    if (input.value.trim() && auth.currentUser) {
        push(messagesRef, {
            senderId: auth.currentUser.uid,
            senderEmail: auth.currentUser.email, // بنخزن الإيميل للتأكد من هوية الأدمن لاحقاً
            text: input.value,
            time: Date.now()
        });
        input.value = "";
    }
};

onChildAdded(messagesRef, (data) => {
    const chatBox = document.getElementById("chat-box");
    const msg = data.val();
    const msgId = data.key;
    const div = document.createElement("div");
    div.classList.add("message");
    div.id = msgId;
    
    // تحديد الاتجاه: رسايلي أنا تظهر يمين (أو حسب ستايلك)
    const isMe = auth.currentUser && msg.senderId === auth.currentUser.uid;
    div.classList.add(isMe ? "my-message" : "others-message");

    // جلب اسم صاحب الرسالة "لايف" عشان لو غيره يتحدث فوراً
    const senderRef = ref(db, 'users/' + msg.senderId);
    onValue(senderRef, (snapshot) => {
        const userData = snapshot.val();
        const displayName = userData ? userData.username : "مستخدم";
        
        // فحص: هل الشخص اللي فاتح الموقع حالياً هو الأدمن؟
        const amIAdmin = auth.currentUser && auth.currentUser.email === ADMIN_EMAIL;
        
        // زرار المسح يظهر للأدمن فقط
        const deleteBtn = amIAdmin ? `<button onclick="window.deleteMessage('${msgId}')" style="color:#ff4444; background:none; border:none; cursor:pointer; font-size:11px; font-weight:bold; margin-right:10px;">[حذف]</button>` : "";

        // وسم الأدمن يظهر بجانب اسم الأدمن فقط في الشات
        const isMsgFromAdmin = msg.senderEmail === ADMIN_EMAIL;
        const adminBadge = isMsgFromAdmin ? " <span style='color:#ffeb3b; font-size:9px;'>[Admin]</span>" : "";

        div.innerHTML = `
            <div style="font-size:10px; font-weight:bold; margin-bottom:3px; color: ${isMsgFromAdmin ? '#ffeb3b' : '#fff'}">
                ${displayName}${adminBadge}
            </div>
            <div style="font-size:15px; margin-bottom:5px;">${msg.text}</div>
            <div style="font-size:9px; opacity:0.6; display:flex; justify-content:space-between; align-items:center;">
                <span>${new Date(msg.time).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}</span>
                ${deleteBtn}
            </div>
        `;
    });

    chatBox.appendChild(div);
    window.scrollTo(0, document.body.scrollHeight);
});

// دالة الحذف
window.deleteMessage = (id) => {
    if(confirm("هل أنت متأكد من حذف هذه الرسالة؟")) {
        remove(ref(db, "messages/" + id));
    }
};

onChildRemoved(messagesRef, (data) => {
    const el = document.getElementById(data.key);
    if(el) el.remove();
});

// باقي دوال الـ Auth والـ Modals
window.handleAuth = (type) => {
    const email = document.getElementById("email-input").value;
    const pass = document.getElementById("password-input").value;
    if (type === 'login') {
        signInWithEmailAndPassword(auth, email, pass).then(window.closeModals).catch(err => alert("خطأ: " + err.message));
    } else {
        createUserWithEmailAndPassword(auth, email, pass).then(res => {
            set(ref(db, 'users/' + res.user.uid), { username: "User_" + Math.floor(Math.random()*100), lastUpdate: 0 });
            window.closeModals();
        }).catch(err => alert("خطأ: " + err.message));
    }
};

window.openAuthModal = () => document.getElementById("auth-modal").style.display = "flex";
window.closeModals = () => {
    document.getElementById("auth-modal").style.display = "none";
    document.getElementById("profile-modal").style.display = "none";
};
document.getElementById("profile-btn").onclick = () => document.getElementById("profile-modal").style.display = "flex";

document.getElementById("save-username-btn").onclick = async () => {
    const newName = document.getElementById("username-input").value.trim();
    if (!newName) return;
    await update(ref(db, 'users/' + auth.currentUser.uid), { username: newName, lastUpdate: Date.now() });
    window.closeModals();
};
