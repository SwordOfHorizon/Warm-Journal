/* ==========================================================================
   WARM JOURNAL - CORE APPLICATION LOGIC (app.js)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================================================
    // PWA SERVICE WORKER REGISTRATION
    // ==========================================================================
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./OneSignalSDKWorker.js')
                .then(reg => console.log('Service Worker registered successfully!', reg.scope))
                .catch(err => console.error('Service Worker registration failed:', err));
        });
    }

    // ==========================================================================
    // 1. STATE & STORAGE MANAGEMENT (VERİ KATMANI)
    // ==========================================================================
    const DB = {
        getEntries: () => JSON.parse(localStorage.getItem('wj_entries')) || [],
        saveEntries: (entries) => localStorage.setItem('wj_entries', JSON.stringify(entries)),
        
        getActiveUser: () => {
            const pin = localStorage.getItem('wj_pin');
            if (!pin) return null;
            return {
                id: 'wj_local_user',
                name: localStorage.getItem('wj_user_name') || 'Günlük Dostu',
                email: 'local@gunce.app'
            };
        }
    };

    let currentUser = DB.getActiveUser();
    let currentStep = 1; // Günlük yazma adımı (1, 2 veya 3)
    let selectedEmotions = [];
    let activeReportPeriod = 'weekly'; // Rapor periyodu (weekly, monthly, yearly)

    // Sabit Duygu Listesi
    const EMOTIONS_LIST = [
        { id: 'Huzurlu', emoji: '🌸', text: 'Huzurlu' },
        { id: 'Sakin', emoji: '😌', text: 'Sakin' },
        { id: 'Mutlu', emoji: '😊', text: 'Mutlu' },
        { id: 'Heyecanlı', emoji: '⚡', text: 'Heyecanlı' },
        { id: 'Odaklanmış', emoji: '🧠', text: 'Odaklanmış' },
        { id: 'Hüzünlü', emoji: '🥺', text: 'Hüzünlü' },
        { id: 'Yorgun', emoji: '😴', text: 'Yorgun' },
        { id: 'Stresli', emoji: '🤯', text: 'Stresli' },
        { id: 'Sevgi Dolu', emoji: '💖', text: 'Sevgi Dolu' },
        { id: 'Kızgın', emoji: '😠', text: 'Kızgın' }
    ];

    // Günlük İlham Soruları (Mindfulness Prompts)
    const DAILY_PROMPTS = [
        "Bugün seni en çok rahatlatan an hangisiydi? 😌", // Pazar (0)
        "Bugün seni gülümseten en küçük şey neydi? 🌸", // Pazartesi (1)
        "Bugün kendin hakkında fark ettiğin olumlu bir şey? 🧠", // Salı (2)
        "Bugün kime, ne için teşekkür etmek istersin? ✨", // Çarşamba (3)
        "Bugün doğada gördüğün en güzel detay neydi? 🍃", // Perşembe (4)
        "Bugün başardığın en ufak şey neydi? 🧡", // Cuma (5)
        "Bugün aldığın en değerli hayat dersi neydi? 🧩" // Cumartesi (6)
    ];

    // ==========================================================================
    // 2. DOM ELEMENTLERİNE ERİŞİM
    // ==========================================================================
    const screens = {
        splash: document.getElementById('screen-splash'),
        auth: document.getElementById('screen-auth'),
        dashboard: document.getElementById('screen-dashboard'),
        write: document.getElementById('screen-write'),
        profile: document.getElementById('screen-profile'),
        reports: document.getElementById('screen-reports')
    };

    // Modaller
    const modalDetail = document.getElementById('modal-detail');
    const modalDetailOverlay = document.getElementById('modal-detail-overlay');

    // Butonlar
    const btnGetStarted = document.getElementById('btn-get-started');
    const btnBackSplash = document.querySelector('.btn-back-splash');
    const btnProfileTrigger = document.getElementById('btn-profile-trigger');
    const btnCloseProfile = document.getElementById('btn-close-profile');
    const btnReportsTrigger = document.getElementById('btn-reports-trigger');
    const btnCloseReports = document.getElementById('btn-close-reports');
    const btnAddEntryTrigger = document.getElementById('btn-add-entry-trigger');
    const btnCancelWrite = document.getElementById('btn-cancel-write');
    const btnNextStep = document.getElementById('btn-next-step');
    const btnPrevStepBack = document.getElementById('btn-prev-step-back');
    const btnNextStep3 = document.getElementById('btn-next-step-3');
    const btnPrevStep3 = document.getElementById('btn-prev-step-3');
    const btnSaveEntry = document.getElementById('btn-save-entry');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const btnDeleteEntry = document.getElementById('btn-delete-entry');
    const btnSearchToggle = document.getElementById('btn-search-toggle');
    const btnZenToggle = document.getElementById('btn-zen-toggle');
    const btnExportPdf = document.getElementById('btn-export-pdf');
    
    // Profil & Ayarlar
    const btnLogout = document.getElementById('btn-logout');
    const btnDeleteAccount = document.getElementById('btn-delete-account');
    const btnBackupExport = document.getElementById('btn-backup-export');
    const fileBackupImport = document.getElementById('backup-import-file');
    const backupFeedbackMsg = document.getElementById('backup-feedback-message');

    // Bildirim Buton Elemanları
    const btnToggleNotifications = document.getElementById('btn-toggle-notifications');
    const notificationBtnIcon = document.getElementById('notification-btn-icon');
    const notificationBtnTitle = document.getElementById('notification-btn-title');
    const notificationBtnSubtitle = document.getElementById('notification-btn-subtitle');

    // Günlük Giriş Bileşenleri
    const entrySummaryInput = document.getElementById('entry-summary');
    const entryRatingInput = document.getElementById('entry-rating');
    const emotionsSelectionGrid = document.getElementById('emotions-selection-grid');
    const charCounter = document.getElementById('char-counter');
    const minCharWarning = document.getElementById('min-char-warning');
    const ratingEmoji = document.getElementById('rating-emoji');
    const ratingText = document.getElementById('rating-text');
    const ratingNumber = document.getElementById('rating-number');

    // Arama ve Filtreleme
    const searchBar = document.getElementById('search-bar');
    const searchInput = document.getElementById('search-input');
    const filterRating = document.getElementById('filter-rating');
    const filterEmotion = document.getElementById('filter-emotion');

    // Listeler ve Grafikler
    const entriesList = document.getElementById('entries-list');
    const moodChartContainer = document.getElementById('mood-chart-container');
    const reportDetailsContainer = document.getElementById('report-details-container');
    const reportTabBtns = document.querySelectorAll('.reports-tabs .tab-btn');

    // PIN UI Elemanları
    const pinKeys = document.querySelectorAll('.pin-key');
    const btnPinClear = document.getElementById('btn-pin-clear');
    const btnPinBackspace = document.getElementById('btn-pin-backspace');
    const pinDotsRow = document.getElementById('pin-dots-row');
    const pinDots = document.querySelectorAll('.pin-dot');
    const pinSetupNameGroup = document.getElementById('pin-setup-name-group');
    const pinSetupNameInput = document.getElementById('pin-setup-name');
    const pinScreenTitle = document.getElementById('pin-screen-title');
    const pinScreenDesc = document.getElementById('pin-screen-desc');

    // ==========================================================================
    // 3. EKRAN YÖNLENDİRME (ROUTING) SİSTEMİ
    // ==========================================================================
    function navigateTo(screenKey) {
        Object.keys(screens).forEach(key => {
            if (key === screenKey) {
                screens[key].classList.add('active');
            } else {
                screens[key].classList.remove('active');
            }
        });
        
        // Zen ses sentezleyiciyi yazma ekranı kapandığında kapat
        if (screenKey !== 'write') {
            ZenSynthesizer.stop();
            if (btnZenToggle) btnZenToggle.classList.remove('active');
            const zenPanel = document.getElementById('zen-panel');
            if (zenPanel) zenPanel.classList.remove('active');
        }

        // Dashboard açıldığında verileri güncelle
        if (screenKey === 'dashboard') {
            initDashboard();
        }
        // Profil açıldığında bilgileri güncelle
        if (screenKey === 'profile') {
            initProfile();
        }
        // Raporlar açıldığında rapor ekranını başlat
        if (screenKey === 'reports') {
            initReportsScreen();
        }
    }

    // ==========================================================================
    // 4. KULLANICI PIN LOCK GİRİŞ & KAYIT İŞLEMLERİ (AUTH)
    // ==========================================================================
    let enteredPin = "";
    const PIN_LENGTH = 4;

    btnGetStarted.addEventListener('click', () => {
        navigateTo('auth');
        initAuthScreen();
    });

    btnBackSplash.addEventListener('click', () => {
        navigateTo('splash');
    });

    function initAuthScreen() {
        enteredPin = "";
        updatePinDots();
        
        const isSetup = !localStorage.getItem('wj_pin');
        if (isSetup) {
            pinScreenTitle.textContent = "Şifre Belirle";
            pinScreenDesc.textContent = "Günlüğünü güvende tutmak için 4 haneli bir şifre seç.";
            pinSetupNameGroup.style.display = "block";
            pinSetupNameInput.value = "";
        } else {
            pinScreenTitle.textContent = "Şifre Girin";
            pinScreenDesc.textContent = "Günlüğüne erişmek için 4 haneli şifreni gir.";
            pinSetupNameGroup.style.display = "none";
        }
    }

    function updatePinDots() {
        pinDots.forEach((dot, idx) => {
            if (idx < enteredPin.length) {
                dot.classList.add('filled');
            } else {
                dot.classList.remove('filled');
            }
        });
    }

    function handlePinInput(value) {
        if (enteredPin.length >= PIN_LENGTH) return;
        
        enteredPin += value;
        updatePinDots();
        
        if (enteredPin.length === PIN_LENGTH) {
            setTimeout(verifyPin, 250);
        }
    }

    function handlePinBackspace() {
        if (enteredPin.length > 0) {
            enteredPin = enteredPin.slice(0, -1);
            updatePinDots();
        }
    }

    function handlePinClear() {
        enteredPin = "";
        updatePinDots();
    }

    function verifyPin() {
        const isSetup = !localStorage.getItem('wj_pin');
        
        if (isSetup) {
            const name = pinSetupNameInput.value.trim();
            if (name.length < 2) {
                alert("Lütfen önce isminizi girin (en az 2 karakter).");
                enteredPin = "";
                updatePinDots();
                pinSetupNameInput.focus();
                return;
            }
            
            // PIN ve İsmi yerel olarak kaydet
            localStorage.setItem('wj_pin', enteredPin);
            localStorage.setItem('wj_user_name', name);
            
            currentUser = {
                id: 'wj_local_user',
                name: name,
                email: 'local@gunce.app'
            };
            
            navigateTo('dashboard');
        } else {
            const savedPin = localStorage.getItem('wj_pin');
            if (enteredPin === savedPin) {
                const name = localStorage.getItem('wj_user_name') || 'Günlük Dostu';
                currentUser = {
                    id: 'wj_local_user',
                    name: name,
                    email: 'local@gunce.app'
                };
                navigateTo('dashboard');
            } else {
                // Şifre yanlış: sallanma animasyonu
                pinDotsRow.classList.add('shake');
                enteredPin = "";
                
                setTimeout(() => {
                    pinDotsRow.classList.remove('shake');
                    updatePinDots();
                }, 400);
            }
        }
    }

    // Keypad Event Listener'larını bağlama
    pinKeys.forEach(key => {
        key.addEventListener('click', () => {
            handlePinInput(key.dataset.value);
        });
    });

    if (btnPinClear) {
        btnPinClear.addEventListener('click', handlePinClear);
    }

    if (btnPinBackspace) {
        btnPinBackspace.addEventListener('click', handlePinBackspace);
    }

    // ==========================================================================
    // 5. ANA PANEL (DASHBOARD) VE COZY DİNAMİK TEMA YÖNETİMİ
    // ==========================================================================
    
    function initDashboard() {
        if (!currentUser) return;
        
        document.getElementById('dashboard-greeting').textContent = `Merhaba, ${currentUser.name}! 🌸`;
        document.getElementById('dashboard-date').textContent = getFormattedTodayDate();
        
        const avatarEl = document.getElementById('user-avatar');
        if (avatarEl) {
            avatarEl.textContent = currentUser.name.charAt(0).toUpperCase();
        }
        
        searchBar.classList.remove('active');
        searchInput.value = '';
        filterRating.value = 'all';
        filterEmotion.value = 'all';
        
        renderEntries();
    }

    function getFormattedTodayDate() {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        return new Date().toLocaleDateString('tr-TR', options);
    }

    // Haftalık Ortalama Ruh Haline Göre Dinamik HSL Teması
    function updateThemeColors(avgRating) {
        if (avgRating >= 7.5) {
            // Mutlu/Pozitif: Cozy Gün Batımı Şeftalisi ve Terracotta teması
            document.documentElement.style.setProperty('--bg-cozy-cream', 'hsl(30, 42%, 97%)');
            document.documentElement.style.setProperty('--bg-phone-screen', 'hsl(30, 50%, 99%)');
            document.documentElement.style.setProperty('--primary-terracotta', 'hsl(14, 85%, 62%)');
            document.documentElement.style.setProperty('--primary-terracotta-dark', 'hsl(14, 75%, 52%)');
            document.documentElement.style.setProperty('--primary-terracotta-light', 'hsl(14, 90%, 94%)');
            document.documentElement.style.setProperty('--accent-sunset-gold', 'hsl(38, 90%, 58%)');
            document.documentElement.style.setProperty('--accent-sunset-gold-light', 'hsl(38, 90%, 93%)');
            document.documentElement.style.setProperty('--accent-warm-peach', 'hsl(24, 90%, 75%)');
        } else if (avgRating >= 5.0) {
            // Dengeli/Sakin: Rahatlatıcı Adaçayı Yeşili teması
            document.documentElement.style.setProperty('--bg-cozy-cream', 'hsl(120, 20%, 97%)');
            document.documentElement.style.setProperty('--bg-phone-screen', 'hsl(120, 25%, 99%)');
            document.documentElement.style.setProperty('--primary-terracotta', 'hsl(150, 40%, 45%)');
            document.documentElement.style.setProperty('--primary-terracotta-dark', 'hsl(150, 40%, 35%)');
            document.documentElement.style.setProperty('--primary-terracotta-light', 'hsl(150, 30%, 93%)');
            document.documentElement.style.setProperty('--accent-sunset-gold', 'hsl(180, 30%, 50%)');
            document.documentElement.style.setProperty('--accent-sunset-gold-light', 'hsl(180, 30%, 93%)');
            document.documentElement.style.setProperty('--accent-warm-peach', 'hsl(165, 45%, 70%)');
        } else {
            // Düşük/Zor Dönem: Şefkatli, Yumuşak Kakao / Sıcak Gri-Toprak teması
            document.documentElement.style.setProperty('--bg-cozy-cream', 'hsl(20, 20%, 96%)');
            document.documentElement.style.setProperty('--bg-phone-screen', 'hsl(20, 25%, 98%)');
            document.documentElement.style.setProperty('--primary-terracotta', 'hsl(20, 30%, 48%)');
            document.documentElement.style.setProperty('--primary-terracotta-dark', 'hsl(20, 30%, 38%)');
            document.documentElement.style.setProperty('--primary-terracotta-light', 'hsl(20, 20%, 92%)');
            document.documentElement.style.setProperty('--accent-sunset-gold', 'hsl(30, 20%, 55%)');
            document.documentElement.style.setProperty('--accent-sunset-gold-light', 'hsl(30, 20%, 92%)');
            document.documentElement.style.setProperty('--accent-warm-peach', 'hsl(25, 25%, 75%)');
        }
    }

    // ==========================================================================
    // 6. GÜNLÜK YAZMA VE İNTERAKTİF PUANLAMA (SLIDER, EMOJI & DUYGULAR)
    // ==========================================================================
    
    function initEmotionsGrid() {
        emotionsSelectionGrid.innerHTML = '';
        selectedEmotions = [];
        
        EMOTIONS_LIST.forEach(emo => {
            const pill = document.createElement('div');
            pill.className = 'emotion-pill';
            pill.dataset.id = emo.id;
            pill.innerHTML = `<span>${emo.emoji}</span>${emo.text}`;
            
            pill.addEventListener('click', () => {
                pill.classList.toggle('active');
                if (pill.classList.contains('active')) {
                    selectedEmotions.push(emo.id);
                } else {
                    selectedEmotions = selectedEmotions.filter(id => id !== emo.id);
                }
            });
            
            emotionsSelectionGrid.appendChild(pill);
        });
    }

    btnAddEntryTrigger.addEventListener('click', () => {
        currentStep = 1;
        entrySummaryInput.value = '';
        charCounter.textContent = '0 / 500';
        minCharWarning.classList.remove('active');
        
        // Günün felsefi mindfulness sorusunu placeholder olarak enjekte et
        const dayIndex = new Date().getDay();
        entrySummaryInput.placeholder = DAILY_PROMPTS[dayIndex];
        
        entryRatingInput.value = 7;
        updateRatingUI(7);
        
        initEmotionsGrid();
        showWriteStep(1);
        navigateTo('write');
    });

    btnCancelWrite.addEventListener('click', () => {
        navigateTo('dashboard');
    });

    entrySummaryInput.addEventListener('input', () => {
        const len = entrySummaryInput.value.length;
        charCounter.textContent = `${len} / 500`;
        
        if (len >= 5) {
            minCharWarning.classList.remove('active');
        }
    });

    btnNextStep.addEventListener('click', () => {
        const text = entrySummaryInput.value.trim();
        if (text.length < 5) {
            minCharWarning.classList.add('active');
            entrySummaryInput.focus();
            return;
        }
        currentStep = 2;
        showWriteStep(2);
    });

    btnPrevStepBack.addEventListener('click', () => {
        currentStep = 1;
        showWriteStep(1);
    });

    btnNextStep3.addEventListener('click', () => {
        currentStep = 3;
        showWriteStep(3);
    });

    btnPrevStep3.addEventListener('click', () => {
        currentStep = 2;
        showWriteStep(2);
    });

    function showWriteStep(step) {
        document.getElementById('current-step-dot').textContent = step;
        
        const step1El = document.getElementById('write-step-1');
        const step2El = document.getElementById('write-step-2');
        const step3El = document.getElementById('write-step-3');
        
        step1El.classList.remove('active');
        step2El.classList.remove('active');
        step3El.classList.remove('active');
        
        if (step === 1) {
            step1El.classList.add('active');
        } else if (step === 2) {
            step2El.classList.add('active');
        } else {
            step3El.classList.add('active');
        }
    }

    entryRatingInput.addEventListener('input', (e) => {
        const rating = parseInt(e.target.value);
        updateRatingUI(rating);
    });

    function updateRatingUI(rating) {
        ratingNumber.textContent = rating;
        
        ratingEmoji.classList.remove('pop');
        void ratingEmoji.offsetWidth;
        ratingEmoji.classList.add('pop');
        
        let emoji = '🙂';
        let text = 'Sıradan Bir Gün';
        let colorClass = 'rating-mid';
        
        if (rating <= 2) {
            emoji = '🥺'; text = 'Çok Zor Bir Gün'; colorClass = 'rating-bad';
        } else if (rating <= 4) {
            emoji = '😕'; text = 'Keyifsiz Bir Gün'; colorClass = 'rating-bad';
        } else if (rating <= 6) {
            emoji = '🙂'; text = 'Sıradan Bir Gün'; colorClass = 'rating-mid';
        } else if (rating <= 8) {
            emoji = '😊'; text = 'İyi Bir Gün'; colorClass = 'rating-good';
        } else {
            emoji = '🥰'; text = 'Harika Bir Gün'; colorClass = 'rating-good';
        }
        
        ratingEmoji.textContent = emoji;
        ratingText.textContent = text;
        
        let themeColor = 'hsl(38, 90%, 58%)';
        if (colorClass === 'rating-bad') themeColor = 'hsl(0, 75%, 55%)';
        if (colorClass === 'rating-good') themeColor = 'hsl(14, 85%, 62%)';
        
        entryRatingInput.style.background = `linear-gradient(to right, ${themeColor} 0%, ${themeColor} ${(rating - 1) * 11}%, hsl(30, 42%, 90%) ${(rating - 1) * 11}%, hsl(30, 42%, 90%) 100%)`;
        ratingNumber.style.color = themeColor;
    }

    btnSaveEntry.addEventListener('click', () => {
        const summaryText = entrySummaryInput.value.trim();
        const rating = parseInt(entryRatingInput.value);
        
        if (!summaryText) return;
        
        const newEntry = {
            id: 'e_' + Date.now(),
            userId: currentUser.id,
            date: new Date().toISOString(),
            dateStr: getFormattedDate(new Date()),
            text: summaryText,
            rating: rating,
            emotions: [...selectedEmotions],
            timestamp: Date.now()
        };
        
        const entries = DB.getEntries();
        entries.push(newEntry);
        DB.saveEntries(entries);
        
        navigateTo('dashboard');
    });

    function getFormattedDate(dateObj) {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return dateObj.toLocaleDateString('tr-TR', options);
    }

    // ==========================================================================
    // 7. AMBİYANS: ÇEVRİMDIŞI SENTEZLENEN ZEN YAĞMUR MOTORU (AUDIO CONTEXT)
    // ==========================================================================
    // ==========================================================================
    // 7. AMBİYANS: ÇEVRİMDIŞI ÇOK SESLİ ZEN SENTEZLEYİCİ (WEB AUDIO API)
    // ==========================================================================
    const ZenSynthesizer = {
        audioCtx: null,
        noiseSource: null,
        mainGainNode: null,
        filterNode: null,
        lfoNode: null,
        lfoGainNode: null,
        lfoFilterNode: null,
        lfoFilterGainNode: null,
        fireTimer: null,
        isActive: false,
        currentSound: localStorage.getItem('wj_zen_sound') || 'rain', // rain, fire, wind
        volume: localStorage.getItem('wj_zen_volume') !== null && !isNaN(parseInt(localStorage.getItem('wj_zen_volume'))) ? parseInt(localStorage.getItem('wj_zen_volume')) : 50, // 0-100

        init: function() {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) {
                console.error("Web Audio API not supported on this browser.");
                return false;
            }
            this.audioCtx = new AudioContextClass();
            return true;
        },

        start: function() {
            if (!this.audioCtx && !this.init()) return;

            // Tarayıcı güvenlik kuralları gereği ses bağlamını etkinleştir
            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }

            // Beyaz Gürültü (White Noise) üret
            const sampleRate = this.audioCtx.sampleRate;
            const bufferSize = 2 * sampleRate;
            const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, sampleRate);
            const output = noiseBuffer.getChannelData(0);
            
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }

            this.noiseSource = this.audioCtx.createBufferSource();
            this.noiseSource.buffer = noiseBuffer;
            this.noiseSource.loop = true;

            // Ana ses kazancı
            this.mainGainNode = this.audioCtx.createGain();
            this.mainGainNode.gain.setValueAtTime(0, this.audioCtx.currentTime); // fade-in from 0

            // Filtre düğümü
            this.filterNode = this.audioCtx.createBiquadFilter();

            // Sentezleyici Konfigürasyonları
            if (this.currentSound === 'rain') {
                // Yağmur: Düşük geçiren filtre (450Hz)
                this.filterNode.type = 'lowpass';
                this.filterNode.frequency.setValueAtTime(450, this.audioCtx.currentTime);
                
                this.noiseSource.connect(this.filterNode);
                this.filterNode.connect(this.mainGainNode);
            } 
            else if (this.currentSound === 'fire') {
                // Şömine / Kamp Ateşi: Düşük geçiren filtre (90Hz) ile alev gürlemesi
                this.filterNode.type = 'lowpass';
                this.filterNode.frequency.setValueAtTime(90, this.audioCtx.currentTime);
                
                // Alev gürlemesi için hacim dalgalandırma LFO'su (0.5Hz = 2 saniyelik periyot)
                this.lfoNode = this.audioCtx.createOscillator();
                this.lfoNode.type = 'sine';
                this.lfoNode.frequency.setValueAtTime(0.5, this.audioCtx.currentTime);
                
                this.lfoGainNode = this.audioCtx.createGain();
                this.lfoGainNode.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
                
                this.lfoNode.connect(this.lfoGainNode);
                
                const roarGainNode = this.audioCtx.createGain();
                roarGainNode.gain.setValueAtTime(0.6, this.audioCtx.currentTime);
                
                this.lfoGainNode.connect(roarGainNode.gain);
                
                this.noiseSource.connect(this.filterNode);
                this.filterNode.connect(roarGainNode);
                roarGainNode.connect(this.mainGainNode);
                
                this.lfoNode.start(0);
                
                // Çıtırtı ve Pop seslerini periyodik olarak zamanlayan fonksiyonu başlat
                this.fireTimer = null;
                const playCracklePop = () => {
                    if (!this.isActive || this.currentSound !== 'fire') return;
                    
                    const popSource = this.audioCtx.createBufferSource();
                    const popDuration = 0.003 + Math.random() * 0.012; // 3ms - 15ms
                    const popBuffer = this.audioCtx.createBuffer(1, this.audioCtx.sampleRate * popDuration, this.audioCtx.sampleRate);
                    const popData = popBuffer.getChannelData(0);
                    
                    for (let i = 0; i < popData.length; i++) {
                        const env = 1.0 - (i / popData.length);
                        popData[i] = (Math.random() * 2 - 1) * env * (Math.random() > 0.4 ? 1.0 : -1.0);
                    }
                    
                    popSource.buffer = popBuffer;
                    
                    const popFilter = this.audioCtx.createBiquadFilter();
                    popFilter.type = 'bandpass';
                    popFilter.Q.setValueAtTime(4.0, this.audioCtx.currentTime);
                    popFilter.frequency.setValueAtTime(900 + Math.random() * 1800, this.audioCtx.currentTime); // 900Hz - 2700Hz
                    
                    const popGain = this.audioCtx.createGain();
                    // Ses sürgüsü oranına göre pop sesini ayarla
                    popGain.gain.setValueAtTime((0.025 + Math.random() * 0.07) * (this.volume / 100), this.audioCtx.currentTime);
                    
                    popSource.connect(popFilter);
                    popFilter.connect(popGain);
                    popGain.connect(this.mainGainNode);
                    
                    popSource.start(0);
                    
                    popSource.onended = () => {
                        popSource.disconnect();
                        popFilter.disconnect();
                        popGain.disconnect();
                    };
                    
                    // Rastgele aralıklarla çıtırdama zamanlaması (60ms - 400ms)
                    const nextDelay = 60 + Math.random() * 340;
                    this.fireTimer = setTimeout(playCracklePop, nextDelay);
                };
                
                // İlk çıtırtıyı zamanla
                this.fireTimer = setTimeout(playCracklePop, 100);
            } 
            else if (this.currentSound === 'wind') {
                // Rüzgar: Dar Q (4.0) olan Bant Geçiren filtre, uğultulu esintiler.
                // İki farklı LFO ile dalgalandırarak organik ve eşsiz rüzgar fırtınası tonu verir.
                this.filterNode.type = 'bandpass';
                this.filterNode.Q.setValueAtTime(4.0, this.audioCtx.currentTime);
                this.filterNode.frequency.setValueAtTime(550, this.audioCtx.currentTime);
                
                // 1. Ana Esinti LFO'su (0.07Hz)
                this.lfoNode = this.audioCtx.createOscillator();
                this.lfoNode.type = 'sine';
                this.lfoNode.frequency.setValueAtTime(0.07, this.audioCtx.currentTime);
                
                this.lfoFilterGainNode = this.audioCtx.createGain();
                this.lfoFilterGainNode.gain.setValueAtTime(180, this.audioCtx.currentTime); // +/- 180Hz dalgalanma
                
                this.lfoNode.connect(this.lfoFilterGainNode);
                this.lfoFilterGainNode.connect(this.filterNode.frequency);
                
                // 2. Türbülans Esintisi LFO'su (0.18Hz)
                this.lfoFilterNode = this.audioCtx.createOscillator();
                this.lfoFilterNode.type = 'sine';
                this.lfoFilterNode.frequency.setValueAtTime(0.18, this.audioCtx.currentTime);
                
                const lfoFilterGain2 = this.audioCtx.createGain();
                lfoFilterGain2.gain.setValueAtTime(60, this.audioCtx.currentTime);
                
                this.lfoFilterNode.connect(lfoFilterGain2);
                lfoFilterGain2.connect(this.filterNode.frequency);
                
                // Hacim dalgalandırma (Rüzgar estikçe uğultu artar)
                this.lfoGainNode = this.audioCtx.createGain();
                this.lfoGainNode.gain.setValueAtTime(0.4, this.audioCtx.currentTime);
                this.lfoNode.connect(this.lfoGainNode);
                
                const windGainNode = this.audioCtx.createGain();
                windGainNode.gain.setValueAtTime(0.45, this.audioCtx.currentTime);
                
                this.lfoGainNode.connect(windGainNode.gain);
                
                this.noiseSource.connect(this.filterNode);
                this.filterNode.connect(windGainNode);
                windGainNode.connect(this.mainGainNode);
                
                this.lfoNode.start(0);
                this.lfoFilterNode.start(0);
            }

            this.mainGainNode.connect(this.audioCtx.destination);
            this.noiseSource.start(0);
            
            // 1.5 saniye içinde sesi yumuşakça yükselt
            const targetVolume = (this.volume / 100) * 0.15;
            this.mainGainNode.gain.linearRampToValueAtTime(targetVolume, this.audioCtx.currentTime + 1.5);
            this.isActive = true;
        },

        stop: function() {
            if (!this.isActive) return;

            // Timer'ı temizle
            if (this.fireTimer) {
                clearTimeout(this.fireTimer);
                this.fireTimer = null;
            }

            // 1.0 saniye içinde sesi yumuşakça sönümlendir
            if (this.mainGainNode) {
                this.mainGainNode.gain.setValueAtTime(this.mainGainNode.gain.value, this.audioCtx.currentTime);
                this.mainGainNode.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + 1.0);
            }

            const activeSource = this.noiseSource;
            const activeLfo = this.lfoNode;
            const activeLfoFilter = this.lfoFilterNode;

            setTimeout(() => {
                try {
                    if (activeSource) activeSource.stop();
                    if (activeLfo) activeLfo.stop();
                    if (activeLfoFilter) activeLfoFilter.stop();
                } catch(e) {
                    // Zaten durdurulmuş olabilir
                }
            }, 1100);

            this.isActive = false;
        },

        setVolume: function(val) {
            this.volume = val;
            localStorage.setItem('wj_zen_volume', val);
            if (this.isActive && this.mainGainNode) {
                const targetVolume = (val / 100) * 0.15;
                this.mainGainNode.gain.linearRampToValueAtTime(targetVolume, this.audioCtx.currentTime + 0.2);
            }
        },

        changeSound: function(soundType) {
            if (this.currentSound === soundType) return;
            this.currentSound = soundType;
            localStorage.setItem('wj_zen_sound', soundType);
            
            if (this.fireTimer) {
                clearTimeout(this.fireTimer);
                this.fireTimer = null;
            }
            
            if (this.isActive) {
                this.stop();
                setTimeout(() => {
                    this.start();
                }, 1100);
            }
        },

        toggle: function() {
            const zenPanel = document.getElementById('zen-panel');
            if (this.isActive) {
                this.stop();
                btnZenToggle.classList.remove('active');
                if (zenPanel) zenPanel.classList.remove('active');
            } else {
                this.start();
                btnZenToggle.classList.add('active');
                if (zenPanel) zenPanel.classList.add('active');
            }
        }
    };

    // ==========================================================================
    // ZEN AMBİYANS KONTROL PANELİ UI BAĞLANTILARI
    // ==========================================================================
    const zenPanel = document.getElementById('zen-panel');
    const btnCloseZenPanel = document.getElementById('btn-close-zen-panel');
    const zenSoundBtns = document.querySelectorAll('.zen-sound-btn');
    const zenVolumeSlider = document.getElementById('zen-volume-slider');

    if (btnZenToggle) {
        btnZenToggle.addEventListener('click', () => {
            // Eğer aktif değilse paneli de aç, aktifse paneli kapat ve durdur
            ZenSynthesizer.toggle();
        });
    }

    if (btnCloseZenPanel) {
        btnCloseZenPanel.addEventListener('click', () => {
            if (zenPanel) zenPanel.classList.remove('active');
        });
    }

    // Ses sürgüsü event'lerini bağla
    if (zenVolumeSlider) {
        // Başlangıç değerini ayarla
        zenVolumeSlider.value = ZenSynthesizer.volume;
        
        zenVolumeSlider.addEventListener('input', (e) => {
            const vol = parseInt(e.target.value);
            ZenSynthesizer.setVolume(vol);
            
            // Custom slider track renklendirme
            const themeColor = 'hsl(14, 85%, 62%)';
            zenVolumeSlider.style.background = `linear-gradient(to right, ${themeColor} 0%, ${themeColor} ${vol}%, hsl(30, 42%, 90%) ${vol}%, hsl(30, 42%, 90%) 100%)`;
        });

        // Track arkaplanını ilk yüklemede boya
        const initialVol = ZenSynthesizer.volume;
        const themeColor = 'hsl(14, 85%, 62%)';
        zenVolumeSlider.style.background = `linear-gradient(to right, ${themeColor} 0%, ${themeColor} ${initialVol}%, hsl(30, 42%, 90%) ${initialVol}%, hsl(30, 42%, 90%) 100%)`;
    }

    // Ses seçim butonlarını bağla
    zenSoundBtns.forEach(btn => {
        // Başlangıçta kayıtlı olan sesi işaretle
        if (btn.dataset.sound === ZenSynthesizer.currentSound) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }

        btn.addEventListener('click', () => {
            zenSoundBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const soundType = btn.dataset.sound;
            ZenSynthesizer.changeSound(soundType);
        });
    });

    // ==========================================================================
    // 8. DİKEY ŞİİRSEL GÜNLÜK KİTABI PDF PROJEKTÖRÜ (PRINT ENGINE)
    // ==========================================================================
    function exportDiaryToPDF() {
        const allEntries = DB.getEntries();
        const userEntries = allEntries
            .filter(e => e.userId === currentUser.id)
            .sort((a, b) => a.timestamp - b.timestamp); // Kronolojik sıralama
            
        if (userEntries.length === 0) {
            alert("Kitaplaştırmak için henüz hiçbir günlük kaydı oluşturmamışsınız. Birkaç gün yazdıktan sonra tekrar deneyin! 📚");
            return;
        }

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert("Tarayıcınızın pop-up engelleyicisi yeni pencere açılmasını engelledi. Lütfen izin verip tekrar deneyin.");
            return;
        }

        let entriesHtml = "";
        userEntries.forEach(entry => {
            let emotionsHtml = "";
            if (entry.emotions && entry.emotions.length > 0) {
                emotionsHtml = `<div class="emotions-row">` + 
                    entry.emotions.map(emoId => {
                        const emo = EMOTIONS_LIST.find(e => e.id === emoId);
                        return emo ? `<span class="emotion-tag">${emo.emoji} ${emo.text}</span>` : '';
                    }).join('') + `</div>`;
            }
            
            let emoji = '🙂';
            if (entry.rating <= 4) emoji = entry.rating <= 2 ? '🥺' : '😕';
            else if (entry.rating >= 8) emoji = entry.rating >= 9 ? '🥰' : '😊';

            entriesHtml += `
                <div class="diary-page">
                    <div class="page-header">
                        <span class="page-date">${entry.dateStr}</span>
                        <span class="page-rating">${emoji} Puan: ${entry.rating}/10</span>
                    </div>
                    <div class="poetry-separator">✦ ✦ ✦</div>
                    <div class="poetry-content">${entry.text.replace(/\n/g, '<br>')}</div>
                    ${emotionsHtml}
                </div>
            `;
        });

        const printHtml = `
            <!DOCTYPE html>
            <html lang="tr">
            <head>
                <meta charset="UTF-8">
                <title>${currentUser.name} - Günlük Kitabım</title>
                <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
                <style>
                    body {
                        font-family: 'Outfit', sans-serif;
                        background-color: #faf7f2;
                        color: #2b2523;
                        margin: 0;
                        padding: 40px;
                        line-height: 1.7;
                    }
                    .book-cover {
                        height: 100vh;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        text-align: center;
                        page-break-after: always;
                    }
                    .cover-title {
                        font-family: 'Playfair Display', serif;
                        font-size: 3.8rem;
                        font-weight: 700;
                        color: #f27d52;
                        margin-bottom: 10px;
                    }
                    .cover-subtitle {
                        font-size: 1.1rem;
                        color: #8c7672;
                        letter-spacing: 2px;
                        text-transform: uppercase;
                        margin-bottom: 60px;
                    }
                    .cover-author {
                        font-size: 1.6rem;
                        font-family: 'Playfair Display', serif;
                        font-style: italic;
                        color: #2b2523;
                        margin-bottom: 20px;
                    }
                    .cover-date {
                        font-size: 0.95rem;
                        color: #a08c88;
                    }
                    .diary-page {
                        padding: 60px 40px;
                        max-width: 650px;
                        margin: 0 auto;
                        page-break-after: always;
                        display: flex;
                        flex-direction: column;
                        min-height: 80vh;
                        justify-content: center;
                    }
                    .diary-page:last-child {
                        page-break-after: avoid;
                    }
                    .page-header {
                        display: flex;
                        justify-content: space-between;
                        border-bottom: 1px solid #eee1d5;
                        padding-bottom: 12px;
                        margin-bottom: 45px;
                        font-size: 0.85rem;
                        font-weight: 600;
                        color: #8c7672;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    }
                    .poetry-separator {
                        text-align: center;
                        color: #f27d52;
                        font-size: 1rem;
                        margin-bottom: 45px;
                        letter-spacing: 6px;
                        opacity: 0.8;
                    }
                    .poetry-content {
                        font-family: 'Playfair Display', serif;
                        font-size: 1.38rem;
                        line-height: 1.9;
                        color: #3b3230;
                        text-align: justify;
                        margin-bottom: 45px;
                        white-space: pre-wrap;
                        padding: 0 10px;
                    }
                    .emotions-row {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 8px;
                        justify-content: center;
                        margin-top: auto;
                        padding-top: 40px;
                    }
                    .emotion-tag {
                        font-size: 0.8rem;
                        font-weight: 600;
                        padding: 6px 14px;
                        border-radius: 20px;
                        background-color: #f3ede4;
                        color: #554440;
                        border: 1px solid #e7ded2;
                    }
                    @media print {
                        body {
                            background-color: #ffffff;
                            padding: 0;
                        }
                        .diary-page {
                            padding: 40px 20px;
                            min-height: 90vh;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="book-cover">
                    <div style="flex-grow: 1;"></div>
                    <h1 class="cover-title">Günce</h1>
                    <div class="cover-subtitle">Zihnimi Dinlendiriyorum</div>
                    <div style="width: 60px; height: 1.5px; background-color: #f27d52; margin: 30px auto;"></div>
                    <div class="cover-author">${currentUser.name}</div>
                    <div class="cover-date">${new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' })}</div>
                    <div style="flex-grow: 1.5;"></div>
                    <div style="font-size: 0.8rem; color: #a08c88;">Bu eser yerel olarak saklanan günlük anılardan şiirsel formatta üretilmiştir.</div>
                </div>
                ${entriesHtml}
                <script>
                    window.onload = function() {
                        window.print();
                    };
                </script>
            </body>
            </html>
        `;

        printWindow.document.open();
        printWindow.document.write(printHtml);
        printWindow.document.close();
    }

    if (btnExportPdf) {
        btnExportPdf.addEventListener('click', exportDiaryToPDF);
    }

    // ==========================================================================
    // 9. GÜNLÜK LİSTELEME, ARAMA VE FİLTRELEME
    // ==========================================================================
    
    btnSearchToggle.addEventListener('click', () => {
        searchBar.classList.toggle('active');
        if (searchBar.classList.contains('active')) {
            searchInput.focus();
        } else {
            searchInput.value = '';
            filterRating.value = 'all';
            filterEmotion.value = 'all';
            renderEntries();
        }
    });

    searchInput.addEventListener('input', renderEntries);
    filterRating.addEventListener('change', renderEntries);
    filterEmotion.addEventListener('change', renderEntries);

    function renderEntries() {
        entriesList.innerHTML = '';
        
        const allEntries = DB.getEntries();
        const userEntries = allEntries
            .filter(e => e.userId === currentUser.id)
            .sort((a, b) => b.timestamp - a.timestamp);
        
        const query = searchInput.value.toLowerCase().trim();
        const ratingFilter = filterRating.value;
        const emotionFilter = filterEmotion.value;
        
        const filteredEntries = userEntries.filter(entry => {
            const matchesSearch = entry.text.toLowerCase().includes(query);
            
            let matchesRating = true;
            if (ratingFilter === 'good') matchesRating = entry.rating >= 8;
            else if (ratingFilter === 'mid') matchesRating = entry.rating >= 5 && entry.rating <= 7;
            else if (ratingFilter === 'bad') matchesRating = entry.rating <= 4;
            
            let matchesEmotion = true;
            if (emotionFilter !== 'all') {
                matchesEmotion = entry.emotions && entry.emotions.includes(emotionFilter);
            }
            
            return matchesSearch && matchesRating && matchesEmotion;
        });
        
        updateStats(userEntries);
        renderMoodChart(userEntries);
        
        if (filteredEntries.length === 0) {
            entriesList.innerHTML = `
                <div class="empty-entries-view">
                    <span class="empty-entries-icon">🍃</span>
                    <p class="empty-entries-text">${query || ratingFilter !== 'all' || emotionFilter !== 'all' ? 'Aramanıza uygun günlük bulunamadı.' : 'Henüz hiç günlük kaydetmemişsin. Bugün nasıl geçti?'}</p>
                </div>
            `;
            return;
        }
        
        filteredEntries.forEach(entry => {
            const card = document.createElement('article');
            card.className = 'entry-card';
            card.dataset.id = entry.id;
            
            let emoji = '🙂';
            let colorClass = 'rating-mid';
            
            if (entry.rating <= 4) {
                emoji = entry.rating <= 2 ? '🥺' : '😕';
                colorClass = 'rating-bad';
            } else if (entry.rating >= 8) {
                emoji = entry.rating >= 9 ? '🥰' : '😊';
                colorClass = 'rating-good';
            }
            
            let emotionsHtml = '';
            if (entry.emotions && entry.emotions.length > 0) {
                emotionsHtml = `<div class="entry-emotions-row">` + 
                    entry.emotions.map(emoId => {
                        const emo = EMOTIONS_LIST.find(e => e.id === emoId);
                        if (!emo) return '';
                        return `<span class="entry-emotion-tag">${emo.emoji} ${emo.text}</span>`;
                    }).join('') + `</div>`;
            }
            
            card.innerHTML = `
                <div class="entry-card-left">
                    <span class="entry-date">${entry.dateStr}</span>
                    <p class="entry-preview">${escapeHTML(entry.text)}</p>
                    ${emotionsHtml}
                </div>
                <div class="entry-card-right">
                    <span class="entry-emoji">${emoji}</span>
                    <span class="entry-badge-rating ${colorClass}">${entry.rating} / 10</span>
                </div>
            `;
            
            card.addEventListener('click', () => openDetailModal(entry));
            entriesList.appendChild(card);
        });
    }

    function escapeHTML(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function updateStats(userEntries) {
        const totalEl = document.getElementById('stats-total-entries');
        const streakEl = document.getElementById('stats-streak');
        const avgEl = document.getElementById('stats-weekly-avg');
        
        totalEl.textContent = userEntries.length;
        
        if (userEntries.length === 0) {
            streakEl.textContent = '0 Gün';
            avgEl.textContent = 'Ort: -';
            updateThemeColors(8.0); // Veri yokken şeftali renk teması varsayılandır
            return;
        }
        
        const recent7 = userEntries.slice(0, 7);
        const sum = recent7.reduce((acc, curr) => acc + curr.rating, 0);
        const avg = (sum / recent7.length).toFixed(1);
        avgEl.textContent = `Ort: ${avg}`;
        
        // Haftalık ruh hali ortalamasına göre uygulamanın renk tonunu anında değiştir
        updateThemeColors(parseFloat(avg));
        
        streakEl.textContent = `${calculateStreak(userEntries)} Gün`;
    }

    function calculateStreak(entries) {
        if (entries.length === 0) return 0;
        
        // Normalize each entry timestamp to a local midnight date timestamp
        const dates = entries.map(e => {
            const d = new Date(e.timestamp);
            d.setHours(0, 0, 0, 0);
            return d.getTime();
        });
        
        // Get unique timestamps and sort them descending (most recent first)
        const uniqueTimestamps = [...new Set(dates)];
        uniqueTimestamps.sort((a, b) => b - a);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayMs = today.getTime();
        
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        const yesterdayMs = yesterday.getTime();
        
        const latestMs = uniqueTimestamps[0];
        
        if (latestMs !== todayMs && latestMs !== yesterdayMs) {
            return 0;
        }
        
        let streak = 1;
        for (let i = 0; i < uniqueTimestamps.length - 1; i++) {
            const diffTime = Math.abs(uniqueTimestamps[i] - uniqueTimestamps[i+1]);
            // Difference in days
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
                streak++;
            } else if (diffDays > 1) {
                break;
            }
        }
        return streak;
    }

    // ==========================================================================
    // 10. DİNAMİK MİNİMALİST SVG HAFTALIK DUYGU GRAFİĞİ
    // ==========================================================================
    
    function renderMoodChart(userEntries) {
        moodChartContainer.innerHTML = '';
        
        if (userEntries.length < 2) {
            moodChartContainer.innerHTML = `
                <div class="empty-chart-text">Haftalık duygu analizinin çizilmesi için en az 2 gün yazmış olmalısın.</div>
            `;
            return;
        }
        
        const chartData = userEntries.slice(0, 7).reverse();
        
        const width = 310;
        const height = 110;
        const paddingLeft = 20;
        const paddingRight = 20;
        const paddingTop = 15;
        const paddingBottom = 20;
        
        const chartW = width - paddingLeft - paddingRight;
        const chartH = height - paddingTop - paddingBottom;
        
        const points = chartData.map((entry, idx) => {
            const x = paddingLeft + (idx / (chartData.length - 1)) * chartW;
            const y = paddingTop + (1 - (entry.rating - 1) / 9) * chartH;
            return { x, y, rating: entry.rating, date: entry.dateStr };
        });
        
        let lineD = `M ${points[0].x} ${points[0].y}`;
        for (let i = 1; i < points.length; i++) {
            const p0 = points[i-1];
            const p1 = points[i];
            const cpX1 = p0.x + (p1.x - p0.x) / 2;
            const cpY1 = p0.y;
            const cpX2 = p0.x + (p1.x - p0.x) / 2;
            const cpY2 = p1.y;
            lineD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
        }
        
        const areaD = `${lineD} L ${points[points.length-1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`;
        
        const daysLabelHtml = chartData.map((entry, idx) => {
            const dateObj = new Date(entry.date);
            const daysShort = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
            const dayName = daysShort[dateObj.getDay()];
            return `<text x="${points[idx].x}" y="${height - 5}" class="chart-label-x">${dayName}</text>`;
        }).join('');
        
        const dotsHtml = points.map(p => {
            let colorClass = 'chart-dot-mid';
            if (p.rating <= 4) colorClass = 'chart-dot-bad';
            else if (p.rating >= 8) colorClass = 'chart-dot-good';
            
            return `
                <circle cx="${p.x}" cy="${p.y}" class="chart-dot ${colorClass}">
                    <title>${p.rating} / 10</title>
                </circle>
            `;
        }).join('');

        const gridYLines = [1, 5.5, 10].map(val => {
            const y = paddingTop + (1 - (val - 1) / 9) * chartH;
            return `<line x1="${paddingLeft}" y1="${y}" x2="${width - paddingRight}" y2="${y}" class="chart-grid-line" />`;
        }).join('');
        
        const svgContent = `
            <svg class="mood-chart-svg" viewBox="0 0 ${width} ${height}">
                <defs>
                    <linearGradient id="chart-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stop-color="var(--primary-terracotta)" />
                        <stop offset="100%" stop-color="var(--accent-sunset-gold)" />
                    </linearGradient>
                    <linearGradient id="chart-area-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stop-color="var(--primary-terracotta)" />
                        <stop offset="100%" stop-color="#ffffff" />
                    </linearGradient>
                </defs>
                ${gridYLines}
                <path d="${areaD}" class="chart-area-fill" />
                <path d="${lineD}" class="chart-path-line" />
                ${dotsHtml}
                ${daysLabelHtml}
            </svg>
        `;
        
        moodChartContainer.innerHTML = svgContent;
    }

    // ==========================================================================
    // 11. DİNAMİK DETAY MODALI (POPUP / BOTTOM SHEET)
    // ==========================================================================
    
    let activeDetailEntry = null;

    function openDetailModal(entry) {
        activeDetailEntry = entry;
        
        document.getElementById('modal-date-val').textContent = entry.dateStr;
        document.getElementById('modal-rating-val').textContent = `${entry.rating} / 10`;
        document.getElementById('modal-summary-val').textContent = entry.text;
        
        const emojiEl = document.getElementById('modal-emoji-val');
        const labelEl = document.getElementById('modal-mood-label-val');
        const moodCardEl = document.getElementById('modal-mood-card');
        
        let emoji = '🙂';
        let text = 'Sıradan Bir Gün';
        let colorClass = 'rating-mid';
        
        if (entry.rating <= 2) {
            emoji = '🥺'; text = 'Çok Zor Bir Gün'; colorClass = 'rating-bad';
        } else if (entry.rating <= 4) {
            emoji = '😕'; text = 'Keyifsiz Bir Gün'; colorClass = 'rating-bad';
        } else if (entry.rating <= 6) {
            emoji = '🙂'; text = 'Sıradan Bir Gün'; colorClass = 'rating-mid';
        } else if (entry.rating <= 8) {
            emoji = '😊'; text = 'İyi Bir Gün'; colorClass = 'rating-good';
        } else {
            emoji = '🥰'; text = 'Harika Bir Gün'; colorClass = 'rating-good';
        }
        
        emojiEl.textContent = emoji;
        labelEl.textContent = text;
        moodCardEl.className = `modal-mood-badge-card ${colorClass}`;
        
        const modalEmotionsSection = document.getElementById('modal-emotions-section');
        const modalEmotionsList = document.getElementById('modal-emotions-list');
        modalEmotionsList.innerHTML = '';
        
        if (entry.emotions && entry.emotions.length > 0) {
            modalEmotionsSection.style.display = 'flex';
            entry.emotions.forEach(emoId => {
                const emo = EMOTIONS_LIST.find(e => e.id === emoId);
                if (emo) {
                    const tag = document.createElement('span');
                    tag.className = 'modal-emotion-tag';
                    tag.innerHTML = `<span>${emo.emoji}</span>${emo.text}`;
                    modalEmotionsList.appendChild(tag);
                }
            });
        } else {
            modalEmotionsSection.style.display = 'none';
        }
        
        modalDetail.classList.add('active');
    }

    function closeModal() {
        modalDetail.classList.remove('active');
        activeDetailEntry = null;
    }

    btnCloseModal.addEventListener('click', closeModal);
    modalDetailOverlay.addEventListener('click', closeModal);

    btnDeleteEntry.addEventListener('click', () => {
        if (!activeDetailEntry) return;
        
        const confirmDelete = confirm("Bu günlük kaydını silmek istediğinden emin misin?");
        if (!confirmDelete) return;
        
        const entries = DB.getEntries();
        const updatedEntries = entries.filter(e => e.id !== activeDetailEntry.id);
        DB.saveEntries(updatedEntries);
        
        closeModal();
        renderEntries();
    });

    // ==========================================================================
    // 12. PROFİL, AYARLAR VE VERİ YEDEKLEME / GERİ YÜKLEME
    // ==========================================================================
    
    btnProfileTrigger.addEventListener('click', () => {
        navigateTo('profile');
    });

    btnCloseProfile.addEventListener('click', () => {
        navigateTo('dashboard');
    });

    function initProfile() {
        if (!currentUser) return;
        
        document.getElementById('profile-name').textContent = currentUser.name;
        document.getElementById('profile-avatar-large').textContent = currentUser.name.charAt(0).toUpperCase();
        
        backupFeedbackMsg.style.display = 'none';
        backupFeedbackMsg.className = 'backup-feedback';

        checkNotificationStatus();
    }

    btnLogout.addEventListener('click', () => {
        const confirmLogout = confirm("Uygulamayı kilitlemek istediğinizden emin misiniz?");
        if (!confirmLogout) return;
        
        currentUser = null;
        navigateTo('splash');
    });

    btnDeleteAccount.addEventListener('click', () => {
        const doubleConfirm = confirm("DİKKAT! Bu işlem bu cihazdaki tüm günlüklerinizi ve şifrenizi KALICI olarak silecektir. Bu işlem geri alınamaz. Devam etmek istiyor musunuz?");
        if (!doubleConfirm) return;
        
        // Tüm yerel verileri sıfırla
        localStorage.removeItem('wj_pin');
        localStorage.removeItem('wj_user_name');
        localStorage.removeItem('wj_entries');
        
        currentUser = null;
        navigateTo('splash');
    });

    btnBackupExport.addEventListener('click', () => {
        const allEntries = DB.getEntries();
        const userEntries = allEntries.filter(e => e.userId === currentUser.id);
        
        if (userEntries.length === 0) {
            showBackupFeedback("Yedeklenecek hiçbir günlük kaydınız bulunmuyor.", "error");
            return;
        }
        
        const backupData = {
            appName: "Warm Journal",
            exportDate: new Date().toISOString(),
            userId: currentUser.id,
            userName: currentUser.name,
            entries: userEntries
        };
        
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        
        const formattedDate = new Date().toISOString().slice(0, 10);
        downloadAnchor.setAttribute("download", `gunce-yedek-${currentUser.name.toLowerCase()}-${formattedDate}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        
        showBackupFeedback("Verileriniz başarıyla yedeklendi ve dosya indirildi! 📥", "success");
    });

    fileBackupImport.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const importedData = JSON.parse(event.target.result);
                
                if (!importedData.appName || importedData.appName !== "Warm Journal" || !Array.isArray(importedData.entries)) {
                    showBackupFeedback("Geçersiz dosya formatı. Lütfen geçerli bir Günce yedek dosyası (.json) seçin.", "error");
                    return;
                }
                
                const entriesToImport = importedData.entries;
                if (entriesToImport.length === 0) {
                    showBackupFeedback("Seçilen yedek dosyasında hiçbir günlük kaydı bulunamadı.", "error");
                    return;
                }
                
                const allEntries = DB.getEntries();
                let clearedEntries = allEntries.filter(e => e.userId !== currentUser.id);
                
                const finalEntries = entriesToImport.map(entry => {
                    return {
                        ...entry,
                        userId: currentUser.id
                    };
                });
                
                const newDatabase = [...clearedEntries, ...finalEntries];
                DB.saveEntries(newDatabase);
                
                showBackupFeedback(`Başarılı! ${finalEntries.length} günlük kaydı sisteme aktarıldı ve güncellendi. 🎉`, "success");
                initDashboard();
                
            } catch (err) {
                showBackupFeedback("Dosya okunurken hata oluştu. Dosya bozuk olabilir.", "error");
            }
        };
        reader.readAsText(file);
        fileBackupImport.value = '';
    });

    function showBackupFeedback(message, type) {
        backupFeedbackMsg.textContent = message;
        backupFeedbackMsg.style.display = 'block';
        backupFeedbackMsg.className = `backup-feedback ${type}`;
    }

    // ==========================================================================
    // 13. PWA YEREL BİLDİRİM YÖNETİMİ & ZAMANLAYICI
    // ==========================================================================
    let notificationTimeout = null;

    function initNotificationSystem() {
        const toggleCheckbox = document.getElementById('notification-toggle-checkbox');
        const statusText = document.getElementById('notification-status-text');
        const timeOptions = document.getElementById('notification-time-options');
        const selectStart = document.getElementById('select-start-hour');
        const selectEnd = document.getElementById('select-end-hour');
        
        if (!toggleCheckbox || !statusText || !timeOptions || !selectStart || !selectEnd) return;
        
        // Saat seçeneklerini doldur
        selectStart.innerHTML = '';
        selectEnd.innerHTML = '';
        for (let h = 0; h < 24; h++) {
            const optVal = h;
            const optText = `${h.toString().padStart(2, '0')}:00`;
            
            const opt1 = document.createElement('option');
            opt1.value = optVal;
            opt1.textContent = optText;
            selectStart.appendChild(opt1);
            
            const opt2 = document.createElement('option');
            opt2.value = optVal;
            opt2.textContent = optText;
            selectEnd.appendChild(opt2);
        }
        
        // Değerleri localStorage'dan yükle
        const enabled = localStorage.getItem('wj_notif_enabled') === 'true';
        const startHour = parseInt(localStorage.getItem('wj_notif_start') || '21');
        const endHour = parseInt(localStorage.getItem('wj_notif_end') || '22');
        
        toggleCheckbox.checked = enabled;
        selectStart.value = startHour;
        selectEnd.value = endHour;
        
        updateNotifUI(enabled);
        
        // Değişiklikleri dinle
        toggleCheckbox.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            
            if (isChecked) {
                // Tarayıcıdan bildirim izni iste
                if ('Notification' in window) {
                    Notification.requestPermission().then(permission => {
                        if (permission === 'granted') {
                            localStorage.setItem('wj_notif_enabled', 'true');
                            updateNotifUI(true);
                            scheduleNextNotification();
                        } else {
                            alert("Bildirim izni reddedildi. Ayarlarınızdan bildirim izni vererek tekrar deneyebilirsiniz.");
                            toggleCheckbox.checked = false;
                            localStorage.setItem('wj_notif_enabled', 'false');
                            updateNotifUI(false);
                        }
                    });
                } else {
                    alert("Cihazınız bildirimleri desteklemiyor.");
                    toggleCheckbox.checked = false;
                    localStorage.setItem('wj_notif_enabled', 'false');
                    updateNotifUI(false);
                }
            } else {
                localStorage.setItem('wj_notif_enabled', 'false');
                updateNotifUI(false);
                cancelScheduledNotification();
            }
        });
        
        selectStart.addEventListener('change', () => {
            let start = parseInt(selectStart.value);
            let end = parseInt(selectEnd.value);
            
            if (start >= end) {
                // Eğer başlangıç bitişe eşit veya büyükse bitişi otomatik olarak başlangıç + 1 yap
                end = (start + 1) % 24;
                selectEnd.value = end;
            }
            
            localStorage.setItem('wj_notif_start', start.toString());
            localStorage.setItem('wj_notif_end', end.toString());
            
            if (toggleCheckbox.checked) {
                scheduleNextNotification(true); // Süreyi sıfırla ve yeniden planla
            }
        });
        
        selectEnd.addEventListener('change', () => {
            let start = parseInt(selectStart.value);
            let end = parseInt(selectEnd.value);
            
            if (end <= start) {
                // Eğer bitiş başlangıca eşit veya küçükse başlangıcı bitiş - 1 yap
                start = (end - 1 + 24) % 24;
                selectStart.value = start;
            }
            
            localStorage.setItem('wj_notif_start', start.toString());
            localStorage.setItem('wj_notif_end', end.toString());
            
            if (toggleCheckbox.checked) {
                scheduleNextNotification(true);
            }
        });
        
        if (enabled) {
            scheduleNextNotification();
        }
    }

    function updateNotifUI(enabled) {
        const statusText = document.getElementById('notification-status-text');
        const timeOptions = document.getElementById('notification-time-options');
        
        if (!statusText || !timeOptions) return;
        
        if (enabled) {
            statusText.textContent = "Açık";
            statusText.style.color = "var(--primary-terracotta)";
            timeOptions.style.display = "flex";
        } else {
            statusText.textContent = "Kapalı";
            statusText.style.color = "var(--text-muted)";
            timeOptions.style.display = "none";
        }
    }

    function scheduleNextNotification(forceRegenerate = false) {
        cancelScheduledNotification();
        
        const startHour = parseInt(localStorage.getItem('wj_notif_start') || '21');
        const endHour = parseInt(localStorage.getItem('wj_notif_end') || '22');
        
        let targetTimeMs = parseInt(localStorage.getItem('wj_notif_target_time') || '0');
        
        const now = new Date();
        
        // Eğer hedef zaman geçmişse veya zorla yeniden üretilmesi istenmişse yeni bir zaman planla
        if (forceRegenerate || targetTimeMs <= now.getTime()) {
            // Başlangıç ve bitiş dakikalarını hesapla
            const startMins = startHour * 60;
            let endMins = endHour * 60;
            
            if (endMins <= startMins) {
                endMins += 24 * 60; // Gece yarısını aşan aralıklar için
            }
            
            // Aralıkta rastgele bir dakika seç
            const randomOffset = Math.floor(Math.random() * (endMins - startMins));
            const selectedTotalMins = startMins + randomOffset;
            
            const selectedHour = Math.floor(selectedTotalMins / 60) % 24;
            const selectedMin = selectedTotalMins % 60;
            
            const targetDate = new Date();
            targetDate.setHours(selectedHour, selectedMin, 0, 0);
            
            // Eğer planlanan zaman bugün geçmişse yarına planla
            if (targetDate.getTime() <= now.getTime()) {
                targetDate.setDate(targetDate.getDate() + 1);
            }
            
            targetTimeMs = targetDate.getTime();
            localStorage.setItem('wj_notif_target_time', targetTimeMs.toString());
        }
        
        const delay = targetTimeMs - now.getTime();
        const targetDateObj = new Date(targetTimeMs);
        
        // Arayüzde bir sonraki bildirimin zamanını göster
        const infoText = document.getElementById('next-notification-info-text');
        if (infoText) {
            const isToday = targetDateObj.getDate() === now.getDate();
            const dayLabel = isToday ? "bugün" : "yarın";
            const timeLabel = `${targetDateObj.getHours().toString().padStart(2, '0')}:${targetDateObj.getMinutes().toString().padStart(2, '0')}`;
            infoText.textContent = `🌸 Bir sonraki hatırlatıcı ${dayLabel} saat ${timeLabel}'da gelecek.`;
        }
        
        // Zamanlayıcıyı ayarla
        if (delay > 0) {
            notificationTimeout = setTimeout(() => {
                triggerLocalNotification();
                // Bildirim tetiklendikten sonra bir sonraki bildirimi planla
                scheduleNextNotification(true);
            }, delay);
        }
    }

    function cancelScheduledNotification() {
        if (notificationTimeout) {
            clearTimeout(notificationTimeout);
            notificationTimeout = null;
        }
    }

    function triggerLocalNotification() {
        if (Notification.permission !== 'granted') return;
        
        const title = "Günlük Yazma Zamanı 🌸";
        const options = {
            body: "Bugün senin için nasıldı? Birkaç cümleyle gününü kaydetmek ister misin?",
            icon: './icon-192.png',
            badge: './icon-192.png',
            vibrate: [100, 50, 100],
            data: {
                timestamp: Date.now()
            }
        };
        
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(reg => {
                reg.showNotification(title, options);
            }).catch(() => {
                new Notification(title, options);
            });
        } else {
            new Notification(title, options);
        }
    }

    function checkNotificationStatus() {
        const toggleCheckbox = document.getElementById('notification-toggle-checkbox');
        if (toggleCheckbox) {
            const enabled = localStorage.getItem('wj_notif_enabled') === 'true';
            toggleCheckbox.checked = enabled;
            updateNotifUI(enabled);
            if (enabled) {
                scheduleNextNotification();
            }
        }
    }

    // ==========================================================================
    // 14. GELİŞMİŞ DÖNEMSEL RAPORLAMA VE GÖRSEL PAYLAŞIM KATMANI
    // ==========================================================================
    
    btnReportsTrigger.addEventListener('click', () => {
        navigateTo('reports');
    });

    btnCloseReports.addEventListener('click', () => {
        navigateTo('dashboard');
    });

    // Sekmeler Arası Geçiş Dinamiği
    reportTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            reportTabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeReportPeriod = btn.dataset.period;
            generateReportDetails();
        });
    });

    function initReportsScreen() {
        activeReportPeriod = 'weekly';
        reportTabBtns.forEach(b => {
            if (b.dataset.period === 'weekly') b.classList.add('active');
            else b.classList.remove('active');
        });
        generateReportDetails();
    }

    let currentCalculatedReport = null; // Canvas'ta çizilecek aktif verileri tutar

    function generateReportDetails() {
        reportDetailsContainer.innerHTML = '';
        currentCalculatedReport = null;
        
        const allEntries = DB.getEntries();
        const userEntries = allEntries.filter(e => e.userId === currentUser.id);
        
        if (userEntries.length === 0) {
            renderEmptyReportsView();
            return;
        }
        
        let filtered = [];
        let periodLabel = 'Haftalık';
        
        const now = Date.now();
        if (activeReportPeriod === 'weekly') {
            // Son 7 günün verisi
            const limit = now - 7 * 24 * 60 * 60 * 1000;
            filtered = userEntries.filter(e => e.timestamp >= limit);
            periodLabel = 'Haftalık';
        } else if (activeReportPeriod === 'monthly') {
            // Son 30 günün verisi
            const limit = now - 30 * 24 * 60 * 60 * 1000;
            filtered = userEntries.filter(e => e.timestamp >= limit);
            periodLabel = 'Aylık';
        } else {
            // Son 365 günün verisi
            const limit = now - 365 * 24 * 60 * 60 * 1000;
            filtered = userEntries.filter(e => e.timestamp >= limit);
            periodLabel = 'Yıllık';
        }
        
        if (filtered.length === 0) {
            renderEmptyPeriodView(periodLabel);
            return;
        }
        
        // 1. Ortalama Puan Hesaplama
        const sum = filtered.reduce((acc, curr) => acc + curr.rating, 0);
        const avg = (sum / filtered.length).toFixed(1);
        
        // 2. En Sık Tercih Edilen Duyguları Hesaplama
        const emotionCounts = {};
        filtered.forEach(entry => {
            if (entry.emotions) {
                entry.emotions.forEach(emo => {
                    emotionCounts[emo] = (emotionCounts[emo] || 0) + 1;
                });
            }
        });
        const sortedEmotions = Object.keys(emotionCounts).sort((a, b) => emotionCounts[b] - emotionCounts[a]);
        const topEmotions = sortedEmotions.slice(0, 3).map(emoId => {
            return EMOTIONS_LIST.find(e => e.id === emoId);
        }).filter(Boolean);
        
        // 3. Peak (Zirve) & Valley (En Zor) Gün
        const sortedByRating = [...filtered].sort((a, b) => b.rating - a.rating);
        const peakDay = sortedByRating[0];
        const valleyDay = sortedByRating[sortedByRating.length - 1];
        
        // Aktif Rapor Durumunu State'e kaydet (Canvas için)
        currentCalculatedReport = {
            userName: currentUser.name,
            period: periodLabel,
            avgRating: avg,
            emotions: topEmotions,
            peakText: peakDay.text,
            peakDate: peakDay.dateStr
        };
        
        // UI Render Etme
        let emotionsHtml = '';
        if (topEmotions.length > 0) {
            emotionsHtml = topEmotions.map(emo => {
                return `<span>${emo.emoji} ${emo.text}</span>`;
            }).join('');
        } else {
            emotionsHtml = `<span style="font-size:0.8rem; color:var(--text-muted)">Henüz duygu girilmemiş.</span>`;
        }
        
        reportDetailsContainer.innerHTML = `
            <!-- Rapor Özet Kartı -->
            <div class="glass-card report-header-card animate-float">
                <div class="report-rating-wrapper">
                    <span class="report-rating-huge">${avg}</span>
                    <span class="report-rating-label">Ortalama Duygu Puanın</span>
                </div>
                <div class="report-header-emoji">${avg >= 8 ? '🥰' : (avg >= 5 ? '😊' : '🥺')}</div>
            </div>
            
            <!-- Paylaşılabilir Şık Kart Önizlemesi -->
            <div class="report-card-preview-wrapper">
                <span class="report-card-preview-title">Kart Önizlemesi</span>
                <div class="report-share-card" id="dom-report-card">
                    <div class="report-share-card-header">${periodLabel} GÜNCE ÖZETİ</div>
                    <div class="report-share-card-title">${currentUser.name}'in Ruh Hali</div>
                    <div class="report-share-card-avg">${avg} <span style="font-size: 1.5rem; font-weight: 500">/ 10</span></div>
                    <div class="report-share-card-emotions">
                        ${emotionsHtml}
                    </div>
                    <div class="report-share-card-quote">
                        "${escapeHTML(peakDay.text)}"
                    </div>
                    <div class="report-share-card-tagline">🌸 gunce.app • zihnimi dinlendiriyorum</div>
                </div>
            </div>
            
            <!-- Paylaşım & İndirme Butonları -->
            <div class="report-action-buttons">
                <button type="button" id="btn-share-report" class="btn btn-secondary">
                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right:2px"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                    Paylaş
                </button>
                <button type="button" id="btn-download-report" class="btn btn-primary">
                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right:2px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    Kartı İndir
                </button>
            </div>
            
            <!-- Ek Detay Kartı (Peak & Valley) -->
            <div class="glass-card" style="display:flex; flex-direction:column; gap:14px; text-align:left">
                <h4 style="font-size:0.95rem; font-weight:700; color:var(--text-dark)">Zirveler ve Vadiler</h4>
                
                <div style="display:flex; gap:10px; flex-direction:column">
                    <div style="background-color:var(--white); border:1px solid var(--card-border); padding:12px; border-radius:var(--border-radius-md)">
                        <div style="display:flex; justify-content:space-between; margin-bottom:4px">
                            <span style="font-size:0.8rem; font-weight:700; color:var(--primary-terracotta)">📈 EN İYİ ANIN</span>
                            <span style="font-size:0.75rem; font-weight:700; color:var(--text-muted)">${peakDay.dateStr} (${peakDay.rating}/10)</span>
                        </div>
                        <p style="font-size:0.84rem; color:var(--text-dark); line-height:1.4">${escapeHTML(peakDay.text)}</p>
                    </div>
                    
                    <div style="background-color:var(--white); border:1px solid var(--card-border); padding:12px; border-radius:var(--border-radius-md)">
                        <div style="display:flex; justify-content:space-between; margin-bottom:4px">
                            <span style="font-size:0.8rem; font-weight:700; color:var(--danger)">📉 EN ZOR ANIN</span>
                            <span style="font-size:0.75rem; font-weight:700; color:var(--text-muted)">${valleyDay.dateStr} (${valleyDay.rating}/10)</span>
                        </div>
                        <p style="font-size:0.84rem; color:var(--text-dark); line-height:1.4">${escapeHTML(valleyDay.text)}</p>
                    </div>
                </div>
            </div>
        `;
        
        // Paylaşım ve indirme eylemlerini bağla
        document.getElementById('btn-share-report').addEventListener('click', shareReportCard);
        document.getElementById('btn-download-report').addEventListener('click', downloadReportCard);
    }

    function renderEmptyReportsView() {
        reportDetailsContainer.innerHTML = `
            <div class="empty-entries-view">
                <span class="empty-entries-icon">🍃</span>
                <h4 style="font-weight:700; margin-bottom:4px">Henüz Analiz Kartı Yok</h4>
                <p class="empty-entries-text">Dönemsel raporlarının oluşturulması için en az 1 günlük yazmalısın. Günlüklerini oluşturdukça burası renklenecek!</p>
            </div>
        `;
    }

    function renderEmptyPeriodView(periodLabel) {
        reportDetailsContainer.innerHTML = `
            <div class="empty-entries-view">
                <span class="empty-entries-icon">⏳</span>
                <h4 style="font-weight:700; margin-bottom:4px">Bu Dönemde Kayıt Yok</h4>
                <p class="empty-entries-text">Bu ${periodLabel.toLowerCase()} zaman diliminde yazılmış hiçbir günlüğün bulunmuyor. Yazdıkça raporun anında hazır olacak.</p>
            </div>
        `;
    }

    // ==========================================================================
    // 15. HTML5 CANVAS GÖRSEL KART ÇİZİM MOTORU (INSTAGRAM STORY FORMATI)
    // ==========================================================================
    
    function drawReportOnCanvas(callback) {
        if (!currentCalculatedReport) return;
        
        const data = currentCalculatedReport;
        
        // 600px x 800px Premium Paylaşım Boyutu (Story / WhatsApp için ideal)
        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 800;
        const ctx = canvas.getContext('2d');
        
        // 1. Arka Plan Degradesi (Cozy Cream -> Sunset Peach)
        const bgGrad = ctx.createLinearGradient(0, 0, 0, 800);
        bgGrad.addColorStop(0, '#fdfaf7');
        bgGrad.addColorStop(1, '#feece2');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, 600, 800);
        
        // 2. Arka Plan Süsleyici Baloncuklar
        ctx.fillStyle = 'rgba(242, 125, 82, 0.05)';
        ctx.beginPath();
        ctx.arc(600, 0, 180, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.fillStyle = 'rgba(249, 178, 108, 0.04)';
        ctx.beginPath();
        ctx.arc(0, 450, 120, 0, 2 * Math.PI);
        ctx.fill();
        
        // 3. İç Çerçeve Kenarlığı (Minimalist & Klas)
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 14;
        ctx.strokeRect(20, 20, 560, 760);
        
        ctx.strokeStyle = 'rgba(242, 125, 82, 0.1)';
        ctx.lineWidth = 1;
        ctx.strokeRect(34, 34, 532, 732);

        // Alt Çizgi Vurgusu
        ctx.fillStyle = '#f27d52';
        ctx.fillRect(34, 760, 532, 6);
        
        // 4. Logo ve Üst Başlık Çizimi
        ctx.font = 'bold 15px Outfit, sans-serif';
        ctx.fillStyle = '#f27d52';
        ctx.textAlign = 'center';
        ctx.fillText(`${data.period.toUpperCase()} GÜNCE ÖZETİ`, 300, 85);
        
        // Başlık Çizgileri
        ctx.strokeStyle = 'rgba(242, 125, 82, 0.2)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(100, 80); ctx.lineTo(160, 80);
        ctx.moveTo(440, 80); ctx.lineTo(500, 80);
        ctx.stroke();
        
        // Kullanıcı Ruh Hali Başlığı
        ctx.font = 'bold 28px Outfit, sans-serif';
        ctx.fillStyle = '#392d2b';
        ctx.fillText(`${data.userName}'in Ruh Hali`, 300, 130);
        
        // 5. Ortalama Puan (Devasa Puan Halkası)
        ctx.font = 'bold 100px Outfit, sans-serif';
        ctx.fillStyle = '#f27d52';
        ctx.textAlign = 'center';
        ctx.fillText(data.avgRating, 300, 260);
        
        ctx.font = '500 24px Outfit, sans-serif';
        ctx.fillStyle = '#8c7672';
        ctx.fillText('/ 10', 300, 300);
        
        // 6. Öne Çıkan Duygular Başlığı
        ctx.font = 'bold 16px Outfit, sans-serif';
        ctx.fillStyle = '#8c7672';
        ctx.fillText('ÖNE ÇIKAN HİSLER', 300, 360);
        
        // Duygu Pill'leri Çizimi (Canvas üzerinde yan yana kutular)
        if (data.emotions.length > 0) {
            ctx.font = 'bold 16px Outfit, sans-serif';
            
            // Toplam genişlik hesabı yaparak merkezleme
            let pillsWidth = 0;
            const gap = 12;
            const paddingX = 14;
            const paddingY = 8;
            const pillsData = [];
            
            data.emotions.forEach(emo => {
                const text = `${emo.emoji} ${emo.text}`;
                const w = ctx.measureText(text).width + paddingX * 2;
                pillsWidth += w + gap;
                pillsData.push({ text, w });
            });
            pillsWidth -= gap; // Sondaki boşluğu çıkar
            
            let startX = 300 - pillsWidth / 2;
            const y = 380;
            const h = 36;
            
            pillsData.forEach(p => {
                // Pill Arka Planı
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.roundRect(startX, y, p.w, h, 14);
                ctx.fill();
                
                ctx.strokeStyle = 'rgba(242, 125, 82, 0.15)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.roundRect(startX, y, p.w, h, 14);
                ctx.stroke();
                
                // Pill Metni
                ctx.fillStyle = '#392d2b';
                ctx.textAlign = 'left';
                ctx.fillText(p.text, startX + paddingX, y + 23);
                
                startX += p.w + gap;
            });
        }
        
        // 7. En İyi Gün Metin Alanı
        const quoteY = 460;
        const quoteW = 460;
        const quoteH = 160;
        
        // Tırnak Arka Plan Kutusu
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(70, quoteY, quoteW, quoteH, 20);
        ctx.fill();
        
        ctx.strokeStyle = 'rgba(242, 125, 82, 0.1)';
        ctx.lineWidth = 1;
        ctx.roundRect(70, quoteY, quoteW, quoteH, 20);
        ctx.stroke();
        
        // Çift Tırnak Dekoru (Büyük ve transparan)
        ctx.font = 'bold 80px Georgia, serif';
        ctx.fillStyle = 'rgba(242, 125, 82, 0.08)';
        ctx.fillText('“', 94, quoteY + 70);
        
        // Zirve Tarih Alt Başlığı
        ctx.font = 'bold 12px Outfit, sans-serif';
        ctx.fillStyle = '#f27d52';
        ctx.textAlign = 'left';
        ctx.fillText(`Peak Day • ${data.peakDate.toUpperCase()}`, 110, quoteY + 36);
        
        // Alıntı Metnini Sınırlar İçinde Sararak Yazdırma
        ctx.font = 'italic 16px Outfit, sans-serif';
        ctx.fillStyle = '#392d2b';
        ctx.textAlign = 'left';
        wrapText(ctx, `"${data.peakText}"`, 110, quoteY + 66, 380, 23);
        
        // 8. Alt Markalama (Footer)
        ctx.font = '600 13px Outfit, sans-serif';
        ctx.fillStyle = '#8c7672';
        ctx.textAlign = 'center';
        ctx.fillText('🌸 gunce.app • zihnimi dinlendiriyorum', 300, 715);
        
        // Çizimi tamamla ve resmi dondur
        callback(canvas.toDataURL('image/png'));
    }

    // Canvas Metin Sarma Algoritması
    function wrapText(context, text, x, y, maxWidth, lineHeight) {
        var words = text.split(' ');
        var line = '';
        var linesCount = 0;

        for(var n = 0; n < words.length; n++) {
            var testLine = line + words[n] + ' ';
            var metrics = context.measureText(testLine);
            var testWidth = metrics.width;
            if (testWidth > maxWidth && n > 0) {
                context.fillText(line, x, y);
                line = words[n] + ' ';
                y += lineHeight;
                linesCount++;
                if (linesCount >= 3) {
                    context.fillText(line.substring(0, line.length - 3) + '...', x, y);
                    return;
                }
            }
            else {
                line = testLine;
            }
        }
        context.fillText(line, x, y);
    }

    // Raporu Cihaza Kaydetme Eylemi
    function downloadReportCard() {
        if (!currentCalculatedReport) return;
        
        drawReportOnCanvas((dataUrl) => {
            const downloadLink = document.createElement('a');
            downloadLink.href = dataUrl;
            
            const formattedDate = new Date().toISOString().slice(0, 10);
            downloadLink.download = `gunce-rapor-${activeReportPeriod}-${formattedDate}.png`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            downloadLink.remove();
        });
    }

    // Raporu WhatsApp/Instagram/Sosyal Medyada Paylaşma Eylemi
    function shareReportCard() {
        if (!currentCalculatedReport) return;
        
        drawReportOnCanvas((dataUrl) => {
            fetch(dataUrl)
                .then(res => res.blob())
                .then(blob => {
                    const file = new File([blob], `gunce-rapor-${activeReportPeriod}.png`, { type: 'image/png' });
                    
                    if (navigator.canShare && navigator.canShare({ files: [file] })) {
                        navigator.share({
                            files: [file],
                            title: `Günce Raporum`,
                            text: `Bugünlerimi Günce (Warm Journal) uygulamasıyla puanlayıp özetliyorum. 🌸`
                        })
                        .catch(err => {
                            console.log("Paylaşım iptal edildi veya başarısız.");
                        });
                    } else {
                        downloadReportCard();
                        alert("Cihazınız doğrudan görsel paylaşımını desteklemiyor. Rapor görseliniz telefonunuza indirildi, galerinizden dilediğiniz sosyal ağda paylaşabilirsiniz! 📥");
                    }
                });
        });
    }

    // ==========================================================================
    // 16. BAŞLANGIÇ OTURUM VE KİLİT KONTROLÜ
    // ==========================================================================
    
    // Bildirim sistemini başlat
    initNotificationSystem();

    // PWA açılışında direkt kilit ekranına yönlendirerek tam gizlilik sağla
    const savedPinExists = localStorage.getItem('wj_pin');
    if (savedPinExists) {
        navigateTo('auth');
        initAuthScreen();
    } else {
        navigateTo('splash');
    }

});
