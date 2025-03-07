class Photobooth {
    constructor() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('photoCanvas');
        this.photoGallery = document.getElementById('photoGallery');
        this.countdownTimer = document.getElementById('countdownTimer');
        this.ctx = this.canvas.getContext('2d');
        this.currentFilter = 'none';
        this.stream = null;
        this.facingMode = 'user';
        this.photos = [];
        this.stripPhotos = [];
        this.stickers = [];
        this.availableCameras = [];
        this.isCapturing = false;
        
        this.checkCameraSupport()
            .then(() => this.initializeCamera())
            .catch(error => this.handleCameraError(error));
            
        this.setupEventListeners();
    }

    async checkCameraSupport() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Camera API is not supported in your browser');
        }

        try {
            // Get list of available cameras
            const devices = await navigator.mediaDevices.enumerateDevices();
            this.availableCameras = devices.filter(device => device.kind === 'videoinput');
            
            if (this.availableCameras.length === 0) {
                throw new Error('No cameras found on your device');
            }

            console.log('Available cameras:', this.availableCameras.length);
        } catch (error) {
            console.error('Error checking cameras:', error);
            throw error;
        }
    }

    async initializeCamera() {
        try {
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
            }

            const constraints = {
                video: {
                    facingMode: this.facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 30 },
                    aspectRatio: { ideal: 16/9 }
                }
            };

            // If on mobile, try to use the back camera first
            if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
                if (this.facingMode === 'user') {
                    constraints.video.facingMode = { exact: 'user' };
                } else {
                    constraints.video.facingMode = { exact: 'environment' };
                }
            }

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;

            // Wait for video to be ready
            await new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    this.video.play().then(resolve);
                };
            });

            // Update canvas size to match video
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;

            console.log('Camera initialized successfully');
            this.showSuccessMessage('Camera connected successfully!');
        } catch (error) {
            console.error('Camera initialization error:', error);
            
            // Try fallback options
            await this.tryFallbackOptions(error);
        }
    }

    async tryFallbackOptions(originalError) {
        try {
            // Try with basic constraints
            const basicConstraints = {
                video: true
            };

            this.stream = await navigator.mediaDevices.getUserMedia(basicConstraints);
            this.video.srcObject = this.stream;
            console.log('Camera initialized with fallback options');
            this.showSuccessMessage('Camera connected with basic settings');
        } catch (error) {
            console.error('Fallback camera initialization failed:', error);
            this.handleCameraError(originalError);
        }
    }

    handleCameraError(error) {
        let errorMessage = 'Error accessing camera. ';
        
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            errorMessage += 'Please allow camera access to use this app.';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            errorMessage += 'No camera found on your device.';
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            errorMessage += 'Your camera might be in use by another application.';
        } else if (error.name === 'OverconstrainedError') {
            errorMessage += 'Could not find a camera matching the requirements.';
        } else {
            errorMessage += 'Please check your camera connection and permissions.';
        }

        this.showErrorMessage(errorMessage);
    }

    showErrorMessage(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <span>${message}</span>
        `;
        document.querySelector('.video-container').appendChild(errorDiv);

        // Add error message styling if not already present
        if (!document.querySelector('#error-style')) {
            const style = document.createElement('style');
            style.id = 'error-style';
            style.textContent = `
                .error-message {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(255, 0, 0, 0.8);
                    color: white;
                    padding: 1rem 2rem;
                    border-radius: 8px;
                    text-align: center;
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .error-message i {
                    font-size: 1.5rem;
                }
            `;
            document.head.appendChild(style);
        }
    }

    showSuccessMessage(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
        `;
        document.querySelector('.video-container').appendChild(successDiv);

        // Add success message styling if not already present
        if (!document.querySelector('#success-style')) {
            const style = document.createElement('style');
            style.id = 'success-style';
            style.textContent = `
                .success-message {
                    position: absolute;
                    top: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(40, 167, 69, 0.8);
                    color: white;
                    padding: 0.5rem 1rem;
                    border-radius: 20px;
                    text-align: center;
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    animation: fadeOut 3s forwards;
                }
                .success-message i {
                    font-size: 1.2rem;
                }
                @keyframes fadeOut {
                    0% { opacity: 1; }
                    70% { opacity: 1; }
                    100% { opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        // Remove success message after animation
        setTimeout(() => {
            successDiv.remove();
        }, 3000);
    }

    setupEventListeners() {
        // Photo strip capture
        document.getElementById('captureBtn').addEventListener('click', () => {
            if (!this.isCapturing) {
                this.capturePhotoStrip();
            }
        });

        // Single photo capture
        document.getElementById('singleCaptureBtn').addEventListener('click', () => {
            if (!this.isCapturing) {
                this.capturePhoto();
            }
        });

        // Switch camera
        document.getElementById('switchCameraBtn').addEventListener('click', () => this.switchCamera());

        // Quick filters
        document.querySelectorAll('.quick-filter-btn').forEach(button => {
            button.addEventListener('click', () => {
                document.querySelectorAll('.quick-filter-btn').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                this.currentFilter = button.dataset.filter;
                this.applyFilter();
            });
        });

        // Download buttons
        document.getElementById('downloadBtn').addEventListener('click', () => this.downloadPhoto());
        document.getElementById('downloadStripBtn').addEventListener('click', () => this.downloadPhotoStrip());

        // Other buttons
        document.getElementById('printBtn').addEventListener('click', () => this.printPhoto());
        document.getElementById('shareBtn').addEventListener('click', () => this.sharePhoto());

        // Sticker drag and drop
        this.setupStickerDragAndDrop();
    }

    setupStickerDragAndDrop() {
        const overlayContainer = document.getElementById('overlayContainer');
        overlayContainer.style.pointerEvents = 'auto';

        // Make stickers draggable
        document.querySelectorAll('.sticker').forEach(sticker => {
            sticker.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', sticker.dataset.sticker);
            });
        });

        overlayContainer.addEventListener('dragover', (e) => e.preventDefault());

        overlayContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            const emoji = e.dataTransfer.getData('text/plain');
            const rect = overlayContainer.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const stickerDiv = document.createElement('div');
            stickerDiv.className = 'draggable-sticker';
            stickerDiv.textContent = emoji;
            stickerDiv.style.position = 'absolute';
            stickerDiv.style.left = x + 'px';
            stickerDiv.style.top = y + 'px';
            stickerDiv.style.fontSize = '40px';
            stickerDiv.style.cursor = 'move';
            stickerDiv.style.userSelect = 'none';

            this.makeStickerDraggable(stickerDiv);
            overlayContainer.appendChild(stickerDiv);
            this.stickers.push({ element: stickerDiv, x, y });
        });
    }

    makeStickerDraggable(element) {
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;

        element.addEventListener('mousedown', dragStart);
        element.addEventListener('mousemove', drag);
        element.addEventListener('mouseup', dragEnd);
        element.addEventListener('mouseleave', dragEnd);

        function dragStart(e) {
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;

            if (e.target === element) {
                isDragging = true;
            }
        }

        function drag(e) {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;

                xOffset = currentX;
                yOffset = currentY;

                setTranslate(currentX, currentY, element);
            }
        }

        function setTranslate(xPos, yPos, el) {
            el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
        }

        function dragEnd() {
            initialX = currentX;
            initialY = currentY;
            isDragging = false;
        }
    }

    async switchCamera() {
        this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';
        if (this.stream) {
            const tracks = this.stream.getTracks();
            tracks.forEach(track => track.stop());
        }
        await this.initializeCamera();
    }

    applyFilter() {
        // Remove all filter classes
        this.video.className = '';
        // Add new filter class
        this.video.classList.add(`filter-${this.currentFilter}`);
    }

    async capturePhotoStrip() {
        if (this.isCapturing) return;
        this.isCapturing = true;
        this.stripPhotos = [];

        const totalPhotos = 4;
        const countdownStart = 3;

        for (let photoIndex = 0; photoIndex < totalPhotos; photoIndex++) {
            // Countdown before each photo
            await this.showCountdown(countdownStart);
            
            // Take the photo
            const photoData = await this.takePhoto();
            this.stripPhotos.push(photoData);
            
            // Show flash effect
            this.addCaptureEffect();

            // Wait between photos if not the last one
            if (photoIndex < totalPhotos - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        this.isCapturing = false;
        this.createPhotoStrip();
    }

    showCountdown(seconds) {
        return new Promise(resolve => {
            this.countdownTimer.style.display = 'block';
            let count = seconds;

            const updateCount = () => {
                if (count > 0) {
                    this.countdownTimer.textContent = count;
                    count--;
                    setTimeout(updateCount, 1000);
                } else {
                    this.countdownTimer.style.display = 'none';
                    resolve();
                }
            };

            updateCount();
        });
    }

    takePhoto() {
        return new Promise(resolve => {
            // Set canvas dimensions to match video
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;

            // Draw video frame to canvas with current filter
            this.ctx.filter = window.getComputedStyle(this.video).filter;
            this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

            // Draw stickers
            this.stickers.forEach(sticker => {
                const rect = sticker.element.getBoundingClientRect();
                const videoRect = this.video.getBoundingClientRect();
                const x = (rect.left - videoRect.left) * (this.canvas.width / videoRect.width);
                const y = (rect.top - videoRect.top) * (this.canvas.height / videoRect.height);
                this.ctx.font = `${40 * (this.canvas.width / videoRect.width)}px Arial`;
                this.ctx.fillText(sticker.element.textContent, x, y);
            });

            // Get photo data
            const photoData = this.canvas.toDataURL('image/png');
            resolve(photoData);
        });
    }

    createPhotoStrip() {
        // Create strip overlay
        const overlay = document.createElement('div');
        overlay.className = 'strip-overlay';
        
        const container = document.createElement('div');
        container.className = 'strip-container';
        
        const header = document.createElement('div');
        header.className = 'strip-header';
        header.innerHTML = '<h2>✨ Your Photo Strip ✨</h2>';
        
        const strip = document.createElement('div');
        strip.className = 'photo-strip';
        
        // Add photos to strip
        this.stripPhotos.forEach(photoData => {
            const photoContainer = document.createElement('div');
            photoContainer.className = 'strip-photo-container';
            
            const img = document.createElement('img');
            img.src = photoData;
            photoContainer.appendChild(img);
            strip.appendChild(photoContainer);
        });
        
        const actions = document.createElement('div');
        actions.className = 'strip-actions';
        
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'action-btn';
        downloadBtn.innerHTML = '<i class="fas fa-download"></i> Save Strip';
        downloadBtn.onclick = () => {
            this.downloadPhotoStrip();
            document.body.removeChild(overlay);
        };
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'action-btn';
        closeBtn.innerHTML = '<i class="fas fa-times"></i> Close';
        closeBtn.onclick = () => document.body.removeChild(overlay);
        
        actions.appendChild(downloadBtn);
        actions.appendChild(closeBtn);
        
        container.appendChild(header);
        container.appendChild(strip);
        container.appendChild(actions);
        overlay.appendChild(container);
        document.body.appendChild(overlay);
    }

    downloadPhotoStrip() {
        if (this.stripPhotos.length === 0) {
            alert('Take a photo strip first!');
            return;
        }

        // Create a new canvas for the strip
        const stripCanvas = document.createElement('canvas');
        const ctx = stripCanvas.getContext('2d');
        
        // Set dimensions for the classic photobooth strip (2:3 ratio for each photo)
        const photoWidth = 600;
        const photoHeight = 400;
        const padding = 40;
        const borderWidth = 60; // White border on sides
        
        // Canvas dimensions including border
        stripCanvas.width = photoWidth + (borderWidth * 2);
        stripCanvas.height = (photoHeight * this.stripPhotos.length) + (padding * (this.stripPhotos.length - 1)) + (borderWidth * 2);
        
        // Fill background white
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, stripCanvas.width, stripCanvas.height);

        // Add subtle pattern to the border (optional)
        this.drawStripPattern(ctx, stripCanvas.width, stripCanvas.height);
        
        // Draw photos
        this.stripPhotos.forEach((photoData, index) => {
            const img = new Image();
            img.src = photoData;
            const y = borderWidth + (index * (photoHeight + padding));
            
            // Draw photo
            ctx.drawImage(img, borderWidth, y, photoWidth, photoHeight);
            
            // Add subtle shadow
            ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 2;
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 4;
            ctx.strokeRect(borderWidth, y, photoWidth, photoHeight);
            
            // Reset shadow
            ctx.shadowColor = 'transparent';
        });

        // Add branding or date at the bottom
        const date = new Date().toLocaleDateString();
        ctx.fillStyle = '#333';
        ctx.font = '20px Poppins';
        ctx.textAlign = 'center';
        ctx.fillText('AESTHETIC PHOTOBOOTH', stripCanvas.width / 2, stripCanvas.height - 30);
        ctx.font = '16px Poppins';
        ctx.fillText(date, stripCanvas.width / 2, stripCanvas.height - 10);
        
        // Download the strip
        const link = document.createElement('a');
        link.download = `photobooth-strip-${Date.now()}.png`;
        link.href = stripCanvas.toDataURL('image/png');
        link.click();
    }

    drawStripPattern(ctx, width, height) {
        // Create subtle dot pattern for border
        const patternSize = 20;
        ctx.fillStyle = '#f8f8f8';
        
        for (let x = 0; x < width; x += patternSize) {
            for (let y = 0; y < height; y += patternSize) {
                ctx.beginPath();
                ctx.arc(x, y, 1, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    capturePhoto() {
        // Set canvas dimensions to match video
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;

        // Draw video frame to canvas with current filter
        this.ctx.filter = window.getComputedStyle(this.video).filter;
        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

        // Draw stickers
        this.stickers.forEach(sticker => {
            const rect = sticker.element.getBoundingClientRect();
            const videoRect = this.video.getBoundingClientRect();
            
            // Calculate sticker position relative to video
            const x = (rect.left - videoRect.left) * (this.canvas.width / videoRect.width);
            const y = (rect.top - videoRect.top) * (this.canvas.height / videoRect.height);
            
            // Draw emoji sticker
            this.ctx.font = `${40 * (this.canvas.width / videoRect.width)}px Arial`;
            this.ctx.fillText(sticker.element.textContent, x, y);
        });

        // Add to gallery
        const photoUrl = this.canvas.toDataURL('image/png');
        this.photos.push(photoUrl);
        this.updateGallery();

        // Add capture effect
        this.addCaptureEffect();
    }

    addCaptureEffect() {
        const flash = document.createElement('div');
        flash.style.position = 'fixed';
        flash.style.top = '0';
        flash.style.left = '0';
        flash.style.right = '0';
        flash.style.bottom = '0';
        flash.style.backgroundColor = 'white';
        flash.style.opacity = '0.8';
        flash.style.zIndex = '9999';
        flash.style.animation = 'flash 0.5s ease-out';

        document.body.appendChild(flash);

        setTimeout(() => {
            document.body.removeChild(flash);
        }, 500);

        // Add CSS animation if not already present
        if (!document.querySelector('#flash-animation')) {
            const style = document.createElement('style');
            style.id = 'flash-animation';
            style.textContent = `
                @keyframes flash {
                    0% { opacity: 0.8; }
                    100% { opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    updateGallery() {
        const photoUrl = this.photos[this.photos.length - 1];
        const photoElement = document.createElement('div');
        photoElement.classList.add('gallery-item');
        
        const img = document.createElement('img');
        img.src = photoUrl;
        img.alt = 'Captured photo';
        
        photoElement.appendChild(img);
        this.photoGallery.insertBefore(photoElement, this.photoGallery.firstChild);
    }

    downloadPhoto() {
        if (this.photos.length === 0) {
            alert('Take a photo first!');
            return;
        }
        const link = document.createElement('a');
        link.download = `photobooth-${Date.now()}.png`;
        link.href = this.photos[this.photos.length - 1];
        link.click();
    }

    printPhoto() {
        if (this.photos.length === 0) {
            alert('Take a photo first!');
            return;
        }
        const win = window.open('');
        win.document.write(`
            <html>
                <head>
                    <title>Print Photo</title>
                    <style>
                        img { max-width: 100%; height: auto; }
                        @media print {
                            img { max-width: 100%; }
                        }
                    </style>
                </head>
                <body>
                    <img src="${this.photos[this.photos.length - 1]}" onload="window.print();window.close()">
                </body>
            </html>
        `);
    }

    async sharePhoto() {
        if (this.photos.length === 0) {
            alert('Take a photo first!');
            return;
        }

        if (navigator.share) {
            try {
                const blob = await (await fetch(this.photos[this.photos.length - 1])).blob();
                const file = new File([blob], 'photobooth.png', { type: 'image/png' });
                await navigator.share({
                    files: [file],
                    title: 'Photobooth Picture',
                    text: 'Check out my photo!'
                });
            } catch (err) {
                console.error('Error sharing:', err);
                alert('Error sharing the photo.');
            }
        } else {
            alert('Web Share API is not supported in your browser.');
        }
    }
}

// Initialize the photobooth when the page loads
window.addEventListener('load', () => {
    new Photobooth();
});
