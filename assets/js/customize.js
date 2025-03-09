// Get stored photos from session storage
const storedPhotos = JSON.parse(sessionStorage.getItem('capturedPhotos') || '[]');
const photostrip = document.getElementById('photostrip');
const photoSlots = document.querySelectorAll('.photo-slot');
const colorBtns = document.querySelectorAll('.color-btn');
const downloadBtn = document.getElementById('downloadBtn');
const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');

// Initialize the frame with captured photos
function initializePhotostrip() {
    photoSlots.forEach((slot, index) => {
        if (storedPhotos[index]) {
            const img = new Image();
            img.onload = () => {
                slot.style.backgroundImage = `url(${storedPhotos[index]})`;
            };
            img.src = storedPhotos[index];
            slot.dataset.photoUrl = storedPhotos[index];
        }
    });
}

// Frame color selection
colorBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        colorBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        photostrip.style.backgroundColor = btn.dataset.color;
    });
});

// Sticker drag and drop functionality
let activeSticker = null;
const stickers = document.querySelectorAll('.sticker');

stickers.forEach(sticker => {
    sticker.addEventListener('dragstart', handleDragStart);
    sticker.addEventListener('dragend', handleDragEnd);
});

photoSlots.forEach(slot => {
    slot.addEventListener('dragover', handleDragOver);
    slot.addEventListener('drop', handleDrop);
});

function handleDragStart(e) {
    activeSticker = this;
    this.classList.add('dragging');
    e.dataTransfer.setData('text/plain', this.src);
    e.dataTransfer.effectAllowed = 'copy';
}

function handleDragEnd() {
    this.classList.remove('dragging');
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
}

function handleDrop(e) {
    e.preventDefault();
    if (activeSticker) {
        const rect = this.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        createSticker(this, activeSticker.src, x, y);
    }
}

function createSticker(container, stickerSrc, x, y) {
    const stickerImg = document.createElement('img');
    stickerImg.src = stickerSrc;
    stickerImg.classList.add('placed-sticker');
    
    // Center the sticker at the drop point
    const stickerSize = 50;
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
        e.preventDefault();
        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;
        
        if (e.target === sticker) {
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
            
            // Constrain sticker movement within the photo slot
            const maxX = rect.width - sticker.offsetWidth;
            const maxY = rect.height - sticker.offsetHeight;
            
            currentX = Math.min(Math.max(0, x - sticker.offsetWidth/2), maxX);
            currentY = Math.min(Math.max(0, y - sticker.offsetHeight/2), maxY);

            xOffset = currentX;
            yOffset = currentY;

            sticker.style.left = currentX + 'px';
            sticker.style.top = currentY + 'px';
            sticker.style.transform = 'none';
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
    // Set canvas size to match 2:6 ratio
    const width = 600;  // Base width
    const height = width * 3;  // Height is 3x width to achieve 2:6 ratio
    canvas.width = width;
    canvas.height = height;
    
    // Draw background color
    ctx.fillStyle = photostrip.style.backgroundColor || 'white';
    ctx.fillRect(0, 0, width, height);
    
    // Calculate photo dimensions for 2:6 layout
    const padding = width * 0.1;
    const photoWidth = width - (padding * 2);
    const photoHeight = photoWidth;  // Keep photos square
    const verticalSpacing = (height - (photoHeight * 4)) / 5;  // Space between photos
    
    // Draw each photo and its stickers
    for (let i = 0; i < photoSlots.length; i++) {
        const slot = photoSlots[i];
        const photoUrl = slot.dataset.photoUrl;
        
        if (photoUrl) {
            // Draw photo
            const img = new Image();
            await new Promise(resolve => {
                img.onload = resolve;
                img.src = photoUrl;
            });
            
            const y = padding + (i * (photoHeight + verticalSpacing));
            ctx.drawImage(img, padding, y, photoWidth, photoHeight);
            
            // Draw stickers
            const stickers = slot.querySelectorAll('.placed-sticker');
            for (const sticker of stickers) {
                const stickerImg = new Image();
                await new Promise(resolve => {
                    stickerImg.onload = resolve;
                    stickerImg.src = sticker.src;
                });

                const rect = slot.getBoundingClientRect();
                const scale = photoWidth / rect.width;
                const stickerSize = parseFloat(sticker.style.width) * scale;
                
                const stickerX = padding + (parseFloat(sticker.style.left) * scale);
                const stickerY = y + (parseFloat(sticker.style.top) * scale);
                
                ctx.drawImage(stickerImg, stickerX, stickerY, stickerSize, stickerSize);
            }
        }
    }
    
    // Create download link
    const link = document.createElement('a');
    link.download = 'photostrip.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
});

// Initialize the photostrip
initializePhotostrip();
