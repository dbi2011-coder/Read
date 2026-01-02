// logic.js - الإصدار المطور (توزيع ديناميكي للآيات)

const STORAGE_KEY = 'quran_queue_system_v2';

const defaultState = {
    settings: {
        surah: 1, 
        startVerse: 1,
        amountType: 'verses', 
        amountValue: 5 
    },
    isBookingStopped: false,
    currentReaderIndex: -1, 
    queue: [], 
    // لم نعد بحاجة لمتغير lastAssignedVerse لأنه سيحسب ديناميكياً
};

const surahNames = ["", "الفاتحة", "البقرة", "آل عمران", "النساء", "المائدة", "الأنعام", "الأعراف"]; 

// --- دوال مساعدة ---

function getState() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : defaultState;
}

function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// دالة حساب الآيات (مجردة)
function calculateVersesBlock(startFrom, amountType, amountValue) {
    let start = startFrom; 
    let end = start;

    if (amountType === 'verses') {
        end = start + parseInt(amountValue) - 1;
    } else if (amountType === 'quarter') {
        end = start + 7; 
    } else if (amountType === 'half') {
        end = start + 14; 
    }
    
    return { start, end, text: `من آية ${start} إلى ${end}` };
}

// 🔥 الدالة الجديدة: إعادة ترتيب الآيات للطابور بالكامل 🔥
function recalculateQueueVerses(state) {
    // 1. تحديد نقطة البداية
    // إذا لم يبدأ أحد، نبدأ من إعدادات المشرف
    // إذا كان هناك شخص يقرأ حالياً، نبدأ من حيث انتهى
    let nextStartVerse = state.settings.startVerse;

    // إذا كان هناك قارئة حالية (أو انتهت)، التوزيع الجديد يبدأ من بعدها
    if (state.currentReaderIndex >= 0 && state.queue[state.currentReaderIndex]) {
        nextStartVerse = state.queue[state.currentReaderIndex].endV + 1;
    } 
    // ملاحظة: إذا كان المؤشر -1 يعني لم يبدأ أحد، فالمتغير nextStartVerse يأخذ قيمته من الإعدادات

    // 2. المرور على جميع القارئات اللواتي يأتين *بعد* القارئة الحالية
    for (let i = state.currentReaderIndex + 1; i < state.queue.length; i++) {
        const info = calculateVersesBlock(nextStartVerse, state.settings.amountType, state.settings.amountValue);
        
        state.queue[i].startV = info.start;
        state.queue[i].endV = info.end;
        state.queue[i].verses = info.text;
        
        // تحديث البداية للقارئة التي تليها
        nextStartVerse = info.end + 1;
    }

    return state;
}

// --- دوال المشرف ---

function adminLogin(password) {
    return password === "1234"; 
}

function initSession(surah, startVerse, type, value) {
    let state = getState();
    state.settings = { surah, startVerse: parseInt(startVerse), amountType: type, amountValue: value };
    state.queue = [];
    state.currentReaderIndex = -1;
    state.isBookingStopped = false;
    saveState(state);
}

function nextReader() {
    let state = getState();
    if (state.queue.length > state.currentReaderIndex + 1) {
        state.currentReaderIndex++;
        // لا نحتاج لإعادة الحساب هنا لأن الترتيب لم يتغير، فقط الدور مشى
        saveState(state);
        return true;
    }
    return false; 
}

function toggleBooking(stop) {
    let state = getState();
    state.isBookingStopped = stop;
    saveState(state);
}

function deleteReader(index) {
    let state = getState();
    
    // الحذف
    state.queue.splice(index, 1);
    
    // تصحيح المؤشر إذا حذفنا شخصاً قبل الدور الحالي
    if (index < state.currentReaderIndex) {
        state.currentReaderIndex--;
    } else {
        // إذا حذفنا شخصاً بعد الدور الحالي، يجب إعادة ترتيب الآيات لمن تبقى
        state = recalculateQueueVerses(state);
    }

    saveState(state);
}

function makeUrgent(index) {
    let state = getState();
    // شرط: لا يمكن تقديم القارئة إذا كانت هي الحالية أو التالية مباشرة (لأنها أصلاً في المقدمة)
    if (index <= state.currentReaderIndex + 1) return; 

    // 1. استخراج القارئة
    const reader = state.queue.splice(index, 1)[0]; 
    
    // 2. وضعها بعد القارئة الحالية مباشرة
    state.queue.splice(state.currentReaderIndex + 1, 0, reader);
    
    // 3. 🔥 إعادة حساب الآيات للجميع لأن الترتيب تغير 🔥
    state = recalculateQueueVerses(state);

    saveState(state);
}

// --- دوال القارئة ---

function bookRole(name) {
    let state = getState();
    
    if (state.isBookingStopped) return { success: false, msg: "نعتذر أختي الغالية على قبول حجزك لإكتمال العدد ⛔" };

    const newReader = {
        id: Date.now(), 
        name: name || `قارئة ${state.queue.length + 1}`,
        verses: "...", // سيتم الحساب حالاً
        surah: surahNames[state.settings.surah] || "سورة مختارة",
        startV: 0,
        endV: 0
    };

    state.queue.push(newReader);
    
    // حساب الآيات لها (ولغيرها إن وجد خلل)
    state = recalculateQueueVerses(state);
    
    // استرجاع الكائن المحدث بعد الحساب لإعادته للواجهة
    const updatedReader = state.queue[state.queue.length - 1];

    saveState(state);
    return { success: true, readerId: updatedReader.id, details: updatedReader };
}