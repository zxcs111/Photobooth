class Photobooth {
    constructor() {
        // Initialize DOM elements
        this.video = document.getElementById('camera');
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.captureCount = document.getElementById('captureCount');
        this.stripsGallery = document.getElementById('stripsGallery');
        this.captureButton = document.getElementById('stripCaptureBtn');
        
        // Initialize state
        this.stripPhotos = [];
        this.isCapturingStrip = false;
        this.currentEffect = 'normal';
        
        // Set up canvas with 1:1 aspect ratio for square photos
        this.canvas.width = 700;
        this.canvas.height = 700;
        
        // Clear any existing state
        this.stripsGallery.innerHTML = '';
        localStorage.removeItem('photostrip');
        
        // Initialize camera and set up events
        this.initializeCamera();
        this.setupEffectButtons();
        this.setupCaptureButton();
    }

    setupEffectButtons() {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentEffect = btn.dataset.effect;
                this.applyVideoEffect();
            };
        });
    }

    setupCaptureButton() {
        this.captureButton.onclick = () => {
            if (!this.isCapturingStrip) {
                this.startCapture();
            }
        };
    }

    async initializeCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 700 },
                    height: { ideal: 700 },
                    facingMode: 'user',
                    aspectRatio: { ideal: 1 }
                }
            });
            this.video.srcObject = stream;
            // Ensure video dimensions match canvas
            this.video.width = 700;
            this.video.height = 700;
        } catch (err) {
            console.error('Error accessing camera:', err);
            alert('Unable to access camera. Please make sure you have granted camera permissions.');
        }
    }

    async startCapture() {
        if (this.isCapturingStrip) return;
        
        this.isCapturingStrip = true;
        this.stripPhotos = [];
        this.stripsGallery.innerHTML = '';
        this.captureButton.disabled = true;
        
        try {
            await this.showMessage('Ready...', 1000);
            
            for (let i = 0; i < 4; i++) {
                // Countdown
                await this.showMessage('3', 1000);
                await this.showMessage('2', 1000);
                await this.showMessage('1', 1000);
                await this.showMessage('SMILE!', 500);
                
                // Take photo
                const photo = this.takePhoto();
                this.stripPhotos.push(photo);
                this.displayPhoto(photo, i);
                
                // Show flash and confirmation
                this.showFlash();
                await this.showMessage('✓', 500);
                
                // Wait between photos
                if (i < 3) {
                    await this.wait(1000);
                }
            }
            
            // Add control buttons
            this.addControlButtons();
            
        } catch (error) {
            console.error('Error during capture:', error);
        } finally {
            // Reset state
            this.isCapturingStrip = false;
            this.captureButton.disabled = false;
            this.hideMessage();
        }
    }

    takePhoto() {
        // Use square dimensions for photos
        const targetSize = 150; // Small square size for gallery display

        // Create a temporary canvas for the square photo
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = targetSize;
        tempCanvas.height = targetSize;
        const tempCtx = tempCanvas.getContext('2d');

        // Mirror effect and scale down
        tempCtx.save();
        tempCtx.scale(-1, 1);
        tempCtx.drawImage(
            this.video, 
            0, 0, this.video.width, this.video.height,
            -targetSize, 0, targetSize, targetSize
        );
        tempCtx.restore();
        
        // Apply effect if any
        const effectCanvas = this.applyCanvasEffect(tempCanvas);
        return effectCanvas.toDataURL('image/jpeg', 0.9);
    }

    displayPhoto(photoData, index) {
        const photoDiv = document.createElement('div');
        photoDiv.className = 'strip-photo';
        
        const img = document.createElement('img');
        img.src = photoData;
        img.alt = `Photo ${index + 1}`;
        
        // Add download button for individual photo
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'photo-download-btn';
        downloadBtn.innerHTML = '💾';
        downloadBtn.title = 'Download this photo';
        downloadBtn.onclick = () => this.downloadSinglePhoto(photoData, index);
        
        photoDiv.appendChild(img);
        photoDiv.appendChild(downloadBtn);
        this.stripsGallery.appendChild(photoDiv);
    }

    downloadSinglePhoto(photoData, index) {
        const link = document.createElement('a');
        link.download = `photo-${index + 1}-${new Date().getTime()}.jpg`;
        link.href = photoData;
        link.click();
    }

    addControlButtons() {
        const container = document.createElement('div');
        container.className = 'button-container';
        
        const customizeBtn = document.createElement('button');
        customizeBtn.className = 'btn customize-btn';
        customizeBtn.innerHTML = '<span class="btn-icon">✨</span> Customize & Download';
        customizeBtn.onclick = () => {
            localStorage.setItem('photostrip', JSON.stringify(this.stripPhotos));
            window.location.href = 'customize.html';
        };
        
        const discardBtn = document.createElement('button');
        discardBtn.className = 'btn discard-btn';
        discardBtn.innerHTML = '<span class="btn-icon">🗑️</span> Discard & Retake';
        discardBtn.onclick = () => {
            this.stripPhotos = [];
            this.stripsGallery.innerHTML = '';
            this.captureButton.disabled = false;
        };
        
        container.appendChild(customizeBtn);
        container.appendChild(discardBtn);
        this.stripsGallery.appendChild(container);
    }

    showFlash() {
        const flash = document.createElement('div');
        flash.className = 'flash';
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 150);
    }

    async showMessage(text, duration) {
        this.captureCount.style.display = 'block';
        this.captureCount.textContent = text;
        await this.wait(duration);
    }

    hideMessage() {
        this.captureCount.style.display = 'none';
    }

    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    applyVideoEffect() {
        this.video.classList.remove('filter-vintage', 'filter-grayscale', 'filter-sepia', 'filter-blur');
        if (this.currentEffect !== 'normal') {
            this.video.classList.add(`filter-${this.currentEffect}`);
        }
    }

    applyCanvasEffect(sourceCanvas) {
        if (this.currentEffect === 'normal') return sourceCanvas;

        const effectCanvas = document.createElement('canvas');
        effectCanvas.width = sourceCanvas.width;
        effectCanvas.height = sourceCanvas.height;
        const effectCtx = effectCanvas.getContext('2d');
        
        effectCtx.drawImage(sourceCanvas, 0, 0);
        
        switch (this.currentEffect) {
            case 'vintage':
                effectCtx.filter = 'sepia(80%) hue-rotate(-20deg) saturate(80%) brightness(90%)';
                break;
            case 'grayscale':
                effectCtx.filter = 'grayscale(100%)';
                break;
            case 'sepia':
                effectCtx.filter = 'sepia(100%)';
                break;
            case 'blur':
                effectCtx.filter = 'blur(4px)';
                break;
        }
        
        effectCtx.drawImage(sourceCanvas, 0, 0);
        effectCtx.filter = 'none';
        return effectCanvas;
    }
}

// Initialize photobooth
document.addEventListener('DOMContentLoaded', () => new Photobooth());