// Get stored photos from session storage
const storedPhotos = JSON.parse(sessionStorage.getItem('capturedPhotos') || '[]');
const photostrip = document.getElementById('photostrip');
const photoSlots = document.querySelectorAll('.photo-slot');
const frameBottom = document.querySelector('.frame-bottom');
const colorBtns = document.querySelectorAll('.color-btn');
const downloadBtn = document.getElementById('downloadBtn');
const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');

// Initialize the frame with captured photos
function initializePhotostrip() {
    // Check if we have photos to display
    if (!storedPhotos || storedPhotos.length === 0) {
        // Redirect back to capture page if no photos
        window.location.href = 'capture.html';
        return;
    }

    // Display photos
    photoSlots.forEach((slot, index) => {
        if (storedPhotos[index]) {
            slot.style.backgroundImage = `url(${storedPhotos[index]})`;
        }
    });

    // Set initial frame color to black
    const blackBtn = document.querySelector('[data-color="black"]');
    blackBtn.classList.add('active');
    photostrip.style.backgroundColor = 'black';
}

// Frame color selection
colorBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        colorBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        photostrip.style.backgroundColor = btn.dataset.color;
    });
});

// Sticker click-to-add functionality
const stickers = document.querySelectorAll('.sticker');
let selectedSticker = null;

stickers.forEach(sticker => {
    sticker.addEventListener('click', () => {
        stickers.forEach(s => s.classList.remove('selected'));
        sticker.classList.add('selected');
        selectedSticker = sticker;
    });
});

// Add sticker on click in photo slots or bottom area
[...photoSlots, frameBottom].forEach(container => {
    container.addEventListener('click', (e) => {
        if (!selectedSticker) return;
        
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        createSticker(container, selectedSticker.src, x, y);
    });
});

function createSticker(container, stickerSrc, x, y) {
    const stickerImg = document.createElement('img');
    stickerImg.src = stickerSrc;
    stickerImg.classList.add('placed-sticker');
    
    // Make stickers in bottom area larger
    if (container.classList.contains('frame-bottom')) {
        stickerImg.classList.add('in-bottom');
    }
    
    // Center the sticker at the click point
    const stickerSize = container.classList.contains('frame-bottom') ? 50 : 40;
    stickerImg.style.cssText = `
        position: absolute;
        left: ${x - stickerSize/2}px;
        top: ${y - stickerSize/2}px;
        width: ${stickerSize}px;
        height: ${stickerSize}px;
        cursor: move;
        z-index: 10;
    `;
    
    makeStickerDraggable(stickerImg);
    container.appendChild(stickerImg);
}

function makeStickerDraggable(sticker) {
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    sticker.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    function dragStart(e) {
        if (e.target === sticker) {
            e.preventDefault();
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
            isDragging = true;
            sticker.style.zIndex = '20';
        }
    }

    function drag(e) {
        if (isDragging) {
            e.preventDefault();
            
            const rect = sticker.parentElement.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Constrain sticker movement within the container
            const maxX = rect.width - sticker.offsetWidth;
            const maxY = rect.height - sticker.offsetHeight;
            
            currentX = Math.min(Math.max(0, x - sticker.offsetWidth/2), maxX);
            currentY = Math.min(Math.max(0, y - sticker.offsetHeight/2), maxY);

            xOffset = currentX;
            yOffset = currentY;

            sticker.style.left = currentX + 'px';
            sticker.style.top = currentY + 'px';
        }
    }

    function dragEnd() {
        if (isDragging) {
            isDragging = false;
            sticker.style.zIndex = '10';
        }
    }

    // Double click to remove sticker
    sticker.addEventListener('dblclick', () => {
        sticker.remove();
    });
}

// Download functionality using native canvas
downloadBtn.addEventListener('click', async () => {
    // Set canvas size to match frame proportions
    const width = 600;  // Base width
    const height = width * 1.5;  // Adjust height to match frame proportions
    canvas.width = width;
    canvas.height = height;
    
    // Draw background color
    ctx.fillStyle = photostrip.style.backgroundColor || 'black';
    ctx.fillRect(0, 0, width, height);
    
    // Calculate photo dimensions
    const padding = 3;  // Same as CSS padding
    const photoWidth = width - (padding * 2);
    const photoHeight = photoWidth;
    const photoSpacing = padding;
    
    // Draw photos and their stickers
    for (let i = 0; i < photoSlots.length; i++) {
        const photoUrl = storedPhotos[i];
        if (photoUrl) {
            // Draw photo
            const img = new Image();
            await new Promise(resolve => {
                img.onload = resolve;
                img.src = photoUrl;
            });
            
            const y = padding + (i * (photoHeight + photoSpacing));
            ctx.fillStyle = 'white';
            ctx.fillRect(padding, y, photoWidth, photoHeight);
            ctx.drawImage(img, padding, y, photoWidth, photoHeight);
            
            // Draw stickers for this photo
            const stickers = photoSlots[i].querySelectorAll('.placed-sticker');
            await drawStickers(stickers, padding, y, photoWidth, photoHeight);
        }
    }
    
    // Draw bottom area stickers
    const bottomStickers = frameBottom.querySelectorAll('.placed-sticker');
    const bottomY = padding + (4 * (photoHeight + photoSpacing));
    await drawStickers(bottomStickers, padding, bottomY, photoWidth, height - bottomY - padding);
    
    // Create download link
    const link = document.createElement('a');
    link.download = 'photostrip.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
});

async function drawStickers(stickers, offsetX, offsetY, containerWidth, containerHeight) {
    for (const sticker of stickers) {
        const stickerImg = new Image();
        await new Promise(resolve => {
            stickerImg.onload = resolve;
            stickerImg.src = sticker.src;
        });

        const rect = sticker.parentElement.getBoundingClientRect();
        const scale = containerWidth / rect.width;
        const stickerSize = parseFloat(sticker.style.width) * scale;
        
        const stickerX = offsetX + (parseFloat(sticker.style.left) * scale);
        const stickerY = offsetY + (parseFloat(sticker.style.top) * scale);
        
        ctx.drawImage(stickerImg, stickerX, stickerY, stickerSize, stickerSize);
    }
}

// Initialize the photostrip
initializePhotostrip();
