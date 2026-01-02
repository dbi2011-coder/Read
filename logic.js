// logic.js - الإصدار المحلي (Local Storage)
// يعمل بدون إنترنت وبدون سيرفر

const STORAGE_KEY = 'quran_queue_offline_v3';

// قائمة السور الكاملة
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

// الحالة الافتراضية
const defaultState = {
    settings: { surah: 1, startVerse: 1, amountType: 'verses', amountValue: 5 },
    queue: [],
    currentReaderIndex: -1,
    isBookingStopped: false
};

// --- دوال مساعدة للتخزين ---
function getState() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : defaultState;
}

function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    // إجبار تحديث الواجهة في نفس الصفحة
    if (window.onStateChange) window.onStateChange(state);
}

// دالة لجلب قائمة السور (للاستخدام في HTML)
function getSurahList() {
    return surahNames;
}

// --- الحسابات ---
function calculateVersesBlock(startFrom, amountType, amountValue) {
    let start = parseInt(startFrom); 
    let end = start;
    
    if (amountType === 'verses') {
        end = start + parseInt(amountValue) - 1;
    } else if (amountType === 'quarter') {
        end = start + 7; 
    } else if (amountType === 'half') {
        end = start + 14; 
    } else if (amountType === 'full') {
        end = start + 28; // وجه كامل
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

// --- دوال الاستماع (مهمة جداً للمزامنة بين التبويبات) ---
function startListener(callback) {
    // 1. الاستماع لتغييرات localStorage من التبويبات الأخرى
    window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY) {
            callback(JSON.parse(e.newValue));
        }
    });

    // 2. تسجيل دالة التحديث للصفحة الحالية
    window.onStateChange = callback;

    // 3. استدعاء أولي
    callback(getState());
}

// --- دوال المشرف ---
function checkAdminPass(input) {
    return input === "1234"; 
}

function initSession(surah, startVerse, type, value) {
    let state = getState();
    state = {
        settings: { surah, startVerse: parseInt(startVerse), amountType: type, amountValue: value },
        queue: [],
        currentReaderIndex: -1,
        isBookingStopped: false
    };
    saveState(state);
}

function nextReader() {
    let state = getState();
    if (state.queue && state.queue.length > state.currentReaderIndex + 1) {
        state.currentReaderIndex++;
        saveState(state);
    }
}

function toggleBooking() {
    let state = getState();
    state.isBookingStopped = !state.isBookingStopped;
    saveState(state);
}

function deleteReader(index) {
    let state = getState();
    if (state.queue) {
        state.queue.splice(index, 1);
        if (index < state.currentReaderIndex) {
            state.currentReaderIndex--;
        } else {
            state = recalculateQueueVerses(state);
        }
        saveState(state);
    }
}

function makeUrgent(index) {
    let state = getState();
    if (state.queue && index > state.currentReaderIndex + 1) {
        const reader = state.queue.splice(index, 1)[0]; 
        state.queue.splice(state.currentReaderIndex + 1, 0, reader);
        state = recalculateQueueVerses(state);
        saveState(state);
    }
}

// --- دوال القارئة ---
function bookRole(name) {
    let state = getState();
    
    if (state.isBookingStopped) {
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
    saveState(state);

    // نرجع آخر قارئة (التي هي أنا)
    const updatedReader = state.queue[state.queue.length - 1];
    return { success: true, readerId: updatedReader.id, details: updatedReader };
}
