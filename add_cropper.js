const fs = require('fs');

let indexHtml = fs.readFileSync('index.html', 'utf8');

// Add cropper css and js
if (!indexHtml.includes('cropper.min.css')) {
    indexHtml = indexHtml.replace('</head>', '    <!-- Cropper.js -->\n    <link href="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.css" rel="stylesheet">\n    <script src="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.js"></script>\n</head>');
}

// Add modal
const modalHtml = `
    <!-- Image Crop Modal -->
    <div id="crop-modal" class="modal-overlay" style="display: none; z-index: 10000; align-items: center; justify-content: center; position: fixed; inset: 0; background: rgba(0,0,0,0.8);">
        <div class="modal-content" style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius); width: 90%; max-width: 500px;">
            <h3 style="margin-bottom: 1rem;">Adjust Profile Picture</h3>
            <div style="width: 100%; height: 300px; background: #000; margin-bottom: 1rem;">
                <img id="crop-image" src="" style="max-width: 100%; display: block;">
            </div>
            <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                <button type="button" class="btn btn-secondary" id="crop-cancel-btn">Cancel</button>
                <button type="button" class="btn btn-primary" id="crop-save-btn">Save Picture</button>
            </div>
        </div>
    </div>
</body>`;

if (!indexHtml.includes('id="crop-modal"')) {
    indexHtml = indexHtml.replace('</body>', modalHtml);
}

fs.writeFileSync('index.html', indexHtml);
console.log('Added cropper to index.html');
