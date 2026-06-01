/* ==========================================================================
   WARM JOURNAL - CORE APPLICATION LOGIC (app.js)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================================================
    // 1. STATE & STORAGE MANAGEMENT (VERİ KATMANI)
    // ==========================================================================
    const DB = {
        getUsers: () => JSON.parse(localStorage.getItem('wj_users')) || [],
        saveUsers: (users) => localStorage.setItem('wj_users', JSON.stringify(users)),
        
        getEntries: () => JSON.parse(localStorage.getItem('wj_entries')) || [],
        saveEntries: (entries) => localStorage.setItem('wj_entries', JSON.stringify(entries)),
        
        getActiveUser: () => JSON.parse(localStorage.getItem('wj_active_user')) || null,
        setActiveUser: (user) => localStorage.setItem('wj_active_user', JSON.stringify(user)),
        clearActiveUser: () => localStorage.removeItem('wj_active_user')
    };

    let currentUser = DB.getActiveUser();
    let currentStep = 1; // Günlük yazma adımı (1, 2 veya 3)
    let selectedEmotions = [];

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

    // ==========================================================================
    // 2. DOM ELEMENTLERİNE ERİŞİM
    // ==========================================================================
    const screens = {
        splash: document.getElementById('screen-splash'),
        auth: document.getElementById('screen-auth'),
        dashboard: document.getElementById('screen-dashboard'),
        write: document.getElementById('screen-write'),
        profile: document.getElementById('screen-profile')
    };

    // Modaller
    const modalDetail = document.getElementById('modal-detail');
    const modalDetailOverlay = document.getElementById('modal-detail-overlay');

    // Butonlar
    const btnGetStarted = document.getElementById('btn-get-started');
    const btnBackSplash = document.querySelector('.btn-back-splash');
    const btnSwitchToRegister = document.getElementById('btn-switch-to-register');
    const btnSwitchToLogin = document.getElementById('btn-switch-to-login');
    const btnProfileTrigger = document.getElementById('btn-profile-trigger');
    const btnCloseProfile = document.getElementById('btn-close-profile');
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
    
    // Auth Formları
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');
    
    // Profil & Ayarlar
    const btnLogout = document.getElementById('btn-logout');
    const btnDeleteAccount = document.getElementById('btn-delete-account');
    const btnBackupExport = document.getElementById('btn-backup-export');
    const fileBackupImport = document.getElementById('backup-import-file');
    const backupFeedbackMsg = document.getElementById('backup-feedback-message');

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
        
        // Dashboard açıldığında verileri güncelle
        if (screenKey === 'dashboard') {
            initDashboard();
        }
        // Profil açıldığında bilgileri güncelle
        if (screenKey === 'profile') {
            initProfile();
        }
    }

    // ==========================================================================
    // 4. KULLANICI GİRİŞ & KAYIT İŞLEMLERİ (AUTH)
    // ==========================================================================
    
    // Splash'tan Girişe veya Dashboard'a geçiş
    btnGetStarted.addEventListener('click', () => {
        if (currentUser) {
            navigateTo('dashboard');
        } else {
            navigateTo('auth');
            switchAuthView('login');
        }
    });

    btnBackSplash.addEventListener('click', () => {
        navigateTo('splash');
    });

    // Giriş/Kayıt Panel Değişimi
    function switchAuthView(view) {
        const loginView = document.getElementById('auth-login-view');
        const registerView = document.getElementById('auth-register-view');
        
        if (view === 'login') {
            loginView.classList.add('active');
            registerView.classList.remove('active');
            formLogin.reset();
            clearErrors(formLogin);
        } else {
            loginView.classList.remove('active');
            registerView.classList.add('active');
            formRegister.reset();
            clearErrors(formRegister);
        }
    }

    btnSwitchToRegister.addEventListener('click', () => switchAuthView('register'));
    btnSwitchToLogin.addEventListener('click', () => switchAuthView('login'));

    // Form Hata Temizleme
    function clearErrors(form) {
        form.querySelectorAll('.form-group').forEach(grp => grp.classList.remove('invalid'));
        const genErr = form.querySelector('.general-error');
        if (genErr) {
            genErr.style.display = 'none';
            genErr.textContent = '';
        }
    }

    // Giriş Yapma İşlemi
    formLogin.addEventListener('submit', (e) => {
        e.preventDefault();
        clearErrors(formLogin);
        
        const emailInput = document.getElementById('login-email');
        const passwordInput = document.getElementById('login-password');
        const generalError = document.getElementById('login-general-error');
        
        let isValid = true;
        
        if (!validateEmail(emailInput.value)) {
            emailInput.parentElement.classList.add('invalid');
            isValid = false;
        }
        if (passwordInput.value.trim() === '') {
            passwordInput.parentElement.classList.add('invalid');
            isValid = false;
        }
        
        if (!isValid) return;
        
        const users = DB.getUsers();
        const foundUser = users.find(u => u.email.toLowerCase() === emailInput.value.toLowerCase().trim() && u.password === passwordInput.value);
        
        if (foundUser) {
            currentUser = { id: foundUser.id, name: foundUser.name, email: foundUser.email };
            DB.setActiveUser(currentUser);
            navigateTo('dashboard');
        } else {
            generalError.textContent = "E-posta veya şifre hatalı. Lütfen tekrar deneyin.";
            generalError.style.display = 'block';
        }
    });

    // Kayıt Olma İşlemi
    formRegister.addEventListener('submit', (e) => {
        e.preventDefault();
        clearErrors(formRegister);
        
        const nameInput = document.getElementById('register-name');
        const emailInput = document.getElementById('register-email');
        const passwordInput = document.getElementById('register-password');
        const generalError = document.getElementById('register-general-error');
        
        let isValid = true;
        
        if (nameInput.value.trim().length < 2) {
            nameInput.parentElement.classList.add('invalid');
            isValid = false;
        }
        if (!validateEmail(emailInput.value)) {
            emailInput.parentElement.classList.add('invalid');
            isValid = false;
        }
        if (passwordInput.value.length < 6) {
            passwordInput.parentElement.classList.add('invalid');
            isValid = false;
        }
        
        if (!isValid) return;
        
        const users = DB.getUsers();
        const emailExists = users.some(u => u.email.toLowerCase() === emailInput.value.toLowerCase().trim());
        
        if (emailExists) {
            generalError.textContent = "Bu e-posta adresi zaten kullanımda.";
            generalError.style.display = 'block';
            return;
        }
        
        // Yeni Kullanıcı Oluştur
        const newUser = {
            id: 'u_' + Date.now(),
            name: nameInput.value.trim(),
            email: emailInput.value.toLowerCase().trim(),
            password: passwordInput.value
        };
        
        users.push(newUser);
        DB.saveUsers(users);
        
        // Oturum aç ve yönlendir
        currentUser = { id: newUser.id, name: newUser.name, email: newUser.email };
        DB.setActiveUser(currentUser);
        navigateTo('dashboard');
    });

    function validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    // ==========================================================================
    // 5. ANA PANEL (DASHBOARD) YÖNETİMİ
    // ==========================================================================
    
    function initDashboard() {
        if (!currentUser) return;
        
        // Başlıkta karşılama metni ve tarih
        document.getElementById('dashboard-greeting').textContent = `Merhaba, ${currentUser.name}! 🌸`;
        document.getElementById('dashboard-date').textContent = getFormattedTodayDate();
        
        // Avatar harfi
        const avatarEl = document.getElementById('user-avatar');
        avatarEl.textContent = currentUser.name.charAt(0).toUpperCase();
        
        // Arama/filtreyi sıfırla
        searchBar.classList.remove('active');
        searchInput.value = '';
        filterRating.value = 'all';
        filterEmotion.value = 'all';
        
        // Günlükleri listele ve grafikleri çiz
        renderEntries();
    }

    function getFormattedTodayDate() {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        return new Date().toLocaleDateString('tr-TR', options);
    }

    // ==========================================================================
    // 6. GÜNLÜK YAZMA VE İNTERAKTİF PUANLAMA (SLIDER, EMOJI & DUYGULAR)
    // ==========================================================================
    
    // Duygu Seçim Izgarasını Çizme
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

    // Günlük Girişi Başlatma
    btnAddEntryTrigger.addEventListener('click', () => {
        currentStep = 1;
        entrySummaryInput.value = '';
        charCounter.textContent = '0 / 500';
        minCharWarning.classList.remove('active');
        
        entryRatingInput.value = 7;
        updateRatingUI(7);
        
        initEmotionsGrid();
        showWriteStep(1);
        navigateTo('write');
    });

    btnCancelWrite.addEventListener('click', () => {
        navigateTo('dashboard');
    });

    // Karakter Sayacı
    entrySummaryInput.addEventListener('input', () => {
        const len = entrySummaryInput.value.length;
        charCounter.textContent = `${len} / 500`;
        
        if (len >= 5) {
            minCharWarning.classList.remove('active');
        }
    });

    // Navigasyon: 1. Adımdan 2. Adıma
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

    // Navigasyon: 2. Adımdan 3. Adıma
    btnNextStep3.addEventListener('click', () => {
        currentStep = 3;
        showWriteStep(3);
    });

    btnPrevStep3.addEventListener('click', () => {
        currentStep = 2;
        showWriteStep(2);
    });

    // Aşamalı Görünüm Yönetimi
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

    // İnteraktif Puan Değişimi
    entryRatingInput.addEventListener('input', (e) => {
        const rating = parseInt(e.target.value);
        updateRatingUI(rating);
    });

    // Emoji ve Puanlama UI Güncellemesi
    function updateRatingUI(rating) {
        ratingNumber.textContent = rating;
        
        ratingEmoji.classList.remove('pop');
        void ratingEmoji.offsetWidth; // DOM tetikleme
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

    // Günlüğü Kaydetme
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
            emotions: [...selectedEmotions], // Seçilen duyguları kaydet
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
    // 7. GÜNLÜK LİSTELEME, ARAMA VE FİLTRELEME
    // ==========================================================================
    
    // Arama Çubuğu Aç/Kapat
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

    // Günlükleri Ekrana Çizme
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
        
        // İstatistikleri Güncelle
        updateStats(userEntries);
        
        // Grafiği Oluştur (Son 7 gün)
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
        
        // Kartları DOM'a ekle
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
            
            // Duygu etiketlerini oluştur (küçük pastel pill'ler)
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

    // İstatistik Hesaplama
    function updateStats(userEntries) {
        const totalEl = document.getElementById('stats-total-entries');
        const streakEl = document.getElementById('stats-streak');
        const avgEl = document.getElementById('stats-weekly-avg');
        
        totalEl.textContent = userEntries.length;
        
        if (userEntries.length === 0) {
            streakEl.textContent = '0 Gün';
            avgEl.textContent = 'Ort: -';
            return;
        }
        
        const recent7 = userEntries.slice(0, 7);
        const sum = recent7.reduce((acc, curr) => acc + curr.rating, 0);
        const avg = (sum / recent7.length).toFixed(1);
        avgEl.textContent = `Ort: ${avg}`;
        
        streakEl.textContent = `${calculateStreak(userEntries)} Gün`;
    }

    function calculateStreak(entries) {
        if (entries.length === 0) return 0;
        
        const dates = entries.map(e => {
            const d = new Date(e.timestamp);
            return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        });
        
        const uniqueDates = [...new Set(dates)].map(dStr => new Date(dStr));
        uniqueDates.sort((a, b) => b - a);
        
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;
        
        const latestEntryDateStr = `${uniqueDates[0].getFullYear()}-${uniqueDates[0].getMonth()}-${uniqueDates[0].getDate()}`;
        
        if (latestEntryDateStr !== todayStr && latestEntryDateStr !== yesterdayStr) {
            return 0;
        }
        
        let streak = 1;
        for (let i = 0; i < uniqueDates.length - 1; i++) {
            const diffTime = Math.abs(uniqueDates[i] - uniqueDates[i+1]);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
                streak++;
            } else if (diffDays > 1) {
                break;
            }
        }
        return streak;
    }

    // ==========================================================================
    // 8. DİNAMİK MİNİMALİST SVG HAFTALIK DUYGU GRAFİĞİ
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
                        <stop offset="0%" stop-color="#f27d52" />
                        <stop offset="100%" stop-color="#f9b26c" />
                    </linearGradient>
                    <linearGradient id="chart-area-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stop-color="#f27d52" />
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
    // 9. DİNAMİK DETAY MODALI (POPUP / BOTTOM SHEET)
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
        
        // Modal Detay Duygu Etiketleri Yükleme
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
    // 10. PROFİL, AYARLAR VE VERİ YEDEKLEME / GERİ YÜKLEME
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
        document.getElementById('profile-email').textContent = currentUser.email;
        document.getElementById('profile-avatar-large').textContent = currentUser.name.charAt(0).toUpperCase();
        
        backupFeedbackMsg.style.display = 'none';
        backupFeedbackMsg.className = 'backup-feedback';
    }

    btnLogout.addEventListener('click', () => {
        const confirmLogout = confirm("Oturumu kapatmak istediğinden emin misin?");
        if (!confirmLogout) return;
        
        currentUser = null;
        DB.clearActiveUser();
        navigateTo('splash');
    });

    btnDeleteAccount.addEventListener('click', () => {
        const doubleConfirm = confirm("DİKKAT! Bu işlem bu cihazdaki tüm günlüklerinizi ve hesabınızı KALICI olarak silecektir. Geri alınamaz. Devam etmek istiyor musunuz?");
        if (!doubleConfirm) return;
        
        const users = DB.getUsers();
        const updatedUsers = users.filter(u => u.id !== currentUser.id);
        DB.saveUsers(updatedUsers);
        
        const entries = DB.getEntries();
        const updatedEntries = entries.filter(e => e.userId !== currentUser.id);
        DB.saveEntries(updatedEntries);
        
        currentUser = null;
        DB.clearActiveUser();
        navigateTo('splash');
    });

    // --- VERİ YEDEKLEME (JSON İNDİR) ---
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

    // --- YEDEĞİ GERİ YÜKLEME (JSON YÜKLE) ---
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
    // 11. BAŞLANGIÇ OTURUM KONTROLÜ
    // ==========================================================================
    if (currentUser) {
        navigateTo('dashboard');
    } else {
        navigateTo('splash');
    }

});
