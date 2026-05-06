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

let currentUserData = null; // لتخزين بيانات اليوزر الحالي (الاسم ووقت التغيير)

// --- 1. مراقبة حالة المستخدم ---
onAuthStateChanged(auth, async (user) => {
    const inputArea = document.getElementById("input-area");
    const loginNotice = document.getElementById("login-notice");
    const authBtn = document.getElementById("auth-btn");
    const profileBtn = document.getElementById("profile-btn");

    if (user) {
        // المستخدم مسجل دخول
        inputArea.style.display = "flex";
        loginNotice.style.display = "none";
        authBtn.innerText = "خروج";
        authBtn.onclick = () => signOut(auth);
        profileBtn.style.display = "inline-block";
        
        // جلب بيانات المستخدم من القاعدة
        const userRef = ref(db, 'users/' + user.uid);
        const snapshot = await get(userRef);
        currentUserData = snapshot.val() || { username: "مستخدم جديد", lastUpdate: 0 };
    } else {
        // مستخدم غير مسجل (زائر)
        inputArea.style.display = "none";
        loginNotice.style.display = "block";
        authBtn.innerText = "تسجيل دخول";
        authBtn.onclick = openAuthModal;
        profileBtn.style.display = "none";
        currentUserData = null;
    }
});

// --- 2. وظائف التسجيل والدخول ---
window.handleAuth = (type) => {
    const email = document.getElementById("email-input").value;
    const pass = document.getElementById("password-input").value;
    if (type === 'login') {
        signInWithEmailAndPassword(auth, email, pass).then(closeModals).catch(err => alert(err.message));
    } else {
        createUserWithEmailAndPassword(auth, email, pass).then(res => {
            // إنشاء بروفايل أولي
            set(ref(db, 'users/' + res.user.uid), { username: "User_" + Math.floor(Math.random()*1000), lastUpdate: 0 });
            closeModals();
        }).catch(err => alert(err.message));
    }
};

// --- 3. تغيير الـ Username (مرة كل 24 ساعة) ---
document.getElementById("save-username-btn").onclick = async () => {
    const newName = document.getElementById("username-input").value.trim();
    if (!newName) return;

    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000; // 24 ساعة بالملي ثانية

    if (now - currentUserData.lastUpdate < oneDay) {
        const remaining = Math.ceil((oneDay - (now - currentUserData.lastUpdate)) / (1000 * 60 * 60));
        alert(`عفواً! يمكنك تغيير اسمك مرة واحدة يومياً. انتظر ${remaining} ساعة تقريباً.`);
        return;
    }

    // تحديث في القاعدة
    await update(ref(db, 'users/' + auth.currentUser.uid), {
        username: newName,
        lastUpdate: now
    });
    
    currentUserData.username = newName;
    currentUserData.lastUpdate = now;
    alert("تم تغيير الاسم بنجاح!");
    closeModals();
};

// --- 4. وظيفة إرسال الرسائل (المطورة) ---
window.sendMessage = function() {
    const input = document.getElementById("message-input");
    const isAdmin = localStorage.getItem("adminKey") === "omar_admin_77";
    
    if (input.value.trim() !== "" && auth.currentUser) {
        push(messagesRef, {
            senderId: auth.currentUser.uid,
            senderName: currentUserData.username, // نستخدم الاسم المخزن في القاعدة
            text: input.value,
            time: Date.now(),
            role: isAdmin ? "Admin 👑" : "User 👤" 
        });
        input.value = "";
    }
};
document.getElementById("send-btn").onclick = sendMessage;

// --- 5. عرض الرسائل (كما هي مع استخدام senderName) ---
onChildAdded(messagesRef, (data) => {
    const chatBox = document.getElementById("chat-box");
    const msgData = data.val();
    const msgId = data.key;
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("message");
    msgDiv.id = msgId;

    const myUID = auth.currentUser ? auth.currentUser.uid : 'guest';
    msgDiv.classList.add(msgData.senderId === myUID ? "my-message" : "others-message");

    const dateObj = new Date(msgData.time || Date.now());
    const timeStr = dateObj.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    
    const isAdmin = localStorage.getItem("adminKey") === "omar_admin_77";
    let deleteBtn = isAdmin ? `<button onclick="deleteMessage('${msgId}')" style="color:red; border:none; background:none; cursor:pointer; font-size:10px;">[مسح]</button>` : "";

    msgDiv.innerHTML = `
        <div style="font-size: 11px; font-weight: bold; color: ${msgData.role.includes("Admin") ? "#ff9800" : "#ffffff"};">
            ${msgData.senderName} (${msgData.role})
        </div>
        <div style="font-size: 15px; margin: 5px 0; word-wrap: break-word;">${msgData.text}</div>
        <div style="font-size: 10px; color: #ddd; display: flex; justify-content: space-between;">
            <span>${timeStr}</span>
            ${deleteBtn}
        </div>
    `;

    chatBox.appendChild(msgDiv);
    window.scrollTo(0, document.body.scrollHeight);
});

// نافذة التحكم
window.openAuthModal = () => document.getElementById("auth-modal").style.display = "flex";
document.getElementById("profile-btn").onclick = () => document.getElementById("profile-modal").style.display = "flex";
window.closeModals = () => {
    document.getElementById("auth-modal").style.display = "none";
    document.getElementById("profile-modal").style.display = "none";
};

// وظيفة المسح (للأدمن)
window.deleteMessage = function(id) {
  if (confirm("هل تريد مسح هذه الرسالة نهائياً؟")) {
      remove(ref(db, "messages/" + id));
  }
};
onChildRemoved(messagesRef, (data) => document.getElementById(data.key)?.remove());
