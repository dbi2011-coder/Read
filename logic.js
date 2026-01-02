// logic.js - الإصدار النهائي (وجه كامل + سور كاملة)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getDatabase, ref, set, onValue, get } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

// 🔴🔴 استبدل هذا الجزء ببياناتك من موقع فايربيس 🔴🔴
const firebaseConfig = {
    apiKey: "AIzaSyD...", 
    authDomain: "....firebaseapp.com",
    databaseURL: "https://....firebasedatabase.app",
    projectId: "...",
    storageBucket: "...",
    messagingSenderId: "...",
    appId: "..."
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// قائمة السور الكاملة (114 سورة)
const surahNames = [
    "", "الفاتحة", "البقرة", "آل عمران", "النساء", "المائدة", "الأنعام", "الأعراف", "الأنفال", "التوبة", "يونس", 
    "هود", "يوسف", "الرعد", "إبراهيم", "الحجر", "النحل", "الإسراء", "الكهف", "مريم", "طه", 
    "الأنبياء", "الحج", "المؤمنون", "النور", "الفرقان", "الشعراء", "النمل", "القصص", "العنكبوت", "الروم", 
    "لقمان", "السجدة", "الأحزاب", "سبأ", "فاطر", "يس", "الصافات", "ص", "الزمر", "غافر", 
    "فصلت", "الشورى", "الزخرف", "الدخان", "الجاثية", "الأحقاف", "محمد", "الفتح", "الحجرات", "ق", 
    "الذاريات", "الطور", "النجم", "القمر", "الرحمن", "الواقعة", "الحديد", "المجادلة", "الحشر", "الممتحنة", 
    "الصف", "الجمعة", "المنافقون", "التغابن", "الطلاق", "التحريم", "الملك", "القلم", "الحاقة", "المعارج", 
    "نوح", "الجن", "المزمل", "المدثر", "القيامة", "الإنسان", "المرسلات", "النبأ", "النازعات", "عبس", 
    "التكوير", "الإنفطار", "المطففين", "الإنشقاق", "البروج", "الطارق", "الأعلى", "الغاشية", "الفجر", "البلد", 
    "الشمس", "الليل", "الضحى", "الشرح", "التين", "العلق", "القدر", "البينة", "الزلزلة", "العاديات", 
    "القارعة", "التكاثر", "العصر", "الهمزة", "الفيل", "قريش", "الماعون", "الكوثر", "الكافرون", "النصر", 
    "المسد", "الإخلاص", "الفلق", "الناس"
];

// دالة تصدير قائمة السور للصفحة
export function getSurahList() {
    return surahNames;
}

// --- الحسابات (تم إضافة الوجه الكامل) ---
function calculateVersesBlock(startFrom, amountType, amountValue) {
    let start = parseInt(startFrom); 
    let end = start;
    
    // تقدير عدد الآيات (تقريبي للمحاكاة)
    if (amountType === 'verses') {
        end = start + parseInt(amountValue) - 1;
    } else if (amountType === 'quarter') {
        end = start + 7;  // ربع وجه تقريبا 8 آيات
    } else if (amountType === 'half') {
        end = start + 14; // نصف وجه تقريبا 15 آية
    } else if (amountType === 'full') {
        end = start + 28; // وجه كامل تقريبا 29 آية
    }
    
    return { start, end, text: `من آية ${start} إلى ${end}` };
}

function recalculateQueueVerses(state) {
    if (!state.queue) state.queue = [];
    let nextStartVerse = state.settings.startVerse;

    if (state.currentReaderIndex >= 0 && state.queue[state.currentReaderIndex]) {
        nextStartVerse = state.queue[state.currentReaderIndex].endV + 1;
    } 

    for (let i = state.currentReaderIndex + 1; i < state.queue.length; i++) {
        const info = calculateVersesBlock(nextStartVerse, state.settings.amountType, state.settings.amountValue);
        state.queue[i].startV = info.start;
        state.queue[i].endV = info.end;
        state.queue[i].verses = info.text;
        nextStartVerse = info.end + 1;
    }
    return state;
}

// --- دوال الاستماع والتحديث ---
export function listenToData(callback) {
    const sessionRef = ref(db, 'session');
    onValue(sessionRef, (snapshot) => {
        const data = snapshot.val();
        if (data) callback(data);
    });
}

// --- دوال المشرف ---
export function checkAdminPass(input) {
    return input === "1234"; 
}

export function initSession(surah, startVerse, type, value) {
    const initialState = {
        settings: { surah, startVerse: parseInt(startVerse), amountType: type, amountValue: value },
        queue: [],
        currentReaderIndex: -1,
        isBookingStopped: false
    };
    set(ref(db, 'session'), initialState);
}

export function nextReader() {
    const sessionRef = ref(db, 'session');
    get(sessionRef).then((snapshot) => {
        let state = snapshot.val();
        if (state && state.queue && state.queue.length > state.currentReaderIndex + 1) {
            state.currentReaderIndex++;
            set(sessionRef, state);
        }
    });
}

export function toggleBooking() {
    const sessionRef = ref(db, 'session');
    get(sessionRef).then((snapshot) => {
        let state = snapshot.val();
        if (state) {
            state.isBookingStopped = !state.isBookingStopped;
            set(sessionRef, state);
        }
    });
}

export function deleteReader(index) {
    const sessionRef = ref(db, 'session');
    get(sessionRef).then((snapshot) => {
        let state = snapshot.val();
        if (state && state.queue) {
            state.queue.splice(index, 1);
            if (index < state.currentReaderIndex) {
                state.currentReaderIndex--;
            } else {
                state = recalculateQueueVerses(state);
            }
            set(sessionRef, state);
        }
    });
}

export function makeUrgent(index) {
    const sessionRef = ref(db, 'session');
    get(sessionRef).then((snapshot) => {
        let state = snapshot.val();
        if (state && state.queue && index > state.currentReaderIndex + 1) {
            const reader = state.queue.splice(index, 1)[0]; 
            state.queue.splice(state.currentReaderIndex + 1, 0, reader);
            state = recalculateQueueVerses(state);
            set(sessionRef, state);
        }
    });
}

// --- دوال القارئة ---
export function bookRole(name) {
    const sessionRef = ref(db, 'session');
    return get(sessionRef).then((snapshot) => {
        let state = snapshot.val();
        
        if (!state || state.isBookingStopped) {
            return { success: false, msg: "نعتذر أختي الغالية، الحجز متوقف حالياً ⛔" };
        }

        if (!state.queue) state.queue = [];

        const newReader = {
            id: Date.now(), 
            name: name || `قارئة ${state.queue.length + 1}`,
            verses: "...", 
            surah: surahNames[state.settings.surah] || "سورة مختارة",
            startV: 0,
            endV: 0
        };

        state.queue.push(newReader);
        state = recalculateQueueVerses(state);
        
        return set(sessionRef, state).then(() => {
            const updatedReader = state.queue[state.queue.length - 1];
            return { success: true, readerId: updatedReader.id, details: updatedReader };
        });
    });
}
