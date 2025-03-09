let currentFilter = 'none';
let capturedPhotos = [];
let stream = null;
let isInitializing = false;

// Camera permission states
const permissionOverlay = document.getElementById('permissionOverlay');
const startCaptureBtn = document.getElementById('startCapture');

async function checkCameraPermission() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        console.log('Available video devices:', videoDevices);

        if (videoDevices.length === 0) {
            console.error('No camera devices found');
            showPermissionOverlay();
            return;
        }

        // Try to initialize camera directly
        await initCamera();
    } catch (err) {
        console.error('Error checking camera permission:', err);
        showPermissionOverlay();
    }
}

function showPermissionOverlay() {
    permissionOverlay.style.display = 'flex';
    startCaptureBtn.disabled = true;
}

function hidePermissionOverlay() {
    permissionOverlay.style.display = 'none';
    startCaptureBtn.disabled = false;
}

async function initCamera() {
    if (isInitializing) return;
    isInitializing = true;

    try {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }

        // First enumerate devices to get available cameras
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        console.log('Found video devices:', videoDevices.map(d => ({ label: d.label, id: d.deviceId })));

        // Try different camera configurations in order of preference
        const constraints = [
            // First try: Specific device (if available) with ideal resolution
            ...(videoDevices.map(device => ({
                video: {
                    deviceId: { exact: device.deviceId },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            }))),
            // Second try: Any camera with ideal resolution
            {
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            },
            // Last try: Any camera with any resolution
            { video: true }
        ];

        let error;
        for (const constraint of constraints) {
            try {
                console.log('Trying constraint:', constraint);
                stream = await navigator.mediaDevices.getUserMedia(constraint);
                const video = document.getElementById('camera');
                video.srcObject = stream;
                
                // Wait for video to be ready
                await new Promise((resolve, reject) => {
                    video.onloadedmetadata = () => {
                        video.play()
                            .then(resolve)
                            .catch(reject);
                    };
                    video.onerror = reject;
                });

                console.log('Successfully initialized camera with constraint:', constraint);
                hidePermissionOverlay();
                isInitializing = false;
                return;
            } catch (e) {
                error = e;
                console.log('Failed to initialize with constraint:', constraint, e);
            }
        }

        // If we get here, all constraints failed
        throw error || new Error('Failed to initialize camera with any constraint');
    } catch (err) {
        console.error('Error accessing camera:', err);
        showPermissionOverlay();
        isInitializing = false;
    }
}

function applyFilter(filter) {
    currentFilter = filter;
    const video = document.getElementById('camera');
    video.style.filter = getFilterStyle(filter);
    
    // Update active filter button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function getFilterStyle(filter) {
    switch(filter) {
        case 'grayscale': return 'grayscale(100%)';
        case 'sepia': return 'sepia(100%)';
        case 'brightness': return 'brightness(130%)';
        default: return 'none';
    }
}

async function startCaptureSequence() {
    capturedPhotos = [];
    startCaptureBtn.disabled = true;
    
    // Show "Ready!"
    await showCountdownMessage('Ready!', 1500);
    
    // Count 3, 2, 1
    for(let i = 3; i >= 1; i--) {
        await showCountdownMessage(i, 1000);
    }
    
    // Show "Smile!" and take the photo
    await showCountdownMessage('Smile!', 500);
    await capturePhoto(1);

    // Wait between shots
    await new Promise(resolve => setTimeout(resolve, 1000));

    // For remaining 3 photos
    for(let i = 2; i <= 4; i++) {
        // Count 3, 2, 1
        for(let j = 3; j >= 1; j--) {
            await showCountdownMessage(j, 1000);
        }
        
        // Show "Smile!" and take the photo
        await showCountdownMessage('Smile!', 500);
        await capturePhoto(i);
        
        if (i < 4) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    document.getElementById('finalButtons').classList.remove('hidden');
    startCaptureBtn.disabled = false;
}

function showCountdownMessage(message, duration) {
    return new Promise(resolve => {
        const countdownEl = document.getElementById('countdown');
        countdownEl.style.display = 'flex';
        countdownEl.textContent = message;
        countdownEl.setAttribute('data-message', message);
        
        setTimeout(() => {
            countdownEl.style.display = 'none';
            countdownEl.removeAttribute('data-message');
            resolve();
        }, duration);
    });
}

async function capturePhoto(index) {
    const video = document.getElementById('camera');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.filter = getFilterStyle(currentFilter);
    ctx.drawImage(video, 0, 0);
    
    const photoSlot = document.getElementById(`photo${index}`);
    photoSlot.style.backgroundImage = `url(${canvas.toDataURL()})`;
    capturedPhotos.push(canvas.toDataURL());
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initialize camera permission check on load
    checkCameraPermission();

    // Button event listeners
    startCaptureBtn.addEventListener('click', startCaptureSequence);
    
    document.getElementById('requestPermission').addEventListener('click', async () => {
        await initCamera();
    });

    document.getElementById('discardBtn').addEventListener('click', () => {
        capturedPhotos = [];
        document.querySelectorAll('.photo-slot').forEach(slot => {
            slot.style.backgroundImage = 'none';
        });
        document.getElementById('finalButtons').classList.add('hidden');
        startCaptureBtn.disabled = false;
    });

    document.getElementById('customizeBtn').addEventListener('click', () => {
        localStorage.setItem('photos', JSON.stringify(capturedPhotos));
        window.location.href = 'customize.html';
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            applyFilter(btn.dataset.filter);
        });
    });

    // Add visibility change handler to reinitialize camera when tab becomes visible
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && !stream) {
            initCamera();
        }
    });
});
