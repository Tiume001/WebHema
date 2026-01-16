document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    const SESSION_DURATION = 2 * 60 * 60 * 1000; // 2 hours in ms
    const VALID_USERNAME = "venezia";
    const VALID_PASSWORD = "guide";

    // --- State ---
    let currentLang = localStorage.getItem('venice_lang') || 'en';

    // --- DOM Elements ---
    const loginSection = document.getElementById('login-section');
    const appSection = document.getElementById('app-section');
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginError = document.getElementById('login-error');
    const logoutBtn = document.getElementById('logout-btn');
    const langSelect = document.getElementById('language-select');

    // Views
    const dashboardView = document.getElementById('dashboard-view');
    const detailView = document.getElementById('detail-view');
    const attractionsGrid = document.getElementById('attractions-grid');
    const backBtn = document.getElementById('back-btn');

    // Detail Elements
    const detailImage = document.getElementById('detail-image');
    const detailTitle = document.getElementById('detail-title');
    const detailDesc = document.getElementById('detail-desc');
    // const detailAudio = document.getElementById('detail-audio'); // Removed
    const detailPdf = document.getElementById('detail-pdf'); // Use the anchor tag instead

    // Static Text Elements
    const loginTitle = document.getElementById('login-title');
    const loginBtn = document.getElementById('login-btn');
    const dashboardTitle = document.getElementById('dashboard-title');
    const logoutText = document.getElementById('logout-text');

    // --- Initialization ---
    init();

    function init() {
        // Set initial language in selector
        langSelect.value = currentLang;
        updateStaticTexts();

        // Check Session
        if (isSessionValid()) {
            showApp();
        } else {
            showLogin();
        }

        // Event Listeners
        loginForm.addEventListener('submit', handleLogin);
        logoutBtn.addEventListener('click', handleLogout);
        langSelect.addEventListener('change', (e) => {
            currentLang = e.target.value;
            localStorage.setItem('venice_lang', currentLang);
            updateStaticTexts();
            renderDashboard(); // Re-render to update titles
            // If in detail view, we might want to refresh current detail, but for simplicity go back to dashboard or just re-render dashboard behind
            // If user is in detail view, let's try to update it dynamically if we had the current ID. 
            // For now, simple re-render of dashboard is enough, user can re-select if needed or we could track state.
            // Let's reload dashboard to be safe.
            if (detailView.classList.contains('hidden')) {
                renderDashboard();
            } else {
                // If in detail view, we need to know which one is open. 
                // Storing currentAttractionId would be good.
                if (window.currentAttractionId) {
                    renderDetail(window.currentAttractionId);
                }
            }
        });

        backBtn.addEventListener('click', () => {
            detailView.classList.add('hidden');
            dashboardView.classList.remove('hidden');
            window.currentAttractionId = null;
            // Stop audio
            const audios = detailView.querySelectorAll('audio');
            audios.forEach(audio => {
                audio.pause();
                audio.currentTime = 0;
            });
        });
    }

    // --- Authentication ---
    function handleLogin(e) {
        e.preventDefault();
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        if (username === VALID_USERNAME && password === VALID_PASSWORD) {
            const now = new Date().getTime();
            localStorage.setItem('venice_login_time', now);
            loginError.textContent = "";
            showApp();
        } else {
            loginError.textContent = translations[currentLang].error_login;
        }
    }

    function handleLogout() {
        localStorage.removeItem('venice_login_time');
        showLogin();
    }

    function isSessionValid() {
        const loginTime = localStorage.getItem('venice_login_time');
        if (!loginTime) return false;

        const now = new Date().getTime();
        if (now - parseInt(loginTime) > SESSION_DURATION) {
            localStorage.removeItem('venice_login_time'); // Expired
            return false;
        }
        return true;
    }

    function showApp() {
        loginSection.classList.add('hidden');
        loginSection.classList.remove('active-section');
        appSection.classList.remove('hidden');
        renderDashboard();
    }

    function showLogin() {
        appSection.classList.add('hidden');
        loginSection.classList.remove('hidden');
        loginSection.classList.add('active-section');
        loginForm.reset();
    }

    // --- Content Rendering ---
    function updateStaticTexts() {
        const t = translations[currentLang];
        loginTitle.textContent = t.login_title;
        loginBtn.textContent = t.login_btn;
        usernameInput.placeholder = t.username_ph;
        passwordInput.placeholder = t.password_ph;
        logoutText.textContent = t.logout;
        document.title = t.title;
        // Dashboard title is slightly dynamic "Select an Attraction" -> could be translated if added to data.
        // For now let's Hardcode "Select Attraction" in data or just keep English/Simple. 
        // Adding it to data.js would be better but I can't edit it now easily without re-writing.
        // Let's assume the user accepted the data.js structure, I will maintain English for untranslated parts or infer.
        // Actually, let's keep it simple.
    }

    function renderDashboard() {
        attractionsGrid.innerHTML = '';
        const t = translations[currentLang];

        Object.keys(t.attractions).forEach(key => {
            const item = t.attractions[key];
            const card = document.createElement('div');
            card.className = 'attraction-card';
            card.innerHTML = `
                <img src="${item.image}" alt="${item.title}" class="card-image">
                <div class="card-title">${item.title}</div>
            `;
            card.addEventListener('click', () => {
                window.currentAttractionId = key;
                renderDetail(key);
            });
            attractionsGrid.appendChild(card);
        });
    }

    // --- Utils ---
    window.downloadAudio = async (url, filename) => {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Network response was not ok');
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = downloadUrl;
            a.download = filename || url.split('/').pop();
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);
        } catch (error) {
            console.warn('Fetch download failed:', error);
            // Fallback: Notify user to use manual save
            // Detect if Italian (simple check based on currentLang) to give translated message
            const isItalian = localStorage.getItem('venice_lang') === 'it';
            const msg = isItalian
                ? "Il download automatico non è disponibile per i file locali. Per favore, clicca con il tasto destro sull'icona di download e seleziona 'Salva link con nome' (o 'Scarica file collegato')."
                : "Automatic download is not available for local files. Please right-click the download icon and select 'Save Link As' (or 'Download Linked File').";

            alert(msg);
        }
    };

    function renderDetail(key) {
        const t = translations[currentLang];
        const item = t.attractions[key];

        detailTitle.textContent = item.title;
        detailDesc.textContent = item.desc;
        detailImage.src = item.image;


        // --- Audio Rendering Logic ---
        const audioContainer = document.getElementById('audio-container');
        audioContainer.innerHTML = ''; // Clear previous players

        let audioList = [];
        if (Array.isArray(item.audio)) {
            // It's already a list of objects {title, src} or strings
            audioList = item.audio.map(a => typeof a === 'string' ? { title: 'Audio Guide', src: a } : a);
        } else if (item.audio) {
            // Single string
            audioList = [{ title: 'Audio Guide', src: item.audio }];
        }

        audioList.forEach(audioItem => {
            const playerWrapper = document.createElement('div');
            playerWrapper.className = 'audio-player';
            const filename = audioItem.src.split('/').pop();

            playerWrapper.innerHTML = `
                <div class="audio-header">
                    <label><i class="fas fa-headphones"></i> ${audioItem.title || 'Audio Guide'}</label>
                    <a href="javascript:void(0)" onclick="downloadAudio('${audioItem.src}', '${filename}')" class="audio-download-btn" title="Download Audio">
                        <i class="fas fa-download"></i>
                    </a>
                </div>
                <audio controls>
                    <source src="${audioItem.src}" type="audio/mpeg">
                    Your browser does not support the audio element.
                </audio>
            `;
            audioContainer.appendChild(playerWrapper);
        });

        // Update PDF Link
        detailPdf.href = item.pdf;

        // Clean up old chapters
        const existingChapters = document.getElementById('chapters-container');
        if (existingChapters) existingChapters.remove();

        // Render Chapters if they exist
        if (item.chapters && item.chapters.length > 0) {
            const chapContainer = document.createElement('div');
            chapContainer.id = 'chapters-container';

            item.chapters.forEach(chap => {
                const chapEl = document.createElement('div');
                chapEl.className = 'chapter-item';
                const filename = chap.audio ? chap.audio.split('/').pop() : 'audio.mp3';

                let audioHtml = '';
                if (chap.audio) {
                    audioHtml = `
                    <div class="audio-player">
                        <div class="audio-header">
                            <label><i class="fas fa-headphones"></i> Audio</label>
                            <a href="javascript:void(0)" onclick="downloadAudio('${chap.audio}', '${filename}')" class="audio-download-btn" title="Download Audio">
                                <i class="fas fa-download"></i>
                            </a>
                        </div>
                         <audio controls>
                            <source src="${chap.audio}" type="audio/mpeg">
                            Your browser does not support the audio element.
                        </audio>
                    </div>`;
                }

                chapEl.innerHTML = `
                    <h3 class="chapter-title">${chap.title}</h3>
                    <p class="chapter-text">${chap.text}</p>
                    ${audioHtml}
                `;
                chapContainer.appendChild(chapEl);
            });

            // Insert before download section
            const downloadSection = document.querySelector('.download-section');
            if (downloadSection) {
                downloadSection.parentNode.insertBefore(chapContainer, downloadSection);
            } else {
                detailDesc.parentNode.appendChild(chapContainer);
            }
        }

        dashboardView.classList.add('hidden');
        detailView.classList.remove('hidden');
    }
});
