const fs = require('fs');

const videoSrc = fs.readFileSync('/tmp/video_src.txt', 'utf8').trim();

let indexHtml = fs.readFileSync('index.html', 'utf8');

const authStart = `    <!-- AUTHENTICATION SCREEN -->
    <div id="auth-screen" class="auth-wrapper active">
        <div class="auth-split-video">
            <video autoplay muted loop playsinline preload="auto">
                <source ${videoSrc} type="video/mp4">
            </video>
            <div class="overlay"></div>
        </div>
        <div class="auth-split-form">
            <div class="auth-card">`;

indexHtml = indexHtml.replace(
    /    <!-- AUTHENTICATION SCREEN -->\s*<div id="auth-screen" class="auth-wrapper active">\s*<div class="auth-card">/,
    authStart
);

const authEnd = `        </div>
        </div>
    </div>`;

indexHtml = indexHtml.replace(
    /        <\/div>\s*<\/div>\s*<!-- MAIN APPLICATION -->/,
    `        </div>\n        </div>\n    </div>\n\n    <!-- MAIN APPLICATION -->`
);

fs.writeFileSync('index.html', indexHtml);
console.log('Modified index.html');
