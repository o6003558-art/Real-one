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
const usersRef = ref(db, "users");

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
        
        onValue(ref(db, 'users/' + user.uid), (snapshot) => {
            currentUserData = snapshot.val() || { username: "عضو جديد", lastUpdate: 0 };
            let adminTag = (user.email === ADMIN_EMAIL) ? " <span style='color:#ff9800'>(Admin 👑)</span>" : "";
            userInfo.innerHTML = `أهلاً، ${currentUserData.username} ${adminTag}`;
            
            // لو أدمن، اظهر زرار لمشاهدة قائمة المستخدمين في الكونسول (تجريبي)
            if(user.email === ADMIN_EMAIL) console.log("أنت الأدمن: يمكنك كتابة getAllUsers() في الكونسول لرؤية الجميع");
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

// --- وظيفة التسجيل مع إجبارية الـ Username ---
window.handleAuth = (type) => {
    const email = document.getElementById("email-input").value;
    const pass = document.getElementById("password-input").value;
    const regName = document.getElementById("reg-username-input").value.trim();

    if (type === 'signup') {
        if (!regName) {
            alert("لازم تختار username عشان تسجل!");
            return;
        }
        createUserWithEmailAndPassword(auth, email, pass).then(res => {
            set(ref(db, 'users/' + res.user.uid), { 
                username: regName, 
                email: email, // تخزين الإيميل للرجوع إليه
                lastUpdate: 0,
                joinDate: Date.now()
            });
            window.closeModals();
        }).catch(err => alert("خطأ في التسجيل: " + err.message));
    } else {
        signInWithEmailAndPassword(auth, email, pass).then(window.closeModals).catch(err => alert("خطأ: " + err.message));
    }
};

// --- وظائف الأدمن للتحكم في المستخدمين ---
// تقدر تنادي الدالة دي من الكونسول (F12) عشان تشوف كل الناس
window.getAllUsers = async () => {
    if (auth.currentUser?.email !== ADMIN_EMAIL) return console.log("غير مسموح لك");
    const snapshot = await get(usersRef);
    console.table(snapshot.val()); // هيعرضلك جدول فيه كل اليوزرز وبياناتهم
};

window.deleteUserFromDB = (uid) => {
    if (auth.currentUser?.email !== ADMIN_EMAIL) return;
    if (confirm("حذف هذا المستخدم نهائياً من قاعدة البيانات؟")) {
        remove(ref(db, 'users/' + uid));
        alert("تم الحذف من قاعدة البيانات بنجاح");
    }
};

// --- إرسال وعرض الرسايل (نفس الكود السابق مع تأمين الأدمن) ---
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

        div.innerHTML = `
            <div style="font-size:10px; font-weight:bold; color: ${isMsgFromAdmin ? '#ffeb3b' : '#fff'}">
                ${displayName} ${isMsgFromAdmin ? '[Admin]' : ''}
            </div>
            <div style="font-size:15px; margin:5px 0;">${msg.text}</div>
            <div style="font-size:9px; opacity:0.6; display:flex; justify-content:space-between;">
                <span>${new Date(msg.time).toLocaleTimeString('ar-EG')}</span>
                ${amIAdmin ? `<button onclick="window.deleteMessage('${msgId}')" style="color:red; background:none; border:none; cursor:pointer;">[حذف]</button>` : ""}
            </div>
        `;
    });
    chatBox.appendChild(div);
    window.scrollTo(0, document.body.scrollHeight);
});

window.deleteMessage = (id) => { if(confirm("حذف الرسالة؟")) remove(ref(db, "messages/" + id)); };
onChildRemoved(messagesRef, (data) => document.getElementById(data.key)?.remove());
window.openAuthModal = () => document.getElementById("auth-modal").style.display = "flex";
window.closeModals = () => {
    document.getElementById("auth-modal").style.display = "none";
    document.getElementById("profile-modal").style.display = "none";
};
document.getElementById("profile-btn").onclick = () => document.getElementById("profile-modal").style.display = "flex";

document.getElementById("save-username-btn").onclick = async () => {
    const newName = document.getElementById("username-input").value.trim();
    if (newName) {
        await update(ref(db, 'users/' + auth.currentUser.uid), { username: newName, lastUpdate: Date.now() });
        window.closeModals();
    }
};
