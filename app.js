class Photobooth {
    constructor() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('photoCanvas');
        this.photoGallery = document.getElementById('photoGallery');
        this.ctx = this.canvas.getContext('2d');
        this.currentFilter = 'none';
        this.stream = null;
        this.facingMode = 'user';
        this.photos = [];
        
        this.initializeCamera();
        this.setupEventListeners();
    }

    async initializeCamera() {
        try {
            const constraints = {
                video: {
                    facingMode: this.facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;
        } catch (err) {
            console.error('Error accessing camera:', err);
            alert('Error accessing camera. Please make sure you have granted camera permissions.');
        }
    }

    setupEventListeners() {
        // Capture button
        document.getElementById('captureBtn').addEventListener('click', () => this.capturePhoto());

        // Switch camera
        document.getElementById('switchCameraBtn').addEventListener('click', () => this.switchCamera());

        // Filter buttons
        document.querySelectorAll('.filter-buttons button').forEach(button => {
            button.addEventListener('click', () => {
                this.currentFilter = button.dataset.filter;
                document.querySelectorAll('.filter-buttons button').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                this.applyFilter();
            });
        });

        // Backdrop selection
        document.getElementById('backdropSelect').addEventListener('change', (e) => {
            this.changeBackdrop(e.target.value);
        });

        // Download button
        document.getElementById('downloadBtn').addEventListener('click', () => this.downloadPhoto());

        // Print button
        document.getElementById('printBtn').addEventListener('click', () => this.printPhoto());

        // Share button
        document.getElementById('shareBtn').addEventListener('click', () => this.sharePhoto());

        // Sticker drag and drop
        this.setupStickerDragAndDrop();
    }

    setupStickerDragAndDrop() {
        const stickers = document.querySelectorAll('.sticker');
        const overlayContainer = document.getElementById('overlayContainer');

        stickers.forEach(sticker => {
            sticker.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', e.target.src);
            });
        });

        overlayContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        overlayContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            const stickerSrc = e.dataTransfer.getData('text/plain');
            const stickerImg = document.createElement('img');
            stickerImg.src = stickerSrc;
            stickerImg.classList.add('draggable-sticker');
            stickerImg.style.position = 'absolute';
            stickerImg.style.left = (e.offsetX - 30) + 'px';
            stickerImg.style.top = (e.offsetY - 30) + 'px';
            stickerImg.style.width = '60px';
            stickerImg.style.height = '60px';
            stickerImg.style.cursor = 'move';
            
            this.makeStickerDraggable(stickerImg);
            overlayContainer.appendChild(stickerImg);
        });
    }

    makeStickerDraggable(element) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        
        element.onmousedown = dragMouseDown;

        function dragMouseDown(e) {
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }

        function elementDrag(e) {
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            element.style.top = (element.offsetTop - pos2) + "px";
            element.style.left = (element.offsetLeft - pos1) + "px";
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
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
        this.video.className = `filter-${this.currentFilter}`;
    }

    changeBackdrop(backdrop) {
        const videoContainer = document.querySelector('.video-container');
        if (backdrop === 'none') {
            videoContainer.style.background = '#000';
        } else {
            videoContainer.style.background = `url('backgrounds/${backdrop}.jpg') center/cover`;
        }
    }

    capturePhoto() {
        // Set canvas dimensions to match video
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;

        // Draw video frame to canvas
        this.ctx.filter = this.video.style.filter;
        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

        // Draw stickers
        const stickers = document.querySelectorAll('.draggable-sticker');
        stickers.forEach(sticker => {
            const rect = sticker.getBoundingClientRect();
            const videoRect = this.video.getBoundingClientRect();
            const x = (rect.left - videoRect.left) * (this.canvas.width / videoRect.width);
            const y = (rect.top - videoRect.top) * (this.canvas.height / videoRect.height);
            const width = sticker.width * (this.canvas.width / videoRect.width);
            const height = sticker.height * (this.canvas.height / videoRect.height);
            this.ctx.drawImage(sticker, x, y, width, height);
        });

        // Add to gallery
        const photoUrl = this.canvas.toDataURL('image/png');
        this.photos.push(photoUrl);
        this.updateGallery();
    }

    updateGallery() {
        const photoUrl = this.photos[this.photos.length - 1];
        const photoElement = document.createElement('div');
        photoElement.classList.add('gallery-item');
        photoElement.innerHTML = `<img src="${photoUrl}" alt="Captured photo">`;
        this.photoGallery.appendChild(photoElement);
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
        win.document.write(`<img src="${this.photos[this.photos.length - 1]}" onload="window.print();window.close()">`);
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
