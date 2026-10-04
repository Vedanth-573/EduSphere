/**
 * Student Digital Locker - Main Script
 * Handles Authentication, Navigation, and Data Management using IndexedDB and LocalStorage.
 */

// --- Constants & Variables ---
const DB_NAME = 'EduLockerDB';
const DB_VERSION = 2; 
const STORE_NAME = 'lockerItems';

let db;
import { auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile, setPersistence, browserSessionPersistence, browserLocalPersistence, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup } from './firebase.js';

let currentUser = null; // { name, email }

// --- DOM Elements: Auth ---
const authScreen = document.getElementById('auth-screen');
const appScreen = document.getElementById('app-screen');
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');
const authBtn = document.getElementById('auth-btn');
const toggleAuth = document.getElementById('toggle-auth');
const toggleText = document.getElementById('toggle-text');
const nameGroup = document.getElementById('name-group');
const nameInput = document.getElementById('name-input');
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');

let isSignup = false;

// --- Initialize Database ---
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = event => reject("DB error: " + event.target.error);
        
        request.onsuccess = event => {
            db = event.target.result;
            resolve(db);
        };
        
        request.onupgradeneeded = event => {
            const db = event.target.result;
            let store;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
            } else {
                store = event.target.transaction.objectStore(STORE_NAME);
            }
            if (!store.indexNames.contains('userId')) {
                store.createIndex('userId', 'userId', { unique: false });
            }
        };
    });
}

// --- Authentication ---
toggleAuth.addEventListener('click', (e) => {
    e.preventDefault();
    isSignup = !isSignup;
    if (isSignup) {
        authTitle.textContent = "Create Locker";
        authSubtitle.textContent = "Sign up for your secure digital vault";
        authBtn.textContent = "Sign Up";
        toggleText.textContent = "Already have an account?";
        toggleAuth.textContent = "Login";
        nameGroup.classList.remove('hidden');
        nameInput.required = true;
        document.getElementById('forgot-password-link').style.display = 'none';
    } else {
        authTitle.textContent = "Welcome Back";
        authSubtitle.textContent = "Login to your digital locker";
        authBtn.textContent = "Login";
        toggleText.textContent = "Don't have an account?";
        toggleAuth.textContent = "Sign Up";
        nameGroup.classList.add('hidden');
        nameInput.required = false;
        document.getElementById('forgot-password-link').style.display = 'block';
    }
});

const showPasswordCheckbox = document.getElementById('show-password');
if (showPasswordCheckbox) {
    showPasswordCheckbox.addEventListener('change', () => {
        if (showPasswordCheckbox.checked) {
            passwordInput.type = 'text';
        } else {
            passwordInput.type = 'password';
        }
    });
}

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;
    
    const originalText = authBtn.innerHTML;
    authBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Authenticating...';
    authBtn.disabled = true;
    
    try {
        await setPersistence(auth, browserLocalPersistence);
        
        if (isSignup) {
            const name = nameInput.value.trim();
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            // Save the Full Name to Firebase Profile
            await updateProfile(userCredential.user, { displayName: name });
            // Update current user so UI reflects immediately
            if (currentUser) currentUser.name = name;
        } else {
            await signInWithEmailAndPassword(auth, email, password);
        }
    } catch (error) {
        let errorMsg = error.message;
        if (error.code === 'auth/invalid-credential') {
            errorMsg = "Invalid email or password. If you don't have an account, please click 'Sign Up' first.";
        } else if (error.code === 'auth/email-already-in-use') {
            errorMsg = "An account with this email already exists. Please log in instead.";
        } else if (error.code === 'auth/weak-password') {
            errorMsg = "Password is too weak. Please use at least 6 characters.";
        }
        alert(errorMsg);
        authBtn.innerHTML = originalText;
        authBtn.disabled = false;
    }
});

document.getElementById('forgot-password-link').addEventListener('click', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim().toLowerCase();
    if (!email) {
        alert("Please enter your email address first to reset your password.");
        return;
    }
    
    try {
        await sendPasswordResetEmail(auth, email);
        alert("Password reset email sent! Check your inbox.");
    } catch (error) {
        alert("Error sending password reset email: " + error.message);
    }
});

const googleAuthBtn = document.getElementById('google-auth-btn');
if (googleAuthBtn) {
    googleAuthBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const originalText = googleAuthBtn.innerHTML;
        googleAuthBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Loading...';
        googleAuthBtn.disabled = true;
        
        try {
            const provider = new GoogleAuthProvider();
            // Optional: you can set custom parameters like prompt: 'select_account'
            // provider.setCustomParameters({ prompt: 'select_account' });
            
            await signInWithPopup(auth, provider);
            // After successful sign in, checkAuth (onAuthStateChanged) will catch the state change.
        } catch (error) {
            let errorMsg = error.message;
            if (error.code === 'auth/popup-closed-by-user') {
                errorMsg = "Google sign-in popup was closed before completion.";
            } else if (error.code === 'auth/popup-blocked') {
                errorMsg = "Google sign-in popup was blocked by your browser. Please allow popups.";
            }
            alert(errorMsg);
            googleAuthBtn.innerHTML = originalText;
            googleAuthBtn.disabled = false;
        }
    });
}

function loginUser(user) {
    currentUser = user;
    
    const btn = document.getElementById('auth-btn');
    if (btn) {
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Authenticating...';
        btn.disabled = true;
        
        const authCard = document.querySelector('.auth-card');
        if(authCard) authCard.classList.add('login-success-anim');
        
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
            if(authCard) authCard.classList.remove('login-success-anim');
            initializeApp();
        }, 300);
    } else {
        initializeApp();
    }
}

function checkAuth() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            loginUser({ email: user.email, name: user.displayName || user.email.split('@')[0] });
        } else {
            currentUser = null;
            authScreen.classList.add('active');
            appScreen.classList.remove('active');
            
            // Reset button if user signed out
            const btn = document.getElementById('auth-btn');
            if (btn) {
                btn.innerHTML = isSignup ? 'Sign Up' : 'Login';
                btn.disabled = false;
            }
        }
    });
}

// --- Forgot Password Flow ---
document.getElementById('forgot-password-link').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('forgot-password-modal').style.display = 'flex';
});

document.getElementById('back-to-login-btn').addEventListener('click', () => {
    document.getElementById('forgot-password-modal').style.display = 'none';
});

document.getElementById('send-reset-btn').addEventListener('click', () => {
    const email = document.getElementById('forgot-email-input').value.trim();
    if (!email) return alert("Please enter your registered email address.");
    
    // Simulate sending email
    alert("Password reset instructions will be sent if the account exists.");
    document.getElementById('forgot-password-modal').style.display = 'none';
});

// --- Logout Flow ---
const logoutConfirmModal = document.getElementById('logout-confirm-modal');

document.getElementById('logout-btn-settings').addEventListener('click', (e) => {
    e.preventDefault();
    logoutConfirmModal.style.display = 'flex';
});

document.getElementById('cancel-logout-btn').addEventListener('click', () => {
    logoutConfirmModal.style.display = 'none';
});

document.getElementById('confirm-logout-btn').addEventListener('click', async () => {
    logoutConfirmModal.style.display = 'none';
    try {
        await signOut(auth);
    } catch(e) {
        console.error("Error signing out: ", e);
    }
    if (isSignup) toggleAuth.click(); // Reset to login view
});

// --- Navigation & UI Initialization ---
const sidebar = document.getElementById('sidebar');
const navItems = document.querySelectorAll('.nav-item[data-target], .nav-action-btn[data-target]');
const sections = document.querySelectorAll('.content-section');

function navigateTo(targetId) {
    // Hide all sections
    sections.forEach(sec => sec.classList.remove('active'));
    // Show target
    document.getElementById(targetId).classList.add('active');
    
    // Update sidebar active state
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(nav => {
        if (nav.dataset.target === targetId) nav.classList.add('active');
        else nav.classList.remove('active');
    });

    // Close mobile sidebar if open
    sidebar.classList.remove('open');

    // Refresh data if specific page
    if (targetId === 'dashboard-section') loadDashboard();
    if (targetId === 'manage-section') renderManageTable();
    if (targetId === 'my-sphere-section') renderMySphere();
    if (targetId === 'search-section') performSearch();
    if (targetId === 'trash-section') renderTrashTable();
    if (targetId === 'upload-section') {
        const uploadCategory = document.getElementById('upload-category');
        if (uploadCategory) {
            uploadCategory.value = 'Documents';
        }
    }
}

navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo(item.dataset.target);
    });
});

document.getElementById('sidebar-profile').addEventListener('click', () => navigateTo('profile-section'));

// Mobile menu toggles
document.getElementById('mobile-menu-btn').addEventListener('click', () => sidebar.classList.add('open'));
document.getElementById('mobile-menu-close').addEventListener('click', () => sidebar.classList.remove('open'));

// Theme Initialization & Toggle
const themeToggle = document.getElementById('theme-toggle');
const savedTheme = localStorage.getItem('eduLockerTheme');

if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    if (themeToggle) themeToggle.checked = true;
} else {
    document.body.classList.remove('dark-mode');
    localStorage.setItem('eduLockerTheme', 'light');
    if (themeToggle) themeToggle.checked = false;
}

if (themeToggle) {
    themeToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('eduLockerTheme', 'dark');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('eduLockerTheme', 'light');
        }
    });
}

// --- Color Theme Logic ---
const colorCircles = document.querySelectorAll('.color-circle');
const currentThemeColor = localStorage.getItem('eduLockerThemeColor') || 'blue';

function applyThemeColor(color) {
    document.body.classList.remove(
        'theme-purple', 'theme-emerald', 'theme-rose', 'theme-orange', 
        'theme-cyan', 'theme-indigo', 'theme-amber', 'theme-pink'
    );
    if (color !== 'blue') {
        document.body.classList.add(`theme-${color}`);
    }
    
    colorCircles.forEach(circle => {
        circle.classList.toggle('active', circle.dataset.color === color);
    });

    // Update chart colors dynamically if it exists
    if (window.myStorageChart) {
        setTimeout(() => {
            const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
            window.myStorageChart.data.datasets[0].backgroundColor[0] = primaryColor;
            window.myStorageChart.update();
            
            // Update progress bar
            const progressBar = document.getElementById('storage-progress-bar');
            if (progressBar) progressBar.style.backgroundColor = primaryColor;
        }, 50); // slight delay for CSS variable to apply
    }
}

// Apply color theme on load
applyThemeColor(currentThemeColor);

colorCircles.forEach(circle => {
    circle.addEventListener('click', () => {
        const selectedColor = circle.dataset.color;
        applyThemeColor(selectedColor);
        localStorage.setItem('eduLockerThemeColor', selectedColor);
        showToast('Accent color updated successfully!', 'success');
    });
});

// --- Background Theme Logic ---
const bgCircles = document.querySelectorAll('.bg-circle');
const currentBgStyle = localStorage.getItem('eduLockerBgStyle') || 'default';

function applyBgStyle(bg) {
    document.body.classList.remove('bg-midnight', 'bg-black', 'bg-charcoal');
    if (bg !== 'default') {
        document.body.classList.add(`bg-${bg}`);
    }
    
    bgCircles.forEach(circle => {
        circle.classList.toggle('active', circle.dataset.bg === bg);
    });
}

applyBgStyle(currentBgStyle);

bgCircles.forEach(circle => {
    circle.addEventListener('click', () => {
        const selectedBg = circle.dataset.bg;
        applyBgStyle(selectedBg);
        localStorage.setItem('eduLockerBgStyle', selectedBg);
        showToast('Background style updated!', 'success');
    });
});

// --- Font/Typography Logic ---
const fontBtns = document.querySelectorAll('.font-btn');
const currentFont = localStorage.getItem('eduLockerFont') || 'inter';

function applyFont(fontName) {
    document.body.classList.remove(
        'font-inter', 'font-roboto', 'font-outfit', 'font-poppins', 
        'font-serif', 'font-lora', 'font-caveat', 'font-oswald', 'font-mono'
    );
    document.body.classList.add(`font-${fontName}`);
    
    fontBtns.forEach(btn => {
        if(btn.dataset.font === fontName) {
            btn.classList.add('active');
            btn.classList.remove('btn-secondary');
        } else {
            btn.classList.remove('active');
            btn.classList.add('btn-secondary');
        }
    });
}

applyFont(currentFont);

// --- Background Image Setup ---
const bgImageInput = document.getElementById('bg-image-input');
const clearBgBtn = document.getElementById('clear-bg-btn');
const bgImageContainer = document.getElementById('bg-image-container');

function applyBackgroundImage(src) {
    if (src) {
        // Only wrap in url() if it's not already wrapped (if it's a dataURL, it's not wrapped. Wait, if we use src, we wrap it)
        const val = src.startsWith('url') ? src : `url("${src}")`;
        bgImageContainer.style.backgroundImage = val;
        document.body.classList.add('has-bg-image');
        clearBgBtn.classList.remove('hidden');
        
        // Update active class on presets
        document.querySelectorAll('.bg-preset').forEach(img => {
            if (img.dataset.src === src) img.classList.add('active');
            else img.classList.remove('active');
        });
    } else {
        bgImageContainer.style.backgroundImage = 'none';
        document.body.classList.remove('has-bg-image');
        clearBgBtn.classList.add('hidden');
        document.querySelectorAll('.bg-preset').forEach(img => img.classList.remove('active'));
    }
}

const savedBgImage = localStorage.getItem('eduLockerBgImage');
if (savedBgImage) applyBackgroundImage(savedBgImage);

// Handle presets
document.querySelectorAll('.bg-preset').forEach(preset => {
    preset.addEventListener('click', () => {
        const src = preset.dataset.src;
        localStorage.setItem('eduLockerBgImage', src);
        applyBackgroundImage(src);
        showToast('Background preset applied!');
    });
});

bgImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1920;
                const MAX_HEIGHT = 1080;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                } else {
                    if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                const dataUrl = canvas.toDataURL('image/jpeg', 0.6); // Compress to save localstorage space
                try {
                    localStorage.setItem('eduLockerBgImage', dataUrl);
                    applyBackgroundImage(dataUrl);
                    showToast('Background image applied successfully!');
                } catch(err) {
                    alert('Image is too large to save! Please try a smaller image.');
                }
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
});

clearBgBtn.addEventListener('click', () => {
    localStorage.removeItem('eduLockerBgImage');
    applyBackgroundImage(null);
    bgImageInput.value = '';
    showToast('Background image removed');
});


// Handle text size
const sizeBtns = document.querySelectorAll('.size-btn');
const currentSize = localStorage.getItem('eduLockerTextSize') || 'text-md';

function applyTextSize(sizeClass) {
    document.documentElement.classList.remove('text-sm', 'text-md', 'text-lg', 'text-xl');
    document.documentElement.classList.add(sizeClass);
    
    sizeBtns.forEach(btn => {
        if(btn.dataset.size === sizeClass) {
            btn.classList.add('active');
            btn.classList.remove('btn-secondary');
        } else {
            btn.classList.remove('active');
            btn.classList.add('btn-secondary');
        }
    });
}
applyTextSize(currentSize);

sizeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const sizeClass = btn.dataset.size;
        localStorage.setItem('eduLockerTextSize', sizeClass);
        applyTextSize(sizeClass);
        showToast('Text size updated!');
    });
});

fontBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const selectedFont = btn.dataset.font;
        applyFont(selectedFont);
        localStorage.setItem('eduLockerFont', selectedFont);
        showToast('Typography updated!', 'success');
    });
});

// App init
function initializeApp() {
    authScreen.classList.remove('active');
    appScreen.classList.add('active');
    
    // Set Sidebar Info
    document.getElementById('sidebar-name').textContent = currentUser.name;
    
    // Dynamic Greeting
    const hour = new Date().getHours();
    let greeting = 'Good Evening';
    if (hour >= 5 && hour < 12) greeting = 'Good Morning';
    else if (hour >= 12 && hour < 17) greeting = 'Good Afternoon';
    else if (hour >= 21 || hour < 5) greeting = 'Good Night';
    
    document.getElementById('dash-welcome').textContent = `${greeting}, ${currentUser.name.split(' ')[0]}!`;
    
    // loadProfileData will handle setting the avatar
    loadProfileData();
    loadAllDocuments(() => {
        navigateTo('dashboard-section');
    });
}

// --- Data Management (Profile) ---
function getProfileKey() {
    return `profile_${currentUser.email}`;
}

let currentProfilePic = null;

let cropper = null;

// Handle profile pic change
document.getElementById('profile-pic-input').addEventListener('change', function(e) {
    if (e.target.files && e.target.files[0]) {
        const reader = new FileReader();
        reader.onload = function(evt) {
            const cropModal = document.getElementById('crop-modal');
            const cropImage = document.getElementById('crop-image');
            
            cropImage.src = evt.target.result;
            cropModal.style.display = 'flex';
            
            if (cropper) {
                cropper.destroy();
            }
            
            cropper = new Cropper(cropImage, {
                aspectRatio: 1,
                viewMode: 1,
                autoCropArea: 1,
            });
        };
        reader.readAsDataURL(e.target.files[0]);
    }
});

// Handle crop cancel
document.getElementById('crop-cancel-btn').addEventListener('click', () => {
    document.getElementById('crop-modal').style.display = 'none';
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
    document.getElementById('profile-pic-input').value = '';
});

// Handle crop save
document.getElementById('crop-save-btn').addEventListener('click', () => {
    if (cropper) {
        const canvas = cropper.getCroppedCanvas({
            width: 300,
            height: 300
        });
        
        currentProfilePic = canvas.toDataURL('image/jpeg', 0.8);
        document.getElementById('profile-pic-preview').src = currentProfilePic;
        
        document.getElementById('crop-modal').style.display = 'none';
        cropper.destroy();
        cropper = null;
    }
});

function loadProfileData() {
    const data = JSON.parse(localStorage.getItem(getProfileKey()) || '{}');
    
    currentProfilePic = data.profilePic || null;
    const defaultPic = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><circle cx="64" cy="64" r="60" fill="none" stroke="%233b82f6" stroke-width="4"/><circle cx="64" cy="48" r="22" fill="%233b82f6"/><path d="M104,110 C96,88 78,76 64,76 C50,76 32,88 24,110 C34,120 48,124 64,124 C80,124 94,120 104,110 Z" fill="%233b82f6"/></svg>';
    
    document.getElementById('profile-pic-preview').src = currentProfilePic || defaultPic;
    
    // Update sidebar avatar
    const avatarImg = document.getElementById('sidebar-avatar-img');
    if (avatarImg) {
        avatarImg.src = currentProfilePic || defaultPic;
        avatarImg.style.display = 'block';
    }
    
    document.getElementById('profile-email').value = currentUser.email;
    document.getElementById('profile-name').value = data.name || currentUser.name;
    document.getElementById('profile-id').value = data.studentId || '';
    document.getElementById('profile-dob').value = data.dob || '';
    document.getElementById('profile-gender').value = data.gender || '';
    document.getElementById('profile-college').value = data.college || '';
    document.getElementById('profile-dept').value = data.dept || '';
    document.getElementById('profile-year').value = data.year || '';
    document.getElementById('profile-semester').value = data.semester || '';
    document.getElementById('profile-phone').value = data.phone || '';
    document.getElementById('profile-address').value = data.address || '';

    // Update Profile Page Static Info Panel
    const displayName = document.getElementById('profile-display-name');
    if (displayName) displayName.textContent = data.name || currentUser.name;
    const displayId = document.getElementById('profile-display-id');
    if (displayId) displayId.textContent = data.studentId ? `ID: ${data.studentId}` : 'ID: Not Set';

    // Update sidebar profile
    if(data.studentId) document.getElementById('sidebar-id').textContent = `ID: ${data.studentId}`;
    if(data.dept) document.getElementById('sidebar-dept').textContent = `Dept: ${data.dept}`;
}

document.getElementById('profile-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const profile = {
        name: document.getElementById('profile-name').value,
        studentId: document.getElementById('profile-id').value,
        dob: document.getElementById('profile-dob').value,
        gender: document.getElementById('profile-gender').value,
        college: document.getElementById('profile-college').value,
        dept: document.getElementById('profile-dept').value,
        year: document.getElementById('profile-year').value,
        semester: document.getElementById('profile-semester').value,
        phone: document.getElementById('profile-phone').value,
        address: document.getElementById('profile-address').value,
        profilePic: currentProfilePic
    };
    localStorage.setItem(getProfileKey(), JSON.stringify(profile));
    
    // Update sidebar
    document.getElementById('sidebar-name').textContent = profile.name || currentUser.name;
    if(profile.studentId) document.getElementById('sidebar-id').textContent = `ID: ${profile.studentId}`;
    if(profile.dept) document.getElementById('sidebar-dept').textContent = `Dept: ${profile.dept}`;
    
    // Update left static panel in Profile Page
    const displayName = document.getElementById('profile-display-name');
    if (displayName) displayName.textContent = profile.name || currentUser.name;
    const displayId = document.getElementById('profile-display-id');
    if (displayId) displayId.textContent = profile.studentId ? `ID: ${profile.studentId}` : 'ID: Not Set';

    const defaultPic = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><circle cx="64" cy="64" r="60" fill="none" stroke="%233b82f6" stroke-width="4"/><circle cx="64" cy="48" r="22" fill="%233b82f6"/><path d="M104,110 C96,88 78,76 64,76 C50,76 32,88 24,110 C34,120 48,124 64,124 C80,124 94,120 104,110 Z" fill="%233b82f6"/></svg>';
    const avatarImg = document.getElementById('sidebar-avatar-img');
    if (avatarImg) {
        avatarImg.src = profile.profilePic || defaultPic;
    }
    
    showToast('Profile updated successfully!', 'success');
});

const refreshProfileBtn = document.getElementById('refresh-profile-btn');
if (refreshProfileBtn) {
    refreshProfileBtn.addEventListener('click', () => {
        document.getElementById('profile-name').value = '';
        document.getElementById('profile-id').value = '';
        document.getElementById('profile-dob').value = '';
        document.getElementById('profile-gender').value = '';
        document.getElementById('profile-college').value = '';
        document.getElementById('profile-dept').value = '';
        document.getElementById('profile-year').value = '';
        document.getElementById('profile-semester').value = '';
        document.getElementById('profile-phone').value = '';
        document.getElementById('profile-address').value = '';
        showToast('Profile details cleared.', 'success');
    });
}

const undoProfileBtn = document.getElementById('undo-profile-btn');
if (undoProfileBtn) {
    undoProfileBtn.addEventListener('click', () => {
        loadProfileData();
        showToast('Profile edits undone.', 'success');
    });
}


// --- Document Management (IndexedDB) ---
let currentDocuments = []; // Cache for logged in user (active docs)
let deletedDocuments = []; // Cache for logged in user (trashed docs)

function loadAllDocuments(callback) {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('userId');
    const request = index.getAll(IDBKeyRange.only(currentUser.email));
    
    request.onsuccess = () => {
        const allDocs = request.result;
        
        // Process trash auto-deletion (30 days = 30 * 24 * 60 * 60 * 1000 ms)
        const now = Date.now();
        const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
        const toHardDelete = [];
        
        currentDocuments = [];
        deletedDocuments = [];
        
        allDocs.forEach(doc => {
            if (doc.isDeleted) {
                if (now - doc.deletedAt > THIRTY_DAYS) {
                    toHardDelete.push(doc.id);
                } else {
                    deletedDocuments.push(doc);
                }
            } else {
                currentDocuments.push(doc);
            }
        });
        
        currentDocuments.sort((a, b) => new Date(b.date) - new Date(a.date));
        deletedDocuments.sort((a, b) => b.deletedAt - a.deletedAt);
        
        // Execute hard deletions in background if needed
        if (toHardDelete.length > 0) {
            const delTx = db.transaction([STORE_NAME], 'readwrite');
            const delStore = delTx.objectStore(STORE_NAME);
            toHardDelete.forEach(id => delStore.delete(id));
        }

        if (callback) callback();
    };
}

function saveDocument(doc) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(doc);
        request.onsuccess = () => {
            loadAllDocuments(resolve); // Reload cache
        };
        request.onerror = () => reject();
    });
}

function deleteDocument(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const getReq = store.get(id);
        getReq.onsuccess = () => {
            if (getReq.result) {
                const doc = getReq.result;
                doc.isDeleted = true;
                doc.deletedAt = Date.now();
                const updateReq = store.put(doc);
                updateReq.onsuccess = () => loadAllDocuments(resolve);
                updateReq.onerror = () => reject();
            } else {
                resolve();
            }
        };
        getReq.onerror = () => reject();
    });
}

function markDocumentAsOpened(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const getReq = store.get(Number(id));
        getReq.onsuccess = () => {
            if (getReq.result) {
                const doc = getReq.result;
                doc.lastOpened = Date.now();
                const updateReq = store.put(doc);
                updateReq.onsuccess = () => loadAllDocuments(resolve);
                updateReq.onerror = () => reject();
            } else {
                resolve();
            }
        };
        getReq.onerror = () => reject();
    });
}

function restoreDocument(id, newLocation) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const getReq = store.get(id);
        getReq.onsuccess = () => {
            if (getReq.result) {
                const doc = getReq.result;
                doc.isDeleted = false;
                if (newLocation) {
                    doc.category = newLocation;
                    // Auto-add to custom folders if it's a new one
                    let customFolders = [];
                    if (currentUser) {
                        customFolders = JSON.parse(localStorage.getItem('eduLockerFolders_' + currentUser.uid)) || [];
                    }
                    if (!customFolders.includes(newLocation)) {
                        customFolders.push(newLocation);
                        if (currentUser) {
                            localStorage.setItem('eduLockerFolders_' + currentUser.uid, JSON.stringify(customFolders));
                        }
                    }
                }
                delete doc.deletedAt;
                const updateReq = store.put(doc);
                updateReq.onsuccess = () => loadAllDocuments(resolve);
                updateReq.onerror = () => reject();
            } else {
                resolve();
            }
        };
        getReq.onerror = () => reject();
    });
}

function hardDeleteDocument(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);
        request.onsuccess = () => {
            loadAllDocuments(resolve);
        };
        request.onerror = () => reject();
    });
}

window.emptyTrash = function() {
    if (deletedDocuments.length === 0) return alert('Trash is already empty.');
    if (!confirm('Are you sure you want to permanently delete all items in the Trash? This cannot be undone.')) return;
    
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    let count = 0;
    
    deletedDocuments.forEach(doc => {
        const req = store.delete(doc.id);
        req.onsuccess = () => {
            count++;
            if(count === deletedDocuments.length) {
                loadAllDocuments(() => {
                    renderTrashTable();
                    showToast('Trash emptied successfully');
                });
            }
        };
    });
}

// --- Upload Feature ---
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
let selectedUploadFile = null;

dropZone.addEventListener('click', (e) => { if(e.target === dropZone || e.target.tagName !== 'BUTTON') fileInput.click(); });
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', e => {
    e.preventDefault(); dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', e => { if (e.target.files.length) handleFile(e.target.files[0]); });

function handleFile(file) {
    selectedUploadFile = file;
    document.getElementById('selected-file-name').textContent = file.name;
    document.getElementById('selected-file-size').textContent = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
    
    const iconEl = document.getElementById('file-type-icon');
    let iconClass = 'fa-file';
    let iconColor = 'var(--primary)';
    
    if (file.type.startsWith('image/')) { iconClass = 'fa-file-image'; iconColor = '#10b981'; }
    else if (file.type === 'application/pdf') { iconClass = 'fa-file-pdf'; iconColor = '#ef4444'; }
    else if (file.type.includes('word') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) { iconClass = 'fa-file-word'; iconColor = '#2563eb'; }
    
    iconEl.className = `fa-solid ${iconClass}`;
    iconEl.style.color = iconColor;
    
    document.getElementById('file-preview-container').style.display = 'flex';

    if(!document.getElementById('upload-name').value) {
        document.getElementById('upload-name').value = file.name.split('.')[0];
    }
}

document.getElementById('submit-upload-btn').addEventListener('click', (e) => {
    if (!selectedUploadFile) return alert("Please select a file first.");
    
    const btn = e.target;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading...';
    btn.disabled = true;
    
    const name = document.getElementById('upload-name').value || selectedUploadFile.name;
    const category = document.getElementById('upload-category').value;
    const expiry = document.getElementById('upload-expiry').value;
    const desc = document.getElementById('upload-desc').value;
    const important = document.getElementById('upload-important').checked;
    
    const reader = new FileReader();
    reader.onload = (ev) => {
        const doc = {
            userId: currentUser.email,
            name,
            category,
            desc,
            expiry,
            important,
            data: ev.target.result,
            mimeType: selectedUploadFile.type,
            size: selectedUploadFile.size,
            date: new Date().toISOString()
        };
        
        // Show cancel button
        const cancelBtn = document.getElementById('cancel-upload-btn');
        if (cancelBtn) cancelBtn.style.display = 'block';
        
        // Fake delay for visual feedback and cancel window
        window.currentUploadTimeout = setTimeout(() => {
            if (cancelBtn) cancelBtn.style.display = 'none';
            
            saveDocument(doc).then(() => {
                showToast("✓ Document uploaded successfully");
                // Reset form
                selectedUploadFile = null;
                document.getElementById('selected-file-name').textContent = "";
                document.getElementById('selected-file-size').textContent = "";
                document.getElementById('upload-name').value = "";
                document.getElementById('upload-expiry').value = "";
                document.getElementById('upload-desc').value = "";
                document.getElementById('upload-important').checked = false;
                document.getElementById('file-preview-container').style.display = 'none';
                fileInput.value = "";
                
                btn.innerHTML = originalText;
                btn.disabled = false;
                
                navigateTo('my-sphere-section');
            });
        }, 3000);
    };
    reader.readAsDataURL(selectedUploadFile);
});

// Cancel Upload Logic
const cancelUploadBtn = document.getElementById('cancel-upload-btn');
if (cancelUploadBtn) {
    cancelUploadBtn.addEventListener('click', () => {
        if (window.currentUploadTimeout) {
            clearTimeout(window.currentUploadTimeout);
            window.currentUploadTimeout = null;
            
            showToast("Upload cancelled.", "warning");
            
            // Hide cancel button
            cancelUploadBtn.style.display = 'none';
            
            // Reset upload button
            const submitBtn = document.getElementById('submit-upload-btn');
            submitBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up" style="margin-right: 8px;"></i> Securely Upload Document';
            submitBtn.disabled = false;
        }
    });
}

// --- Dashboard Logic ---
function loadDashboard() {
    const totalDocs = currentDocuments.length;
    const importantDocs = currentDocuments.filter(d => d.important).length;
    
    // Check expiring (within next 30 days)
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
    const expiringDocs = currentDocuments.filter(d => {
        if(!d.expiry) return false;
        const expDate = new Date(d.expiry);
        return expDate > now && expDate <= thirtyDaysFromNow;
    });

    const uniqueFolders = new Set(currentDocuments.map(d => d.category)).size;

    // Animate Statistics
    animateValue('stat-total-docs', 0, totalDocs, 800);
    animateValue('stat-important-docs', 0, importantDocs, 800);
    animateValue('stat-expiring-docs', 0, expiringDocs.length, 800);
    animateValue('stat-folders', 0, uniqueFolders, 800);

    // Recent list
    let docsDashboard = [...currentDocuments];
    if (window.appClipboard && window.appClipboard.action === 'cut' && window.appClipboard.type === 'document') {
        docsDashboard = docsDashboard.filter(d => d.id != window.appClipboard.id);
    }
    let recentDocs = docsDashboard.sort((a, b) => {
        const valA = a.lastOpened || a.uploadDate;
        const valB = b.lastOpened || b.uploadDate;
        return valB - valA;
    });
    renderList('recent-docs-list', recentDocs.slice(0, 5));
    
    const viewAllBtn = document.getElementById('recent-view-all-btn');
    if (viewAllBtn) {
        viewAllBtn.style.display = 'block';
        viewAllBtn.textContent = 'View All';
    }
    
    // Render Storage Chart
    renderStorageChart(currentDocuments);
}

window.expandRecentDocuments = function(event) {
    if (event) event.preventDefault();
    const btn = document.getElementById('recent-view-all-btn');
    let docsList = [...currentDocuments];
    if (window.appClipboard && window.appClipboard.action === 'cut' && window.appClipboard.type === 'document') {
        docsList = docsList.filter(d => d.id != window.appClipboard.id);
    }
    let recentDocs = docsList.sort((a, b) => {
        const valA = a.lastOpened || a.uploadDate;
        const valB = b.lastOpened || b.uploadDate;
        return valB - valA;
    });
    
    if (btn && btn.textContent === 'View All') {
        renderList('recent-docs-list', recentDocs);
        btn.textContent = 'View Less';
    } else {
        renderList('recent-docs-list', recentDocs.slice(0, 5));
        if (btn) btn.textContent = 'View All';
    }
};

let storageChartInstance = null;

function renderStorageChart(docs) {
    const ctx = document.getElementById('storageChart');
    if(!ctx) return;
    
    if(docs.length === 0) {
        ctx.style.display = 'none';
        document.getElementById('storageEmptyState').style.display = 'block';
        document.getElementById('storage-progress-container').style.display = 'none';
        if(storageChartInstance) {
            storageChartInstance.destroy();
            storageChartInstance = null;
        }
        return;
    }
    
    ctx.style.display = 'block';
    document.getElementById('storageEmptyState').style.display = 'none';
    document.getElementById('storage-progress-container').style.display = 'block';

    let sizes = { Documents: 0, Images: 0, Certificates: 0, Other: 0 };
    let totalSize = 0;

    docs.forEach(doc => {
        // Fallback size to 1KB if 0 to show something, but realistically we use doc.size
        const size = doc.size || 1024;
        totalSize += size;
        
        if (doc.category === 'School Certificates' || doc.category === 'College Certificates' || doc.category === 'Certificates') {
            sizes.Certificates += size;
        } else if (doc.mimeType && doc.mimeType.startsWith('image/')) {
            sizes.Images += size;
        } else if (doc.category === 'Other') {
            sizes.Other += size;
        } else {
            sizes.Documents += size;
        }
    });

    const maxStorageBytes = 10 * 1024 * 1024 * 1024; // 10 GB
    let usedPercent = (totalSize / maxStorageBytes) * 100;
    if(usedPercent > 100) usedPercent = 100;
    
    let mbUsed = (totalSize / (1024 * 1024)).toFixed(2);
    let gbUsed = (totalSize / (1024 * 1024 * 1024)).toFixed(2);
    let displayUsed = totalSize > (1024 * 1024 * 1024) ? `${gbUsed} GB` : `${mbUsed} MB`;
    
    document.getElementById('storage-used-text').textContent = `${displayUsed} of 10 GB`;
    
    // Animate percentage and progress bar
    animateValue('storage-percentage-text', 0, parseFloat(usedPercent.toFixed(2)), 1000, true);
    setTimeout(() => {
        let barWidth = usedPercent;
        if (usedPercent > 0 && usedPercent < 2) barWidth = 2; // Ensure visible sliver
        document.getElementById('storage-progress-bar').style.width = `${barWidth}%`;
    }, 100);

    if (totalSize === 0) totalSize = 1;

    const data = [
        sizes.Documents,
        sizes.Images,
        sizes.Certificates,
        sizes.Other
    ];

    const centerTextPlugin = {
        id: 'centerText',
        beforeDraw: function(chart) {
            if (chart.getDatasetMeta(0).data.length === 0) return;
            const ctx = chart.ctx;
            ctx.restore();
            
            const meta = chart.getDatasetMeta(0);
            const centerX = meta.data[0]?.x || chart.chartArea.left + (chart.chartArea.right - chart.chartArea.left) / 2;
            const centerY = meta.data[0]?.y || chart.chartArea.top + (chart.chartArea.bottom - chart.chartArea.top) / 2;
            
            const fontSize = (chart.height / 120).toFixed(2);
            ctx.font = `bold ${fontSize}em Inter, sans-serif`;
            ctx.textBaseline = 'middle';
            
            const text = `${usedPercent.toFixed(1)}%`;
            ctx.fillStyle = document.body && document.body.classList.contains('dark-mode') ? '#f1f5f9' : '#334155';
            const textWidth = ctx.measureText(text).width;
            ctx.fillText(text, centerX - (textWidth / 2), centerY - 5);
            
            ctx.font = `${(fontSize * 0.35).toFixed(2)}em Inter, sans-serif`;
            ctx.fillStyle = '#64748b'; 
            const subText = 'Used';
            const subTextWidth = ctx.measureText(subText).width;
            ctx.fillText(subText, centerX - (subTextWidth / 2), centerY + 18);
            
            ctx.save();
        }
    };

    const config = {
        type: 'doughnut',
        data: {
            labels: ['Documents', 'Images', 'Certificates', 'Other'],
            datasets: [{
                data: data,
                backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#6b7280'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%', // make the doughnut thinner to fit text better
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: document.body && document.body.classList.contains('dark-mode') ? '#f1f5f9' : '#334155',
                        font: { family: 'Inter', size: 13 },
                        generateLabels: (chart) => {
                            const data = chart.data;
                            if (data.labels.length && data.datasets.length) {
                                return data.labels.map((label, i) => {
                                    const value = data.datasets[0].data[i];
                                    const percentage = ((value / totalSize) * 100).toFixed(1);
                                    return {
                                        text: `${label} — ${percentage}%`,
                                        fillStyle: data.datasets[0].backgroundColor[i],
                                        hidden: isNaN(data.datasets[0].data[i]),
                                        index: i
                                    };
                                });
                            }
                            return [];
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const percentage = ((value / totalSize) * 100).toFixed(1);
                            const mb = (value / (1024 * 1024)).toFixed(2);
                            return ` ${context.label}: ${percentage}% (${mb} MB)`;
                        }
                    }
                }
            }
        },
        plugins: [centerTextPlugin]
    };

    if (storageChartInstance) {
        storageChartInstance.data = config.data;
        storageChartInstance.options = config.options;
        storageChartInstance.update();
    } else {
        storageChartInstance = new Chart(ctx, config);
    }
}

function renderList(containerId, docs) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    if(docs.length === 0) {
        container.innerHTML = '<div class="fade-slide-up" style="padding:2rem; text-align:center;"><p class="text-muted" style="margin-bottom:0.5rem;">Your digital locker is ready.</p><p class="text-muted" style="font-size:0.9rem;">Upload your first document to get started.</p></div>';
        return;
    }

    docs.forEach(doc => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.style.position = 'relative'; // for absolute positioning of kebab menu
        item.innerHTML = `
            <div class="list-item-icon"><i class="fa-solid fa-file"></i></div>
            <div class="list-item-info">
                <h4>${doc.name}</h4>
                <p>${doc.category} • ${(doc.size/(1024*1024)).toFixed(2)} MB</p>
            </div>
            <div class="action-btns kebab-menu-container" style="position: absolute; right: 20px;">
                <button class="kebab-btn" onclick="toggleKebabMenu(event, 'list-${doc.id}')" style="background: none; border: none; font-size: 1.2rem; cursor: pointer; color: var(--text-muted); padding: 5px;"><i class="fa-solid fa-ellipsis-vertical"></i></button>
                <div class="kebab-dropdown hidden" id="kebab-menu-list-${doc.id}" style="position: absolute; top: 100%; right: 0; background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; box-shadow: var(--shadow); z-index: 100; min-width: 150px; text-align: left; overflow: hidden; margin-top: 5px;">
                    <a href="#" onclick="previewDoc('${doc.id}'); event.preventDefault(); toggleKebabMenu(event, 'list-${doc.id}');" style="display: block; padding: 10px 15px; color: var(--text-main); text-decoration: none; border-bottom: 1px solid var(--border);"><i class="fa-solid fa-eye" style="width: 20px;"></i> View</a>
                    <a href="#" onclick="downloadDoc('${doc.id}'); event.preventDefault(); toggleKebabMenu(event, 'list-${doc.id}');" style="display: block; padding: 10px 15px; color: var(--text-main); text-decoration: none; border-bottom: 1px solid var(--border);"><i class="fa-solid fa-download" style="width: 20px;"></i> Download</a>
                    <a href="#" onclick="copyDoc('${doc.id}'); event.preventDefault(); toggleKebabMenu(event, 'list-${doc.id}');" style="display: block; padding: 10px 15px; color: var(--text-main); text-decoration: none; border-bottom: 1px solid var(--border);"><i class="fa-solid fa-copy" style="width: 20px;"></i> Copy</a>
                    <a href="#" onclick="cutDoc('${doc.id}'); event.preventDefault(); toggleKebabMenu(event, 'list-${doc.id}');" style="display: block; padding: 10px 15px; color: var(--text-main); text-decoration: none; border-bottom: 1px solid var(--border);"><i class="fa-solid fa-scissors" style="width: 20px;"></i> Cut</a>
                    <a href="#" onclick="editDoc('${doc.id}'); event.preventDefault(); toggleKebabMenu(event, 'list-${doc.id}');" style="display: block; padding: 10px 15px; color: var(--text-main); text-decoration: none; border-bottom: 1px solid var(--border);"><i class="fa-solid fa-pen" style="width: 20px;"></i> Rename</a>
                    <a href="#" onclick="promptDelete('${doc.id}'); event.preventDefault(); toggleKebabMenu(event, 'list-${doc.id}');" style="display: block; padding: 10px 15px; color: var(--danger); text-decoration: none;"><i class="fa-solid fa-trash-can" style="width: 20px;"></i> Move to bin</a>
                </div>
            </div>
        `;
        container.appendChild(item);
    });
}

// --- Manage Documents Logic ---
function renderManageTable() {
    const tbody = document.getElementById('manage-table-body');
    const sortBy = document.getElementById('manage-sort').value;
    const filterCat = document.getElementById('manage-filter').value;
    
    let docs = [...currentDocuments];
    if (window.appClipboard && window.appClipboard.action === 'cut' && window.appClipboard.type === 'document') {
        docs = docs.filter(d => d.id != window.appClipboard.id);
    }
    
    // Filter
    if(filterCat !== 'all') {
        docs = docs.filter(d => d.category === filterCat);
    }
    
    // Sort
    if(sortBy === 'newest') docs.sort((a,b) => new Date(b.date) - new Date(a.date));
    if(sortBy === 'oldest') docs.sort((a,b) => new Date(a.date) - new Date(b.date));
    if(sortBy === 'name') docs.sort((a,b) => a.name.localeCompare(b.name));
    if(sortBy === 'size') docs.sort((a,b) => b.size - a.size);

    tbody.innerHTML = '';
    
    if(docs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-muted text-center" style="padding:3rem 1rem;"><div class="fade-slide-up"><p style="margin-bottom:0.5rem;">Your digital locker is ready.</p><p style="font-size:0.9rem;">Upload your first document to get started.</p></div></td></tr>';
        return;
    }

    docs.forEach(doc => {
        const tr = document.createElement('tr');
        
        let statusHtml = '';
        if(doc.important) statusHtml += '<span class="status-badge important" style="margin-right:5px">Favourite</span>';
        if(doc.expiry) {
            const expDate = new Date(doc.expiry);
            if(expDate < new Date()) statusHtml += '<span class="status-badge important">Expired</span>';
            else statusHtml += `<span class="status-badge normal">Exp: ${expDate.toLocaleDateString()}</span>`;
        }
        if(!statusHtml) statusHtml = '<span class="status-badge normal">Normal</span>';

        let iconClass = 'fa-file';
        let iconColor = '#64748b';
        let bgColor = 'rgba(100, 116, 139, 0.1)';
        
        switch(doc.category) {

            case 'Marksheets': iconClass = 'fa-file-lines'; iconColor = '#3b82f6'; bgColor = 'rgba(59, 130, 246, 0.1)'; break;
            case 'School Certificates': iconClass = 'fa-certificate'; iconColor = '#f59e0b'; bgColor = 'rgba(245, 158, 11, 0.1)'; break;
            case 'College Certificates': iconClass = 'fa-award'; iconColor = '#f59e0b'; bgColor = 'rgba(245, 158, 11, 0.1)'; break;
            case 'Resume': iconClass = 'fa-user-tie'; iconColor = '#8b5cf6'; bgColor = 'rgba(139, 92, 246, 0.1)'; break;
            case 'Internship': iconClass = 'fa-briefcase'; iconColor = '#ec4899'; bgColor = 'rgba(236, 72, 153, 0.1)'; break;
            case 'Projects': iconClass = 'fa-diagram-project'; iconColor = '#14b8a6'; bgColor = 'rgba(20, 184, 166, 0.1)'; break;
            case 'Achievements': iconClass = 'fa-trophy'; iconColor = '#eab308'; bgColor = 'rgba(234, 179, 8, 0.1)'; break;
        }

        tr.innerHTML = `
            <td>
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <div style="width: 40px; height: 40px; border-radius: 10px; background: ${bgColor}; color: ${iconColor}; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
                        <i class="fa-solid ${iconClass}"></i>
                    </div>
                    <strong style="color: var(--text-main); font-size: 1rem;">${doc.name}</strong>
                </div>
            </td>
            <td>${doc.category}</td>
            <td>${new Date(doc.date).toLocaleDateString()}</td>
            <td>${(doc.size/(1024*1024)).toFixed(2)} MB</td>
            <td>${statusHtml}</td>
            <td>
                <div class="action-btns">
                    <button onclick="editDoc('${doc.id}')" title="Edit"><i class="fa-solid fa-pen"></i></button>
                    <button onclick="previewDoc('${doc.id}')" title="Preview"><i class="fa-solid fa-eye"></i></button>
                    <button onclick="downloadDoc('${doc.id}')" title="Download"><i class="fa-solid fa-download"></i></button>
                    <button onclick="copyDoc('${doc.id}')" title="Copy"><i class="fa-solid fa-copy"></i></button>
                    <button onclick="cutDoc('${doc.id}')" title="Cut"><i class="fa-solid fa-scissors"></i></button>
                    <button class="delete-btn" onclick="promptDelete('${doc.id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function handleCategoryChange(e) {
    if (e.target.value === 'create_new') {
        const newCat = prompt("Enter new category name:");
        if (newCat && newCat.trim() !== '') {
            const catName = newCat.trim();
            
            // Add to upload-category
            const uploadSelect = document.getElementById('upload-category');
            const opt1 = document.createElement('option');
            opt1.value = catName;
            opt1.textContent = catName;
            uploadSelect.insertBefore(opt1, uploadSelect.lastElementChild);
            
            // Add to manage-filter
            const manageSelect = document.getElementById('manage-filter');
            const opt2 = document.createElement('option');
            opt2.value = catName;
            opt2.textContent = catName;
            manageSelect.insertBefore(opt2, manageSelect.lastElementChild);

            // Add to edit-doc-category
            const editSelect = document.getElementById('edit-doc-category');
            if (editSelect) {
                const opt3 = document.createElement('option');
                opt3.value = catName;
                opt3.textContent = catName;
                editSelect.insertBefore(opt3, editSelect.lastElementChild);
            }

            // Add to search filters
            const searchFilters = document.getElementById('search-category-filters');
            if (searchFilters) {
                const chip = document.createElement('button');
                chip.className = 'filter-chip';
                chip.dataset.cat = catName;
                chip.textContent = catName;
                chip.addEventListener('click', (ev) => {
                    document.querySelectorAll('#search-category-filters .filter-chip').forEach(c => c.classList.remove('active'));
                    ev.target.classList.add('active');
                    activeSearchCat = catName;
                    performSearch();
                });
                searchFilters.appendChild(chip);
            }

            // Select it in the dropdown that triggered it
            e.target.value = catName;
            if (e.target.id === 'manage-filter') renderManageTable();
        } else {
            // Cancelled or empty
            e.target.selectedIndex = 0;
            if (e.target.id === 'manage-filter') renderManageTable();
        }
    }
}

document.getElementById('manage-sort').addEventListener('change', renderManageTable);
document.getElementById('manage-filter').addEventListener('change', (e) => {
    handleCategoryChange(e);
    if (e.target.value !== 'create_new') renderManageTable();
});
document.getElementById('upload-category').addEventListener('change', handleCategoryChange);
if(document.getElementById('edit-doc-category')) {
    document.getElementById('edit-doc-category').addEventListener('change', handleCategoryChange);
}

window.editDoc = function(id) {
    const doc = currentDocuments.find(d => d.id == id);
    if (!doc) return;
    document.getElementById('edit-doc-id').value = doc.id;
    document.getElementById('edit-doc-name').value = doc.name;
    document.getElementById('edit-doc-category').value = doc.category;
    document.getElementById('edit-doc-modal').style.display = 'flex';
};

window.saveDocumentEdits = function() {
    const id = document.getElementById('edit-doc-id').value;
    const name = document.getElementById('edit-doc-name').value.trim();
    const category = document.getElementById('edit-doc-category').value;
    
    if (!name || category === 'create_new' || !category) {
        alert("Please provide a valid name and category.");
        return;
    }
    
    const doc = currentDocuments.find(d => d.id == id);
    if (doc) {
        doc.name = name;
        doc.category = category;
        saveDocument(doc).then(() => {
            document.getElementById('edit-doc-modal').style.display = 'none';
            if (document.getElementById('dashboard-section').classList.contains('active')) loadDashboard();
            if (document.getElementById('search-section').classList.contains('active')) performSearch();
            if (document.getElementById('manage-section').classList.contains('active')) renderManageTable();
            if (document.getElementById('my-sphere-section').classList.contains('active')) renderMySphere();
        });
    }
};

window.downloadDoc = function(id) {
    const doc = currentDocuments.find(d => d.id == id);
    if(!doc) return;
    const a = document.createElement('a');
    a.href = doc.data;
    a.download = doc.name;
    a.click();
};

window.previewDoc = function(id) {
    markDocumentAsOpened(id).catch(console.error);
    const doc = currentDocuments.find(d => d.id == id);
    if(!doc) return;
    
    document.getElementById('preview-title').textContent = doc.name;
    const contentArea = document.getElementById('preview-content-area');
    contentArea.innerHTML = ''; // clear previous
    
    let srcUrl = doc.data;
    if (doc.data && doc.data.startsWith('data:')) {
        try {
            if (window.currentPreviewUrl) {
                URL.revokeObjectURL(window.currentPreviewUrl);
                window.currentPreviewUrl = null;
            }
            
            const arr = doc.data.split(',');
            const mimeMatch = arr[0].match(/:(.*?);/);
            const mime = mimeMatch ? mimeMatch[1] : '';
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while(n--){
                u8arr[n] = bstr.charCodeAt(n);
            }
            const blob = new Blob([u8arr], {type: mime});
            srcUrl = URL.createObjectURL(blob);
            window.currentPreviewUrl = srcUrl;
        } catch (e) {
            console.error("Error creating blob URL:", e);
        }
    }
    
    if (doc.mimeType && doc.mimeType.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = srcUrl;
        img.style.maxWidth = '100%';
        img.style.maxHeight = '100%';
        img.style.objectFit = 'contain';
        contentArea.appendChild(img);
    } else {
        const iframe = document.createElement('iframe');
        iframe.src = srcUrl;
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        contentArea.appendChild(iframe);
    }
    
    document.getElementById('preview-modal').style.display = 'flex';
};

window.promptDelete = function(id) {
    if(confirm('Are you sure you want to move this document to the Recycle Bin?')) {
        deleteDocument(Number(id)).then(() => {
            if (document.getElementById('manage-section').classList.contains('active')) renderManageTable();
            if (document.getElementById('dashboard-section').classList.contains('active')) loadDashboard();
            if (document.getElementById('search-section').classList.contains('active')) performSearch();
            if (document.getElementById('my-sphere-section').classList.contains('active')) renderMySphere();
            showToast('Document moved to Recycle Bin');
        });
    }
};

// --- Trash Logic ---
function renderTrashTable() {
    const tbody = document.getElementById('trash-table-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    if(deletedDocuments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Recycle bin is empty.</td></tr>';
        return;
    }

    const now = Date.now();
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

    deletedDocuments.forEach(doc => {
        const tr = document.createElement('tr');
        const daysLeft = Math.max(0, Math.ceil((THIRTY_DAYS - (now - doc.deletedAt)) / (1000 * 60 * 60 * 24)));

        tr.innerHTML = `
            <td>
                <div style="display: flex; align-items: center; gap: 0.75rem; opacity: 0.7;">
                    <i class="fa-solid fa-file" style="color: var(--text-muted);"></i>
                    <strong>${doc.name}</strong>
                </div>
            </td>
            <td>${doc.category}</td>
            <td>${new Date(doc.deletedAt).toLocaleDateString()}</td>
            <td><span class="status-badge ${daysLeft < 5 ? 'important' : 'normal'}">${daysLeft} days</span></td>
            <td>
                <div class="action-btns">
                    <button title="Restore Document" onclick="handleRestore(${doc.id})" style="color: var(--success);"><i class="fa-solid fa-clock-rotate-left"></i></button>
                    <button title="Delete Permanently" onclick="handleHardDelete(${doc.id})" style="color: var(--danger);"><i class="fa-solid fa-xmark"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.handleRestore = function(id) {
    const doc = deletedDocuments.find(d => d.id === id);
    if (!doc) return;

    const originalLocation = doc.category || 'Other';
    const msg = `Restore to original folder ("${originalLocation}")?\n\nClick OK for original, or Cancel for another folder.`;
    
    let newLocation = originalLocation;
    
    if (!confirm(msg)) {
        const inputLoc = prompt('Enter the new folder name to restore this document to:');
        if (inputLoc !== null && inputLoc.trim() !== '') {
            newLocation = inputLoc.trim();
        } else if (inputLoc === null) {
            // Cancelled the prompt completely, abort restore
            return;
        }
    }
    
    restoreDocument(id, newLocation).then(() => {
        renderTrashTable();
        showToast('Document restored');
        if (document.getElementById('manage-section').classList.contains('active')) renderManageTable();
        if (document.getElementById('dashboard-section').classList.contains('active')) loadDashboard();
        if (document.getElementById('search-section').classList.contains('active')) performSearch();
    });
};

window.handleHardDelete = function(id) {
    if(confirm('Permanently delete this document? This cannot be undone.')) {
        hardDeleteDocument(id).then(() => {
            renderTrashTable();
            showToast('Document permanently deleted');
        });
    }
};


// --- Search & Filter Logic ---
const searchInput = document.getElementById('search-input');
const statusFilter = document.getElementById('search-status-filter');
const categoryChips = document.querySelectorAll('.filter-chip');
let activeSearchCat = 'all';

categoryChips.forEach(chip => {
    chip.addEventListener('click', () => {
        categoryChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        activeSearchCat = chip.dataset.cat;
        performSearch();
    });
});

searchInput?.addEventListener('input', performSearch);
if (statusFilter) statusFilter.addEventListener('change', performSearch);

function performSearch() {
    const term = searchInput ? searchInput.value.toLowerCase() : '';
    const status = statusFilter ? statusFilter.value : 'all';
    const grid = document.getElementById('search-results-grid');
    
    let docs = [...currentDocuments];
    if (window.appClipboard && window.appClipboard.action === 'cut' && window.appClipboard.type === 'document') {
        docs = docs.filter(d => d.id != window.appClipboard.id);
    }

    // Search term
    if (term) {
        docs = docs.filter(d => d.name.toLowerCase().includes(term) || (d.desc && d.desc.toLowerCase().includes(term)));
    }
    
    // Category
    if (activeSearchCat !== 'all') {
        docs = docs.filter(d => d.category === activeSearchCat);
    }
    
    // Status
    if (status === 'important') {
        docs = docs.filter(d => d.important);
    }

    document.getElementById('search-count').textContent = docs.length;
    grid.innerHTML = '';
    
    if (docs.length === 0) {
        grid.innerHTML = '<div class="fade-slide-up" style="grid-column: 1 / -1; padding:3rem; text-align:center;"><p class="text-muted" style="margin-bottom:0.5rem;">Your digital locker is ready.</p><p class="text-muted" style="font-size:0.9rem;">Upload your first document to get started.</p></div>';
        return;
    }

    docs.forEach(doc => {
        const card = document.createElement('div');
        card.className = 'card-item';
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
                <i class="fa-solid fa-file-pdf" style="font-size:1.25rem; color:var(--primary)"></i>
                ${doc.important ? '<span class="status-badge important">Favourite</span>' : ''}
            </div>
            <h4 style="margin-bottom:0.25rem; font-size:1rem; word-break:break-all;">${doc.name}</h4>
            <p class="text-muted" style="font-size:0.8rem; margin-bottom:0.25rem;">${doc.category}</p>
            ${doc.desc ? `<p style="font-size:0.8rem; margin-bottom:0.5rem; border-top:1px solid var(--border); padding-top:0.5rem; margin-top:0.5rem;">${doc.desc}</p>` : ''}
            <div class="action-btns" style="margin-top:0.75rem;">
                <button onclick="editDoc('${doc.id}')" title="Edit"><i class="fa-solid fa-pen"></i></button>
                <button onclick="previewDoc('${doc.id}')" title="Preview"><i class="fa-solid fa-eye"></i></button>
                <button onclick="downloadDoc('${doc.id}')" title="Download"><i class="fa-solid fa-download"></i></button>
            </div>
        `;
        grid.appendChild(card);
    });
}

// Init App flow
initDB().then(() => {
    checkAuth();
    initScrollAnimations();
}).catch(console.error);

function initScrollAnimations() {
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };
    
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-slide-up');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    document.querySelectorAll('.animate-on-visible').forEach(el => {
        observer.observe(el);
    });
}

// --- Animation Helpers ---
function animateValue(id, start, end, duration, isPercentage = false) {
    const obj = document.getElementById(id);
    if (!obj) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        // easeOutQuart
        const easeProgress = 1 - Math.pow(1 - progress, 4);
        const current = (easeProgress * (end - start) + start);
        
        if (isPercentage) {
            obj.textContent = `${current.toFixed(1)}% Used`;
        } else {
            obj.textContent = Math.floor(current);
        }
        
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            obj.textContent = isPercentage ? `${end}% Used` : end;
        }
    };
    window.requestAnimationFrame(step);
}

function showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>${message}</span>`;
    container.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Intro Video Logic
document.addEventListener('DOMContentLoaded', () => {
    const introScreen = document.getElementById('intro-video-screen');
    const introVideo = document.getElementById('intro-video');
    const authScreen = document.getElementById('auth-screen');

    if (introScreen && introVideo) {
        // Hide auth screen initially so it doesn't flash or exist underneath
        if (authScreen) authScreen.style.display = 'none';
        
        let introFinished = false;
        
        function hideIntro() {
            if (introFinished) return;
            introFinished = true;
            
            introScreen.classList.add('fade-out');
            
            // Show auth screen simultaneously so it appears as video fades out
            if (authScreen) authScreen.style.display = ''; 
            
            setTimeout(() => {
                introScreen.style.display = 'none';
            }, 800);
        }

        introVideo.addEventListener('ended', hideIntro);
        introVideo.addEventListener('error', hideIntro);
        
        // Ensure playback starts, if it fails immediately skip intro
        introVideo.play().catch(hideIntro);
    }
});

// --- My Sphere Category Logic ---
document.addEventListener('DOMContentLoaded', () => {
    const categoryBtns = document.querySelectorAll('.sphere-category-btn');
    const documentsGrid = document.getElementById('sphere-documents-grid');

    if (categoryBtns.length > 0) {
        categoryBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Update active state
                categoryBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                
                filterSphereDocuments();
            });
        });
    }

    const searchInput = document.getElementById('sphere-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', filterSphereDocuments);
    }

    const sphereSortSelect = document.getElementById('sphere-sort-select');
    if (sphereSortSelect) {
        sphereSortSelect.addEventListener('change', () => {
            renderMySphere();
        });
    }
});

function filterSphereDocuments() {
    const documentsGrid = document.getElementById('sphere-documents-grid');
    if (!documentsGrid) return;

    const searchInput = document.getElementById('sphere-search-input');
    const searchQuery = searchInput ? searchInput.value.toLowerCase() : '';

    const documentCards = documentsGrid.querySelectorAll('.document-card');
    documentCards.forEach(card => {
        const cardName = card.querySelector('h4').textContent.toLowerCase();
        const matchesSearch = cardName.includes(searchQuery);

        if (matchesSearch) {
            card.classList.remove('hidden');
        } else {
            card.classList.add('hidden');
        }
    });
}

let currentSphereFolder = null;

function renderMySphere() {
    const grid = document.getElementById('sphere-documents-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    const backBtn = document.getElementById('sphere-back-btn');
    const title = document.getElementById('sphere-current-folder-title');
    const createBtn = document.getElementById('sphere-create-folder-btn');
    const sortContainer = document.getElementById('sphere-sort-container');

    let customFolders = [];
    if (currentUser) {
        customFolders = JSON.parse(localStorage.getItem('eduLockerFolders_' + currentUser.uid)) || [];
    }
    
    // Auto-extract folders from currentDocuments categories
    const categoriesFromDocs = new Set(currentDocuments.map(d => d.category));
    categoriesFromDocs.forEach(c => {
        if (!customFolders.includes(c)) customFolders.push(c);
    });
    
    if (window.appClipboard && window.appClipboard.action === 'cut' && window.appClipboard.type === 'folder') {
        customFolders = customFolders.filter(f => f !== window.appClipboard.id);
    }

    if (currentSphereFolder) {
        // We are inside a folder
        if (backBtn) backBtn.style.display = 'block';
        if (title) {
            title.style.display = 'block';
            title.textContent = currentSphereFolder;
        }
        if (createBtn) createBtn.style.display = 'none';
        if (sortContainer) sortContainer.style.display = 'flex';

        let docs = currentDocuments.filter(d => d.category === currentSphereFolder);
        if (window.appClipboard && window.appClipboard.action === 'cut' && window.appClipboard.type === 'document') {
            docs = docs.filter(d => d.id != window.appClipboard.id);
        }
        
        if (docs.length === 0) {
            const safeFolderName = currentSphereFolder.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            grid.innerHTML = `
                <div class="fade-slide-up document-card" style="grid-column: 1 / -1; padding:3rem; text-align:center; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 200px; background: var(--surface-light); border: 2px dashed var(--primary); border-radius: 12px; transition: all 0.3s;" onclick="openUploadForFolder('${safeFolderName}')" onmouseover="this.style.background='var(--bg-main)'" onmouseout="this.style.background='var(--surface-light)'">
                    <div style="font-size: 4rem; color: var(--primary); margin-bottom: 15px;"><i class="fa-solid fa-plus-circle"></i></div>
                    <h3 style="margin-bottom: 10px; color: var(--text-main);">Add Files to Folder</h3>
                    <p class="text-muted" style="font-size: 1rem;">Click here to upload documents to "${currentSphereFolder}"</p>
                </div>
            `;
            return;
        }

        const sortSelect = document.getElementById('sphere-sort-select');
        if (sortSelect) {
            const sortVal = sortSelect.value;
            if(sortVal === 'newest') docs.sort((a,b) => b.uploadDate - a.uploadDate);
            if(sortVal === 'oldest') docs.sort((a,b) => a.uploadDate - b.uploadDate);
            if(sortVal === 'name') docs.sort((a,b) => a.name.localeCompare(b.name));
            if(sortVal === 'size') docs.sort((a,b) => b.size - a.size);
        }
        
        docs.forEach(doc => {
            const card = document.createElement('div');
            card.className = 'document-card fade-slide-up';
            card.dataset.category = doc.category;
            
            card.innerHTML = `
                <div style="font-size: 2rem; color: var(--primary); margin-bottom: 10px;"><i class="fa-solid fa-file"></i></div>
                <h4 style="margin-bottom: 5px;">${doc.name}</h4>
                <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 15px;">${doc.category} • ${(doc.size/(1024*1024)).toFixed(2)} MB</p>
                
                <div class="kebab-menu-container" style="position: absolute; bottom: 10px; right: 10px;">
                    <button class="kebab-btn" onclick="toggleKebabMenu(event, '${doc.id}')" style="background: none; border: none; font-size: 1.2rem; cursor: pointer; color: var(--text-muted); padding: 5px;"><i class="fa-solid fa-ellipsis-vertical"></i></button>
                    <div class="kebab-dropdown hidden" id="kebab-menu-${doc.id}" style="position: absolute; bottom: 100%; right: 0; background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; box-shadow: var(--shadow); z-index: 100; min-width: 150px; text-align: left; overflow: hidden; margin-bottom: 5px;">
                        <a href="#" onclick="previewDoc('${doc.id}'); event.preventDefault(); toggleKebabMenu(event, '${doc.id}');" style="display: block; padding: 10px 15px; color: var(--text-main); text-decoration: none; border-bottom: 1px solid var(--border);"><i class="fa-solid fa-eye" style="width: 20px;"></i> View</a>
                        <a href="#" onclick="downloadDoc('${doc.id}'); event.preventDefault(); toggleKebabMenu(event, '${doc.id}');" style="display: block; padding: 10px 15px; color: var(--text-main); text-decoration: none; border-bottom: 1px solid var(--border);"><i class="fa-solid fa-download" style="width: 20px;"></i> Download</a>
                        <a href="#" onclick="copyDoc('${doc.id}'); event.preventDefault(); toggleKebabMenu(event, '${doc.id}');" style="display: block; padding: 10px 15px; color: var(--text-main); text-decoration: none; border-bottom: 1px solid var(--border);"><i class="fa-solid fa-copy" style="width: 20px;"></i> Copy</a>
                        <a href="#" onclick="cutDoc('${doc.id}'); event.preventDefault(); toggleKebabMenu(event, '${doc.id}');" style="display: block; padding: 10px 15px; color: var(--text-main); text-decoration: none; border-bottom: 1px solid var(--border);"><i class="fa-solid fa-scissors" style="width: 20px;"></i> Cut</a>
                        <a href="#" onclick="editDoc('${doc.id}'); event.preventDefault(); toggleKebabMenu(event, '${doc.id}');" style="display: block; padding: 10px 15px; color: var(--text-main); text-decoration: none; border-bottom: 1px solid var(--border);"><i class="fa-solid fa-pen" style="width: 20px;"></i> Rename</a>
                        <a href="#" onclick="promptDelete('${doc.id}'); event.preventDefault(); toggleKebabMenu(event, '${doc.id}');" style="display: block; padding: 10px 15px; color: var(--danger); text-decoration: none;"><i class="fa-solid fa-trash-can" style="width: 20px;"></i> Move to bin</a>
                    </div>
                </div>
            `;
            
            card.style.background = 'var(--surface-light)';
            card.style.border = '2px solid var(--border)';
            card.style.borderRadius = '12px';
            card.style.padding = '20px';
            card.style.textAlign = 'center';
            card.style.position = 'relative'; // Required for absolute positioning of kebab menu
            
            grid.appendChild(card);
        });
    } else {
        // We are in the root view
        if (backBtn) backBtn.style.display = 'none';
        if (title) title.style.display = 'none';
        if (sortContainer) sortContainer.style.display = 'none';

        // Always show the Create Folder card first
        const createCard = document.createElement('div');
        createCard.className = 'document-card fade-slide-up';
        createCard.innerHTML = `
            <div style="font-size: 3rem; color: var(--primary); margin-bottom: 10px;"><i class="fa-solid fa-folder-plus"></i></div>
            <h4 style="margin-bottom: 5px;">Create Folder</h4>
            <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 15px;">New category</p>
        `;
        createCard.style.background = 'var(--surface-light)';
        createCard.style.border = '2px dashed var(--primary)';
        createCard.style.borderRadius = '12px';
        createCard.style.padding = '20px';
        createCard.style.textAlign = 'center';
        createCard.style.cursor = 'pointer';
        createCard.onclick = () => {
            const folderName = prompt("Enter folder name:");
            if (folderName && folderName.trim() !== '') {
                const name = folderName.trim();
                let customFolders = [];
                if (currentUser) {
                    customFolders = JSON.parse(localStorage.getItem('eduLockerFolders_' + currentUser.uid)) || [];
                }
                if (!customFolders.includes(name)) {
                    customFolders.push(name);
                    if (currentUser) {
                        localStorage.setItem('eduLockerFolders_' + currentUser.uid, JSON.stringify(customFolders));
                    }
                    renderMySphere();
                } else {
                    alert("Folder already exists!");
                }
            }
        };
        grid.appendChild(createCard);

        if (customFolders.length > 0) {
            // Show folders
            customFolders.forEach(folderName => {
                const folderDocs = currentDocuments.filter(d => d.category === folderName);
                const docCount = folderDocs.length;
                let folderSize = 0;
                folderDocs.forEach(d => folderSize += d.size);
                
                const card = document.createElement('div');
                card.className = 'document-card fade-slide-up';
                
                const safeFolderName = folderName.replace(/'/g, "\\'").replace(/"/g, '&quot;');
                const folderId = 'folder-' + btoa(folderName).replace(/[^a-zA-Z0-9]/g, ''); // Generate safe ID for DOM

                card.innerHTML = `
                    <div class="folder-content" onclick="viewFolder('${safeFolderName}')" style="cursor: pointer; padding: 20px;">
                        <div style="font-size: 3rem; color: var(--primary); margin-bottom: 10px;"><i class="fa-solid fa-folder"></i></div>
                        <h4 style="margin-bottom: 5px;">${folderName}</h4>
                        <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 15px;">${docCount} files</p>
                    </div>
                    
                    <div class="kebab-menu-container" style="position: absolute; bottom: 10px; right: 10px;">
                        <button class="kebab-btn" onclick="toggleKebabMenu(event, '${folderId}')" style="background: none; border: none; font-size: 1.2rem; cursor: pointer; color: var(--text-muted); padding: 5px;"><i class="fa-solid fa-ellipsis-vertical"></i></button>
                        <div class="kebab-dropdown hidden" id="kebab-menu-${folderId}" style="position: absolute; bottom: 100%; right: 0; background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; box-shadow: var(--shadow); z-index: 100; min-width: 150px; text-align: left; overflow: hidden; margin-bottom: 5px;">
                            <a href="#" onclick="viewFolder('${safeFolderName}'); event.preventDefault(); toggleKebabMenu(event, '${folderId}');" style="display: block; padding: 10px 15px; color: var(--text-main); text-decoration: none; border-bottom: 1px solid var(--border);"><i class="fa-solid fa-eye" style="width: 20px;"></i> View</a>
                            <a href="#" onclick="copyFolder('${safeFolderName}'); event.preventDefault(); toggleKebabMenu(event, '${folderId}');" style="display: block; padding: 10px 15px; color: var(--text-main); text-decoration: none; border-bottom: 1px solid var(--border);"><i class="fa-solid fa-copy" style="width: 20px;"></i> Copy</a>
                            <a href="#" onclick="cutFolder('${safeFolderName}'); event.preventDefault(); toggleKebabMenu(event, '${folderId}');" style="display: block; padding: 10px 15px; color: var(--text-main); text-decoration: none; border-bottom: 1px solid var(--border);"><i class="fa-solid fa-scissors" style="width: 20px;"></i> Cut</a>
                            <a href="#" onclick="renameFolderPrompt('${safeFolderName}'); event.preventDefault(); toggleKebabMenu(event, '${folderId}');" style="display: block; padding: 10px 15px; color: var(--text-main); text-decoration: none; border-bottom: 1px solid var(--border);"><i class="fa-solid fa-pen" style="width: 20px;"></i> Rename</a>
                            <a href="#" onclick="showFolderDetails('${safeFolderName}'); event.preventDefault(); toggleKebabMenu(event, '${folderId}');" style="display: block; padding: 10px 15px; color: var(--text-main); text-decoration: none; border-bottom: 1px solid var(--border);"><i class="fa-solid fa-circle-info" style="width: 20px;"></i> Details</a>
                            <a href="#" onclick="deleteFolderPrompt('${safeFolderName}'); event.preventDefault(); toggleKebabMenu(event, '${folderId}');" style="display: block; padding: 10px 15px; color: var(--danger); text-decoration: none;"><i class="fa-solid fa-trash-can" style="width: 20px;"></i> Move to bin</a>
                        </div>
                    </div>
                `;
                
                card.style.background = 'var(--surface-light)';
                card.style.border = '2px solid var(--border)';
                card.style.borderRadius = '12px';
                card.style.textAlign = 'center';
                card.style.position = 'relative'; // Required for absolute positioning of kebab menu
                
                grid.appendChild(card);
            });
        } else {
            // No folders exist, show files normally
            let docs = [...currentDocuments];
            if (window.appClipboard && window.appClipboard.action === 'cut' && window.appClipboard.type === 'document') {
                docs = docs.filter(d => d.id != window.appClipboard.id);
            }
            const sortSelect = document.getElementById('sphere-sort-select');
            if (sortSelect) {
                const sortVal = sortSelect.value;
                if(sortVal === 'newest') docs.sort((a,b) => b.uploadDate - a.uploadDate);
                if(sortVal === 'oldest') docs.sort((a,b) => a.uploadDate - b.uploadDate);
                if(sortVal === 'name') docs.sort((a,b) => a.name.localeCompare(b.name));
                if(sortVal === 'size') docs.sort((a,b) => b.size - a.size);
            }
            
            docs.forEach(doc => {
                const card = document.createElement('div');
                card.className = 'document-card fade-slide-up';
                card.dataset.category = doc.category;
                
                card.innerHTML = `
                    <div style="font-size: 2rem; color: var(--primary); margin-bottom: 10px;"><i class="fa-solid fa-file"></i></div>
                    <h4 style="margin-bottom: 5px;">${doc.name}</h4>
                    <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 15px;">${doc.category} • ${(doc.size/(1024*1024)).toFixed(2)} MB</p>
                    
                    <div class="kebab-menu-container" style="position: absolute; bottom: 10px; right: 10px;">
                        <button class="kebab-btn" onclick="toggleKebabMenu(event, '${doc.id}')" style="background: none; border: none; font-size: 1.2rem; cursor: pointer; color: var(--text-muted); padding: 5px;"><i class="fa-solid fa-ellipsis-vertical"></i></button>
                        <div class="kebab-dropdown hidden" id="kebab-menu-${doc.id}" style="position: absolute; bottom: 100%; right: 0; background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; box-shadow: var(--shadow); z-index: 100; min-width: 150px; text-align: left; overflow: hidden; margin-bottom: 5px;">
                            <a href="#" onclick="previewDoc('${doc.id}'); event.preventDefault(); toggleKebabMenu(event, '${doc.id}');" style="display: block; padding: 10px 15px; color: var(--text-main); text-decoration: none; border-bottom: 1px solid var(--border);"><i class="fa-solid fa-eye" style="width: 20px;"></i> View</a>
                            <a href="#" onclick="downloadDoc('${doc.id}'); event.preventDefault(); toggleKebabMenu(event, '${doc.id}');" style="display: block; padding: 10px 15px; color: var(--text-main); text-decoration: none; border-bottom: 1px solid var(--border);"><i class="fa-solid fa-download" style="width: 20px;"></i> Download</a>
                            <a href="#" onclick="copyDoc('${doc.id}'); event.preventDefault(); toggleKebabMenu(event, '${doc.id}');" style="display: block; padding: 10px 15px; color: var(--text-main); text-decoration: none; border-bottom: 1px solid var(--border);"><i class="fa-solid fa-copy" style="width: 20px;"></i> Copy</a>
                            <a href="#" onclick="cutDoc('${doc.id}'); event.preventDefault(); toggleKebabMenu(event, '${doc.id}');" style="display: block; padding: 10px 15px; color: var(--text-main); text-decoration: none; border-bottom: 1px solid var(--border);"><i class="fa-solid fa-scissors" style="width: 20px;"></i> Cut</a>
                            <a href="#" onclick="editDoc('${doc.id}'); event.preventDefault(); toggleKebabMenu(event, '${doc.id}');" style="display: block; padding: 10px 15px; color: var(--text-main); text-decoration: none; border-bottom: 1px solid var(--border);"><i class="fa-solid fa-pen" style="width: 20px;"></i> Rename</a>
                            <a href="#" onclick="promptDelete('${doc.id}'); event.preventDefault(); toggleKebabMenu(event, '${doc.id}');" style="display: block; padding: 10px 15px; color: var(--danger); text-decoration: none;"><i class="fa-solid fa-trash-can" style="width: 20px;"></i> Move to bin</a>
                        </div>
                    </div>
                `;
                
                card.style.background = 'var(--surface-light)';
                card.style.border = '2px solid var(--border)';
                card.style.borderRadius = '12px';
                card.style.padding = '20px';
                card.style.textAlign = 'center';
                card.style.position = 'relative';
                
                grid.appendChild(card);
            });
        }
    }

    // Apply current filter
    filterSphereDocuments();
}

// Event listeners for sphere folder actions
document.addEventListener('DOMContentLoaded', () => {
    const backBtn = document.getElementById('sphere-back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            currentSphereFolder = null;
            renderMySphere();
        });
    }
});

window.sendSettingsPasswordReset = async function() {
    if (!currentUser || !currentUser.email) {
        alert("You must be logged in with a valid email to change your password.");
        return;
    }
    try {
        await sendPasswordResetEmail(auth, currentUser.email);
        alert(`Password reset link successfully sent to ${currentUser.email}.\n\nPlease check your inbox and your Spam/Junk folder. If it does not appear, your Firebase project may have reached its email quota or requires domain verification.`);
    } catch (error) {
        alert("Error sending password reset email: " + error.message);
    }
};

window.openUploadForFolder = function(folderName) {
    const uploadNav = document.querySelector('[data-target="upload-section"]');
    if (uploadNav) uploadNav.click();
    setTimeout(() => {
        const select = document.getElementById('upload-category');
        if (select) {
            let optionExists = Array.from(select.options).some(opt => opt.value === folderName);
            if (!optionExists) {
                const opt = document.createElement('option');
                opt.value = folderName;
                opt.textContent = folderName;
                select.appendChild(opt);
            }
            select.value = folderName;
        }
    }, 150);
};

window.toggleKebabMenu = function(e, id) {
    if(e) e.stopPropagation();
    const allMenus = document.querySelectorAll('.kebab-dropdown');
    allMenus.forEach(m => {
        if(m.id !== 'kebab-menu-' + id) m.classList.add('hidden');
    });
    const menu = document.getElementById('kebab-menu-' + id);
    if (menu) menu.classList.toggle('hidden');
};

document.addEventListener('click', () => {
    const allMenus = document.querySelectorAll('.kebab-dropdown');
    allMenus.forEach(m => m.classList.add('hidden'));
});

window.appClipboard = null;

window.updatePasteButton = function() {
    const btn = document.getElementById('sphere-paste-btn');
    if (btn) {
        btn.style.display = window.appClipboard ? 'block' : 'none';
    }
    // Re-render UI to hide cut items instantly
    if (document.getElementById('my-sphere-section').classList.contains('active')) renderMySphere();
    if (document.getElementById('manage-section').classList.contains('active')) renderManageTable();
    if (document.getElementById('dashboard-section').classList.contains('active')) loadDashboard();
};

window.copyDoc = function(id) {
    window.appClipboard = { type: 'document', action: 'copy', id: id };
    showToast('Document copied to clipboard');
    updatePasteButton();
};

window.cutDoc = function(id) {
    window.appClipboard = { type: 'document', action: 'cut', id: id };
    showToast('Document cut to clipboard');
    updatePasteButton();
};

window.viewFolder = function(folderName) {
    currentSphereFolder = folderName;
    renderMySphere();
};

window.copyFolder = function(folderName) {
    window.appClipboard = { type: 'folder', action: 'copy', id: folderName };
    showToast('Folder copied to clipboard');
    updatePasteButton();
};

window.cutFolder = function(folderName) {
    window.appClipboard = { type: 'folder', action: 'cut', id: folderName };
    showToast('Folder cut to clipboard');
    updatePasteButton();
};

window.renameFolderPrompt = function(folderName) {
    if (!currentUser) return;
    const newName = prompt("Enter new folder name:", folderName);
    if (!newName || newName.trim() === "" || newName === folderName) return;
    
    const cleanName = newName.trim();
    const customFolders = JSON.parse(localStorage.getItem('eduLockerFolders_' + currentUser.uid)) || [];
    if(customFolders.includes(cleanName)) {
        alert("Folder already exists!");
        return;
    }
    
    const index = customFolders.indexOf(folderName);
    if(index !== -1) {
        customFolders[index] = cleanName;
        localStorage.setItem('eduLockerFolders_' + currentUser.uid, JSON.stringify(customFolders));
    }
    
    const folderDocs = currentDocuments.filter(d => d.category === folderName);
    if(folderDocs.length === 0) {
        renderMySphere();
        return;
    }
    
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    let completedCount = 0;
    
    folderDocs.forEach(doc => {
        doc.category = cleanName;
        const req = store.put(doc);
        req.onsuccess = () => {
            completedCount++;
            if(completedCount === folderDocs.length) {
                loadAllDocuments(() => {
                    renderMySphere();
                    showToast('Folder renamed successfully');
                });
            }
        };
    });
};

window.deleteFolderPrompt = function(folderName) {
    if (!currentUser) return;
    if(confirm(`Are you sure you want to move the folder "${folderName}" and all its contents to the Recycle Bin?`)) {
        const customFolders = JSON.parse(localStorage.getItem('eduLockerFolders_' + currentUser.uid)) || [];
        const index = customFolders.indexOf(folderName);
        if(index !== -1) {
            customFolders.splice(index, 1);
            localStorage.setItem('eduLockerFolders_' + currentUser.uid, JSON.stringify(customFolders));
        }
        
        const folderDocs = currentDocuments.filter(d => d.category === folderName);
        if(folderDocs.length === 0) {
            renderMySphere();
            showToast('Folder moved to Recycle Bin');
            return;
        }
        
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        let completedCount = 0;
        
        folderDocs.forEach(doc => {
            doc.isDeleted = true;
            doc.deletedAt = Date.now();
            const req = store.put(doc);
            req.onsuccess = () => {
                completedCount++;
                if(completedCount === folderDocs.length) {
                    loadAllDocuments(() => {
                        renderMySphere();
                        showToast('Folder moved to Recycle Bin');
                    });
                }
            };
        });
    }
};

window.showFolderDetails = function(folderName) {
    const folderDocs = currentDocuments.filter(d => d.category === folderName);
    const docCount = folderDocs.length;
    let folderSize = 0;
    folderDocs.forEach(d => folderSize += d.size);
    const sizeInMB = (folderSize / (1024 * 1024)).toFixed(2);
    
    alert(`Folder Details:\nName: ${folderName}\nFiles contained: ${docCount}\nStorage used: ${sizeInMB} MB`);
};

window.pasteFromClipboard = function() {
    if (!window.appClipboard || !currentUser) {
        showToast('Clipboard is empty');
        return;
    }
    
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    if (appClipboard.type === 'document') {
        const doc = currentDocuments.find(d => d.id == appClipboard.id);
        if (!doc) {
            showToast('Source document no longer exists');
            return;
        }
        
        const targetCategory = currentSphereFolder || 'Uncategorized';
        
        if (appClipboard.action === 'cut') {
            doc.category = targetCategory;
            const req = store.put(doc);
            req.onsuccess = () => {
                window.appClipboard = null;
                updatePasteButton();
                loadAllDocuments(() => {
                    showToast('Document moved successfully');
                    if (document.getElementById('my-sphere-section').classList.contains('active')) renderMySphere();
                    if (document.getElementById('dashboard-section').classList.contains('active')) loadDashboard();
                });
            };
        } else {
            // copy
            const newDoc = { ...doc };
            delete newDoc.id;
            newDoc.name = doc.name + ' (Copy)';
            newDoc.category = targetCategory;
            newDoc.uploadDate = Date.now();
            newDoc.lastOpened = Date.now();
            
            const req = store.add(newDoc);
            req.onsuccess = () => {
                loadAllDocuments(() => {
                    showToast('Document copied successfully');
                    if (document.getElementById('my-sphere-section').classList.contains('active')) renderMySphere();
                    if (document.getElementById('dashboard-section').classList.contains('active')) loadDashboard();
                });
            };
        }
    } else if (appClipboard.type === 'folder') {
        const folderName = appClipboard.id;
        const customFolders = JSON.parse(localStorage.getItem('eduLockerFolders_' + currentUser.uid)) || [];
        const folderDocs = currentDocuments.filter(d => d.category === folderName);
        
        if (currentSphereFolder) {
            // Pasting a folder inside another folder -> we move/copy its contents into currentSphereFolder
            const targetCategory = currentSphereFolder;
            if (appClipboard.action === 'cut') {
                // Delete old folder, move files to targetCategory
                const index = customFolders.indexOf(folderName);
                if (index !== -1) {
                    customFolders.splice(index, 1);
                    localStorage.setItem('eduLockerFolders_' + currentUser.uid, JSON.stringify(customFolders));
                }
                
                if (folderDocs.length === 0) {
                    window.appClipboard = null;
                    updatePasteButton();
                    renderMySphere();
                    showToast('Folder contents moved');
                    return;
                }
                
                let completedCount = 0;
                folderDocs.forEach(doc => {
                    doc.category = targetCategory;
                    const req = store.put(doc);
                    req.onsuccess = () => {
                        completedCount++;
                        if(completedCount === folderDocs.length) {
                            window.appClipboard = null;
                            updatePasteButton();
                            loadAllDocuments(() => {
                                renderMySphere();
                                showToast('Folder contents moved');
                            });
                        }
                    };
                });
            } else {
                // Copy files to targetCategory
                if (folderDocs.length === 0) {
                    showToast('Folder contents copied');
                    return;
                }
                let completedCount = 0;
                folderDocs.forEach(doc => {
                    const newDoc = { ...doc };
                    delete newDoc.id;
                    newDoc.category = targetCategory;
                    newDoc.uploadDate = Date.now();
                    newDoc.lastOpened = Date.now();
                    const req = store.add(newDoc);
                    req.onsuccess = () => {
                        completedCount++;
                        if(completedCount === folderDocs.length) {
                            loadAllDocuments(() => {
                                renderMySphere();
                                showToast('Folder contents copied');
                            });
                        }
                    };
                });
            }
        } else {
            // Pasting a folder at root
            if (appClipboard.action === 'cut') {
                showToast('Folder is already at root');
                window.appClipboard = null;
                updatePasteButton();
                return;
            } else {
                // Copy folder entirely to a new folder
                let newFolderName = folderName + ' (Copy)';
                let counter = 1;
                while(customFolders.includes(newFolderName)) {
                    counter++;
                    newFolderName = folderName + ` (Copy ${counter})`;
                }
                
                customFolders.push(newFolderName);
                localStorage.setItem('eduLockerFolders_' + currentUser.uid, JSON.stringify(customFolders));
                
                if (folderDocs.length === 0) {
                    renderMySphere();
                    showToast('Folder copied successfully');
                    return;
                }
                
                let completedCount = 0;
                folderDocs.forEach(doc => {
                    const newDoc = { ...doc };
                    delete newDoc.id;
                    newDoc.category = newFolderName;
                    newDoc.uploadDate = Date.now();
                    newDoc.lastOpened = Date.now();
                    const req = store.add(newDoc);
                    req.onsuccess = () => {
                        completedCount++;
                        if(completedCount === folderDocs.length) {
                            loadAllDocuments(() => {
                                renderMySphere();
                                showToast('Folder copied successfully');
                            });
                        }
                    };
                });
            }
        }
    }
};

document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
        pasteFromClipboard();
    }
});
