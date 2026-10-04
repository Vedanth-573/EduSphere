const fs = require('fs');

let indexHtml = fs.readFileSync('index.html', 'utf8');

// Extract the base64 string again to be safe
const videoMatch = indexHtml.match(/<source (src="data:video\/mp4;base64,[^"]*") type="video\/mp4">/);
const videoSrc = videoMatch ? videoMatch[1] : '';

// 1. Remove the old split-screen structure and restore the normal auth-wrapper
indexHtml = indexHtml.replace(
    /<div class="auth-split-video">[\s\S]*?<div class="auth-split-form">\s*<div class="auth-card">/,
    `<div class="auth-card">`
);

// Remove the two extra closing divs
indexHtml = indexHtml.replace(
    /        <\/div>\n        <\/div>\n    <\/div>\n\n    <!-- MAIN APPLICATION -->/,
    `    </div>\n\n    <!-- MAIN APPLICATION -->`
);

// 2. Add the intro video section before the auth wrapper
const introVideoHtml = `    <!-- INTRO VIDEO SCREEN -->
    <div id="intro-video-screen" class="intro-wrapper">
        <video id="intro-video" autoplay muted playsinline preload="auto">
            <source ${videoSrc} type="video/mp4">
        </video>
    </div>

    <!-- AUTHENTICATION SCREEN -->`;

indexHtml = indexHtml.replace(/    <!-- AUTHENTICATION SCREEN -->/, introVideoHtml);

fs.writeFileSync('index.html', indexHtml);
console.log('Modified index.html');
