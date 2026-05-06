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

// --- حدد إيميل الأدمن هنا ---
const ADMIN_EMAIL = "o6003558@gmail.com"; // غير ده لإيميلك الحقيقي اللي بتسجل بيه

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
        
        const userRef = ref(db, 'users/' + user.uid);
        onValue(userRef, (snapshot) => {
            currentUserData = snapshot.val() || { username: "عضو جديد", lastUpdate: 0 };
            userInfo.innerText = "أهلاً، " + currentUserData.username + (user.email === ADMIN_EMAIL ? " (Admin)" : "");
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
    
    const isMe = auth.currentUser && msg.senderId === auth.currentUser.uid;
    div.classList.add(isMe ? "my-message" : "others-message");

    // ربط اسم المستخدم بشكل حي (Dynamic)
    const userRef = ref(db, 'users/' + msg.senderId);
    onValue(userRef, (snapshot) => {
        const userData = snapshot.val();
        const displayName = userData ? userData.username : "مستخدم سابق";
        
        // جلب بيانات المستخدم لمعرفة هل هو أدمن (بناءً على الإيميل من قاعدة البيانات أو لو كان هو أنت)
        // ملاحظة: لضمان الدقة، الأدمن بيتحدد هنا بناءً على صلاحيتك أنت كـ Viewer
        const amIAdmin = auth.currentUser && auth.currentUser.email === ADMIN_EMAIL;
        const deleteBtn = amIAdmin ? `<button onclick="window.deleteMessage('${msgId}')" style="color:red; background:none; border:none; cursor:pointer; font-size:10px;">[مسح]</button>` : "";

        div.innerHTML = `
            <div style="font-size:10px; font-weight:bold; color: ${isMe ? '#ffeb3b' : '#fff'}">
                ${displayName} ${amIAdmin && isMe ? '(Admin)' : ''}
            </div>
            <div style="margin:5px 0; font-size:15px;">${msg.text}</div>
            <div style="font-size:9px; opacity:0.6; display:flex; justify-content:space-between">
                <span>${new Date(msg.time).toLocaleTimeString('ar-EG')}</span>
                ${deleteBtn}
            </div>
        `;
    });

    chatBox.appendChild(div);
    window.scrollTo(0, document.body.scrollHeight);
});

// باقي الدوال (Auth, Modals, Delete) تبقى كما هي مع التأكد من إضافة window.
window.handleAuth = (type) => {
    const email = document.getElementById("email-input").value;
    const pass = document.getElementById("password-input").value;
    if (type === 'login') {
        signInWithEmailAndPassword(auth, email, pass).then(window.closeModals).catch(err => alert(err.message));
    } else {
        createUserWithEmailAndPassword(auth, email, pass).then(res => {
            set(ref(db, 'users/' + res.user.uid), { username: "User_" + Math.floor(Math.random()*100), lastUpdate: 0 });
            window.closeModals();
        }).catch(err => alert(err.message));
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

document.getElementById("save-username-btn").onclick = async () => {
    const newName = document.getElementById("username-input").value.trim();
    if (!newName) return;
    await update(ref(db, 'users/' + auth.currentUser.uid), { username: newName, lastUpdate: Date.now() });
    window.closeModals();
};
