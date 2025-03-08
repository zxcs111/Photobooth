class PhotostripCustomizer {
    constructor() {
        this.previewCanvas = document.getElementById('previewCanvas');
        this.ctx = this.previewCanvas.getContext('2d');
        this.downloadBtn = document.getElementById('downloadBtn');
        
        // Set up canvas dimensions for a vertical strip
        this.photoWidth = 400; // Width of each photo in the strip
        this.photoHeight = 300; // Height maintaining 4:3 ratio
        this.spacing = 15; // Space between photos
        this.padding = 30; // Padding around the entire strip
        
        // Calculate total dimensions
        this.stripWidth = this.photoWidth + (this.padding * 2);
        this.stripHeight = (this.photoHeight * 4) + (this.spacing * 3) + (this.padding * 2);
        
        // Set canvas size
        this.previewCanvas.width = this.stripWidth;
        this.previewCanvas.height = this.stripHeight;
        
        // Load photos and set up events
        this.loadPhotos();
        this.setupDownloadButton();
    }
    
    async loadPhotos() {
        try {
            const stripPhotos = JSON.parse(localStorage.getItem('photostrip'));
            if (!stripPhotos || stripPhotos.length !== 4) {
                throw new Error('Invalid photo data');
            }
            
            // Draw background
            this.ctx.fillStyle = '#FFE5EC';
            this.ctx.fillRect(0, 0, this.stripWidth, this.stripHeight);
            
            // Add a decorative border
            this.ctx.strokeStyle = '#FF69B4';
            this.ctx.lineWidth = 4;
            this.ctx.strokeRect(10, 10, this.stripWidth - 20, this.stripHeight - 20);
            
            // Load and draw each photo
            for (let i = 0; i < 4; i++) {
                const img = new Image();
                img.src = stripPhotos[i];
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                });
                
                const y = this.padding + (i * (this.photoHeight + this.spacing));
                
                // Add a subtle shadow
                this.ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
                this.ctx.shadowBlur = 8;
                this.ctx.shadowOffsetX = 2;
                this.ctx.shadowOffsetY = 2;
                
                // Draw photo with white border
                this.ctx.fillStyle = 'white';
                this.ctx.fillRect(
                    this.padding - 5,
                    y - 5,
                    this.photoWidth + 10,
                    this.photoHeight + 10
                );
                
                // Reset shadow before drawing the photo
                this.ctx.shadowColor = 'transparent';
                
                // Draw the photo
                this.ctx.drawImage(img, this.padding, y, this.photoWidth, this.photoHeight);
            }
            
            // Add decorative elements
            this.addDecorations();
            
        } catch (error) {
            console.error('Error loading photos:', error);
            alert('Error loading photos. Please try again.');
            window.location.href = 'index.html';
        }
    }
    
    addDecorations() {
        // Add title
        this.ctx.font = 'bold 28px Quicksand';
        this.ctx.fillStyle = '#FF1493';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('✨ Photobooth Memories ✨', this.stripWidth / 2, 35);
        
        // Add date with heart
        const date = new Date().toLocaleDateString();
        this.ctx.font = '18px Quicksand';
        this.ctx.fillStyle = '#FF69B4';
        this.ctx.fillText(`💖 ${date} 💖`, this.stripWidth / 2, this.stripHeight - 15);
    }
    
    setupDownloadButton() {
        this.downloadBtn.onclick = () => {
            const link = document.createElement('a');
            link.download = `photostrip-${new Date().getTime()}.jpg`;
            link.href = this.previewCanvas.toDataURL('image/jpeg', 0.9);
            link.click();
        };
    }
}

// Initialize customizer
document.addEventListener('DOMContentLoaded', () => new PhotostripCustomizer());
