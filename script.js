import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

let GEMINI_API_KEY = ""; 
let isDemo = false;
let db, auth, currentUser;

// --- INITIALIZATION ---
try {
    let firebaseConfig;
    // Check if config was injected globally (useful for some build tools, though rare here)
    if (typeof __firebase_config !== 'undefined') {
        firebaseConfig = JSON.parse(__firebase_config);
        GEMINI_API_KEY = "";
        startFullMode(firebaseConfig);
    } else { throw new Error("No Config"); }
} catch (e) {
    // If no config found, show setup screen
    document.getElementById('loading-spinner').classList.add('hidden');
    document.getElementById('config-panel').classList.remove('hidden');
}

// --- SETUP FUNCTIONS ---

async function validateKey(key) {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${key}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: "Hi" }] }] })
        });
        return response.ok;
    } catch (e) { return false; }
}

window.handleSetup = async () => {
    const errorEl = document.getElementById('setup-error');
    const startBtn = document.getElementById('start-btn');
    const errorText = document.getElementById('error-text');
    
    errorEl.classList.add('hidden');
    const inputKey = document.getElementById('api-key-input').value.trim();
    const configStr = document.getElementById('firebase-config-input').value.trim();

    if (inputKey) {
        startBtn.disabled = true;
        startBtn.innerHTML = '<i data-lucide="loader-2" class="animate-spin w-5 h-5"></i> Checking Key...';
        lucide.createIcons();
        
        const isValid = await validateKey(inputKey);
        
        if (!isValid) {
            errorText.innerText = "Invalid Gemini API Key. Please check and try again.";
            errorEl.classList.remove('hidden');
            startBtn.disabled = false;
            startBtn.innerHTML = 'Enter MindCare <i data-lucide="arrow-right" class="w-5 h-5"></i>';
            lucide.createIcons();
            return;
        }
        GEMINI_API_KEY = inputKey;
    }

    if(configStr) {
        try { startFullMode(JSON.parse(configStr)); } 
        catch(e) { 
            errorText.innerText = "Invalid JSON Format in Firebase Config.";
            errorEl.classList.remove('hidden');
            startBtn.disabled = false;
            startBtn.innerHTML = 'Enter MindCare <i data-lucide="arrow-right" class="w-5 h-5"></i>';
            lucide.createIcons();
        }
    } else { 
        startDemoMode(); 
    }
};

function startFullMode(config) {
    try {
        const app = initializeApp(config);
        auth = getAuth(app);
        db = getFirestore(app);
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) { signInWithCustomToken(auth, __initial_auth_token); } 
        else { signInAnonymously(auth); }
        onAuthStateChanged(auth, (user) => {
            if (user) { currentUser = user; document.getElementById('loading-screen').classList.add('hidden'); initAppListeners(); }
        });
    } catch(e) { alert("Failed to connect to Firebase."); }
}

function startDemoMode() {
    isDemo = true;
    currentUser = { uid: 'demo-user' };
    document.getElementById('loading-screen').classList.add('hidden');
    if(localStorage.getItem('mindcare_chat')) chatMessages = JSON.parse(localStorage.getItem('mindcare_chat'));
    initAppListeners();
}

function initAppListeners() {
    listenToMoods();
    listenToChat();
    listenToMeditations();
    renderMoodSelector();
}

// --- UI / ROUTING ---

window.router = (viewId) => {
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.remove('text-teal-600', 'dark:text-teal-400', 'bg-teal-50', 'dark:bg-slate-700');
        el.classList.add('text-gray-500', 'dark:text-gray-400', 'hover:text-gray-900', 'dark:hover:text-gray-200');
    });
    const activeBtn = document.getElementById(`nav-${viewId}`);
    if(activeBtn) {
        activeBtn.classList.add('text-teal-600', 'dark:text-teal-400', 'bg-teal-50', 'dark:bg-slate-700');
        activeBtn.classList.remove('text-gray-500', 'dark:text-gray-400');
    }
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById(`view-${viewId}`);
    if(target) { target.classList.remove('hidden'); target.classList.add('animate-fade-in'); }
    lucide.createIcons();
};

window.toggleDarkMode = () => {
    const html = document.documentElement;
    const isDark = html.classList.toggle('dark');
    lucide.createIcons();
}

// --- MOOD TRACKING ---

const moodOptions = [
    { value: 'great', label: 'Great', icon: 'sun', color: 'bg-orange-400' },
    { value: 'good', label: 'Good', icon: 'smile', color: 'bg-teal-400' },
    { value: 'okay', label: 'Okay', icon: 'meh', color: 'bg-blue-400' },
    { value: 'bad', label: 'Bad', icon: 'frown', color: 'bg-indigo-400' },
    { value: 'awful', label: 'Rough', icon: 'cloud-rain', color: 'bg-slate-500' },
];

window.saveMood = async (value) => {
    if(!currentUser) return;
    const log = { value, createdAt: isDemo ? new Date() : serverTimestamp(), note: '' };
    if(isDemo) {
        let logs = JSON.parse(localStorage.getItem('mindcare_moods') || "[]");
        logs.unshift(log);
        localStorage.setItem('mindcare_moods', JSON.stringify(logs));
        renderMoodSelector(true);
        updateJournalUI(logs);
    } else {
        try { await addDoc(collection(db, 'artifacts', 'mindcare-v1', 'users', currentUser.uid, 'moods'), log); } catch(e) {}
    }
};

function listenToMoods() {
    if(isDemo) {
        let logs = JSON.parse(localStorage.getItem('mindcare_moods') || "[]");
        logs = logs.map(l => ({...l, createdAt: new Date(l.createdAt)}));
        const isToday = logs[0] && logs[0].createdAt.toDateString() === new Date().toDateString();
        renderMoodSelector(isToday);
        document.getElementById('streak-count').innerText = logs.length;
        updateJournalUI(logs);
    } else {
        const q = query(collection(db, 'artifacts', 'mindcare-v1', 'users', currentUser.uid, 'moods'), orderBy('createdAt', 'desc'), limit(20));
        onSnapshot(q, (snapshot) => {
            const logs = snapshot.docs.map(doc => doc.data());
            renderMoodSelector(logs[0] && logs[0].createdAt?.toDate().toDateString() === new Date().toDateString());
            document.getElementById('streak-count').innerText = snapshot.docs.length;
            updateJournalUI(logs);
        });
    }
}

function renderMoodSelector(hasCheckedIn = false) {
    const container = document.getElementById('mood-container');
    if (hasCheckedIn) {
        container.innerHTML = `<div class="text-center py-8"><div class="inline-block p-4 rounded-full bg-teal-50 dark:bg-teal-900 text-teal-600 dark:text-teal-300 mb-4"><i data-lucide="sun" class="w-12 h-12"></i></div><h3 class="text-xl font-bold text-gray-800 dark:text-gray-100">Check-in Complete!</h3><p class="text-gray-500 dark:text-gray-400 mb-6">You're doing great.</p><button onclick="router('chat')" class="bg-teal-600 text-white px-8 py-3 rounded-full font-bold hover:bg-teal-700 transition">Chat with Serene</button></div>`;
    } else {
        let html = '<div class="grid grid-cols-5 gap-2">';
        moodOptions.forEach(opt => {
            html += `<button onclick="saveMood('${opt.value}')" class="flex flex-col items-center p-4 rounded-2xl bg-gray-50 dark:bg-slate-900 text-gray-400 dark:text-gray-500 hover:bg-white dark:hover:bg-slate-700 hover:shadow-md transition-all duration-300 hover:scale-105 active:scale-95"><i data-lucide="${opt.icon}" class="w-8 h-8 mb-2"></i><span class="text-xs font-bold uppercase tracking-wider">${opt.label}</span></button>`;
        });
        html += '</div>';
        container.innerHTML = html;
    }
    lucide.createIcons();
}

function updateJournalUI(logs) {
    const list = document.getElementById('journal-list');
    if(logs.length === 0) { list.innerHTML = `<div class="col-span-full text-center py-12 text-gray-400"><p>No entries yet.</p></div>`; return; }
    list.innerHTML = logs.map(log => {
        const opt = moodOptions.find(o => o.value === log.value) || moodOptions[2];
        const date = log.createdAt instanceof Date ? log.createdAt.toLocaleDateString() : (log.createdAt ? log.createdAt.toDate().toLocaleDateString() : 'Just now');
        return `<div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm flex items-center justify-between animate-fade-in"><div class="flex items-center gap-4"><div class="w-12 h-12 rounded-full bg-gray-50 dark:bg-slate-700 flex items-center justify-center"><i data-lucide="${opt.icon}" class="${opt.color.replace('bg-', 'text-').replace('400', '500')} w-6 h-6"></i></div><div><p class="font-bold text-gray-800 dark:text-gray-200 capitalize text-lg">${log.value}</p><p class="text-sm text-gray-400 flex items-center gap-1"><i data-lucide="calendar" class="w-3 h-3"></i> ${date}</p></div></div></div>`;
    }).join('');
    lucide.createIcons();
}

// --- CHAT LOGIC ---

let chatMessages = [];
function listenToChat() {
    if(isDemo) { renderChat(); } else {
        const q = query(collection(db, 'artifacts', 'mindcare-v1', 'users', currentUser.uid, 'chat'), orderBy('createdAt', 'asc'), limit(50));
        onSnapshot(q, (snapshot) => { chatMessages = snapshot.docs.map(doc => doc.data()); renderChat(); });
    }
}

window.sendMessage = async () => {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if(!text || !currentUser) return;
    input.value = '';
    const userMsg = { text, role: 'user', createdAt: new Date() };
    
    if(isDemo) {
        chatMessages.push(userMsg);
        localStorage.setItem('mindcare_chat', JSON.stringify(chatMessages));
        renderChat();
        document.getElementById('typing-indicator').classList.remove('hidden');
        const replyText = await generateAIResponse(text);
        setTimeout(() => {
            chatMessages.push({ text: replyText, role: 'assistant', createdAt: new Date() });
            localStorage.setItem('mindcare_chat', JSON.stringify(chatMessages));
            document.getElementById('typing-indicator').classList.add('hidden');
            renderChat();
        }, 800);
    } else {
        await addDoc(collection(db, 'artifacts', 'mindcare-v1', 'users', currentUser.uid, 'chat'), { text, role: 'user', createdAt: serverTimestamp() });
        document.getElementById('typing-indicator').classList.remove('hidden');
        const reply = await generateAIResponse(text);
        await addDoc(collection(db, 'artifacts', 'mindcare-v1', 'users', currentUser.uid, 'chat'), { text: reply, role: 'assistant', createdAt: serverTimestamp() });
        document.getElementById('typing-indicator').classList.add('hidden');
    }
};

function renderChat() {
    const container = document.getElementById('chat-messages');
    if(chatMessages.length === 0) {
        container.innerHTML = `<div class="text-center text-gray-400 mt-20 animate-fade-in"><div class="w-20 h-20 bg-teal-50 dark:bg-teal-900 rounded-full flex items-center justify-center mx-auto mb-4"><i data-lucide="message-circle" class="text-teal-300 dark:text-teal-600 w-10 h-10"></i></div><p class="text-lg font-medium">Say hello to Serene.</p></div>`;
    } else {
        container.innerHTML = chatMessages.map(msg => {
            const isUser = msg.role === 'user';
            const safeText = msg.text ? msg.text.replace(/'/g, "\\'") : "";
            return `<div class="flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in group"><div class="flex items-end gap-2 max-w-[85%]">${!isUser ? `<button onclick="playMessageAudio('${safeText}')" class="mb-2 opacity-50 hover:opacity-100 transition p-2 bg-gray-100 dark:bg-slate-700 rounded-full text-teal-600 dark:text-teal-400"><i data-lucide="volume-2" class="w-4 h-4"></i></button>` : ''}<div class="p-5 rounded-2xl text-base leading-relaxed shadow-sm ${isUser ? 'bg-teal-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-slate-600 rounded-tl-none'}">${msg.text}</div></div></div>`;
        }).join('');
    }
    container.scrollTop = container.scrollHeight;
    lucide.createIcons();
}

window.handleEnter = (e) => { if (e.key === 'Enter') window.sendMessage(); };

async function generateAIResponse(userMessage) {
    if(!GEMINI_API_KEY) return "Please add a Gemini API Key in Setup.";
    const historyText = chatMessages.slice(-5).map(msg => `${msg.role}: ${msg.text}`).join('\n');
    const systemPrompt = `You are 'Serene', a warm mental health companion. Keep answers concise (max 3 sentences).`;
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: `${systemPrompt}\n\n${historyText}\nUser: ${userMessage}\nSerene:` }] }] })
        });
        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm listening.";
    } catch(e) { return "Connection error."; }
}

// --- MEDITATION LOGIC ---

let timerInterval, timeLeft = 600, currentMeditationType = "", currentMeditationText = "";

window.selectMeditationType = async (type) => {
        currentMeditationType = type;
        document.getElementById('meditation-player').classList.add('hidden');
        document.getElementById('meditation-loading').classList.remove('hidden');
        clearInterval(timerInterval);
        timeLeft = 600;
        document.getElementById('timer-display').innerText = "10:00";
        document.getElementById('btn-start-timer').classList.remove('hidden');
        document.getElementById('btn-stop-timer').classList.add('hidden');

        if(!GEMINI_API_KEY) {
            setTimeout(() => {
                currentMeditationText = "Close your eyes. Breathe in deeply... count to four. Hold... count to four. Exhale... count to four.";
                setupMeditationUI(currentMeditationText, type);
            }, 1000);
        } else {
            const prompt = `Write a short meditation for ${type} in 50 words. Start with 'Close your eyes'.`;
            try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`, {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });
            const data = await res.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            setupMeditationUI(text || "Breathe.", type);
            } catch(e) { setupMeditationUI("Breathe deeply.", type); }
        }
}

function setupMeditationUI(text, type) {
    currentMeditationText = text;
    document.getElementById('meditation-title').innerText = type;
    document.getElementById('meditation-text').innerText = text;
    document.getElementById('meditation-loading').classList.add('hidden');
    document.getElementById('meditation-player').classList.remove('hidden');
}

window.startTimer = () => {
    document.getElementById('btn-start-timer').classList.add('hidden');
    document.getElementById('btn-stop-timer').classList.remove('hidden');
    timerInterval = setInterval(() => {
        timeLeft--;
        const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
        const s = (timeLeft % 60).toString().padStart(2, '0');
        document.getElementById('timer-display').innerText = `${m}:${s}`;
        if (timeLeft <= 0) { window.stopTimer(); }
    }, 1000);
};

window.stopTimer = async () => {
    clearInterval(timerInterval);
    document.getElementById('timer-display').innerText = "Finished";
    document.getElementById('btn-stop-timer').classList.add('hidden');
    const duration = 600 - timeLeft;
    if(duration > 5) { 
        const session = { type: currentMeditationType, duration: duration, createdAt: isDemo ? new Date() : serverTimestamp() };
        if(isDemo) {
            let history = JSON.parse(localStorage.getItem('mindcare_meditations') || "[]");
            history.unshift(session);
            localStorage.setItem('mindcare_meditations', JSON.stringify(history));
            renderMeditationHistory(history);
        } else {
            await addDoc(collection(db, 'artifacts', 'mindcare-v1', 'users', currentUser.uid, 'meditations'), session);
        }
    }
};

function listenToMeditations() {
    if(isDemo) {
            let history = JSON.parse(localStorage.getItem('mindcare_meditations') || "[]");
            renderMeditationHistory(history);
    } else {
        const q = query(collection(db, 'artifacts', 'mindcare-v1', 'users', currentUser.uid, 'meditations'), orderBy('createdAt', 'desc'), limit(5));
        onSnapshot(q, (snapshot) => { renderMeditationHistory(snapshot.docs.map(d => d.data())); });
    }
}

function renderMeditationHistory(list) {
    const container = document.getElementById('meditation-history-list');
    if(list.length === 0) { container.innerHTML = ""; return; }
    container.innerHTML = list.map(item => {
            const mins = Math.floor(item.duration / 60);
            const secs = item.duration % 60;
            return `<div class="text-xs bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 p-3 rounded-lg flex justify-between text-gray-600 dark:text-gray-300 shadow-sm"><span class="font-medium">${item.type}</span><span class="font-mono opacity-70">${mins}m ${secs}s</span></div>`;
    }).join('');
}

// --- UTILITIES ---

window.generateDailyQuote = async () => {
    if(!GEMINI_API_KEY) { document.getElementById('quote-content').innerHTML = "<p>Demo Quote: You are stronger than you know.</p>"; return; }
        try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: "Short philosophical quote. Format: Quote — Author." }] }] })
        });
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if(text) document.getElementById('quote-content').innerHTML = `<p class="text-2xl font-medium leading-snug">${text}</p>`;
        } catch(e) {}
};

window.playMessageAudio = (text) => {
    if (!text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9; 
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(voice => voice.name.includes("Female") || voice.name.includes("Google"));
    if (preferredVoice) utterance.voice = preferredVoice;
    window.speechSynthesis.speak(utterance);
};
window.playMeditationAudio = () => { if(currentMeditationText) window.playMessageAudio(currentMeditationText); };

// Initialize Icons on load
lucide.createIcons();

