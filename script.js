class AudioAnimator {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.vizControls = document.getElementById('vizControls');
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.animationId = null;
        this.isPlaying = false;
        this.currentMode = 'spectrum';
        this.audioBuffer = null;
        this.source = null;
        this.startTime = 0;
        this.pauseTime = 0;
        this.audioDest = null;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.isRecording = false;
        this.modeOptions = { color: 'rainbow', sensitivity: 'normal' };
        
        // Visualization data
        this.particles = [];
        this.fractalNodes = [];
        this.constellationStars = [];
        this.orbitalBodies = [];
        
        this.setupCanvas();
        this.setupEventListeners();
        this.startIdleAnimation();
    }
    
    setupCanvas() {
        const resizeCanvas = () => {
            const rect = this.canvas.getBoundingClientRect();
            this.canvas.width = rect.width * window.devicePixelRatio;
            this.canvas.height = rect.height * window.devicePixelRatio;
            this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        };
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }
    
    setupEventListeners() {
        // Upload area interactions
        this.uploadArea.addEventListener('click', () => {
            this.fileInput.click();
        });
        
        this.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uploadArea.classList.add('dragover');
        });
        
        this.uploadArea.addEventListener('dragleave', () => {
            this.uploadArea.classList.remove('dragover');
        });
        
        this.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFile(files[0]);
            }
        });
        
        this.fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFile(e.target.files[0]);
            }
        });
        
        // Mode selector
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentMode = e.target.dataset.mode;
                this.initializeMode();
            });
        });
        
        // Playback controls
        document.getElementById('playBtn').addEventListener('click', () => this.play());
        document.getElementById('pauseBtn').addEventListener('click', () => this.pause());
        document.getElementById('stopBtn').addEventListener('click', () => this.stop());
        
        document.getElementById('recordBtn').addEventListener('click', () => this.startRecording());
        document.getElementById('stopRecordBtn').addEventListener('click', () => this.stopRecording());
        document.getElementById('downloadBtn').addEventListener('click', () => this.downloadRecording());
        document.getElementById('colorSelect').addEventListener('change', (e) => this.modeOptions.color = e.target.value);
        document.getElementById('sensitivitySelect').addEventListener('change', (e) => this.modeOptions.sensitivity = e.target.value);
    }
    
    async handleFile(file) {
        if (!file.type.startsWith('audio/')) {
            this.showError('Please select an audio file');
            return;
        }
        
        this.uploadArea.classList.add('processing');
        this.updateUploadContent('Processing...', 'AI is analyzing your audio file');
        
        try {
            const arrayBuffer = await file.arrayBuffer();
            await this.processAudio(arrayBuffer);
            this.uploadArea.classList.remove('processing');
            this.uploadArea.classList.add('success');
            this.updateUploadContent('Ready to animate!', 'Click to play visualization');
        } catch (error) {
            console.error('Error processing audio:', error);
            this.showError('Error processing audio file');
        }
    }
    
    async processAudio(arrayBuffer) {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 512;
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.audioDest = this.audioContext.createMediaStreamDestination();
        
        this.vizControls.style.display = 'block';
        this.initializeMode();
    }
    
    initializeMode() {
        // Initialize visualization-specific data
        switch(this.currentMode) {
            case 'particles':
                this.initParticles();
                break;
            case 'fractal':
                this.initFractalNodes();
                break;
            case 'constellation':
                this.initConstellation();
                break;
            case 'orb':
                this.initOrbitalBodies();
                break;
        }
    }
    
    play() {
        if (!this.audioBuffer) return;
        
        if (this.source) {
            this.source.stop();
        }
        
        this.source = this.audioContext.createBufferSource();
        this.source.buffer = this.audioBuffer;
        this.source.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
        if (this.audioDest) this.analyser.connect(this.audioDest);
        
        const offset = this.pauseTime || 0;
        this.source.start(0, offset);
        this.startTime = this.audioContext.currentTime - offset;
        
        this.isPlaying = true;
        this.animate();
        
        this.source.onended = () => {
            this.isPlaying = false;
            this.pauseTime = 0;
        };
    }
    
    pause() {
        if (this.source && this.isPlaying) {
            this.source.stop();
            this.pauseTime = this.audioContext.currentTime - this.startTime;
            this.isPlaying = false;
        }
    }
    
    stop() {
        if (this.source) {
            this.source.stop();
        }
        this.isPlaying = false;
        this.pauseTime = 0;
        this.startIdleAnimation();
    }
    
    initParticles() {
        this.particles = [];
        for (let i = 0; i < 200; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                size: Math.random() * 3 + 1,
                hue: Math.random() * 360,
                life: 1,
                frequency: Math.floor(Math.random() * this.dataArray.length)
            });
        }
    }
    
    initFractalNodes() {
        this.fractalNodes = [];
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        for (let i = 0; i < 8; i++) {
            this.fractalNodes.push({
                x: centerX,
                y: centerY,
                angle: (i / 8) * Math.PI * 2,
                length: 50,
                branches: [],
                frequency: Math.floor((i / 8) * this.dataArray.length)
            });
        }
    }
    
    initConstellation() {
        this.constellationStars = [];
        for (let i = 0; i < 100; i++) {
            this.constellationStars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                baseSize: Math.random() * 2 + 1,
                size: 1,
                brightness: Math.random(),
                twinkle: Math.random() * Math.PI * 2,
                frequency: Math.floor(Math.random() * this.dataArray.length),
                connections: []
            });
        }
    }
    
    initOrbitalBodies() {
        this.orbitalBodies = [];
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        for (let i = 0; i < 6; i++) {
            this.orbitalBodies.push({
                angle: (i / 6) * Math.PI * 2,
                distance: 100 + i * 30,
                size: 10,
                speed: 0.02 + i * 0.01,
                hue: i * 60,
                frequency: Math.floor((i / 6) * this.dataArray.length)
            });
        }
    }
    
    updateUploadContent(title, subtitle) {
        const uploadContent = this.uploadArea.querySelector('.upload-content');
        uploadContent.querySelector('h3').textContent = title;
        uploadContent.querySelector('p').textContent = subtitle;
    }
    
    showError(message) {
        this.uploadArea.classList.remove('processing');
        this.uploadArea.classList.add('error');
        this.updateUploadContent('Error', message);
        
        setTimeout(() => {
            this.uploadArea.classList.remove('error');
            this.updateUploadContent('Drop your audio file here', 'or click to browse');
        }, 3000);
    }
    
    startIdleAnimation() {
        const animate = () => {
            if (this.isPlaying) return;
            
            this.ctx.fillStyle = 'rgba(10, 10, 10, 0.1)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            const time = Date.now() * 0.001;
            const centerX = this.canvas.width / 2;
            const centerY = this.canvas.height / 2;
            
            // Draw pulsing circles
            for (let i = 0; i < 3; i++) {
                const radius = 50 + i * 30 + Math.sin(time + i) * 20;
                const alpha = 0.3 - i * 0.1;
                
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                this.ctx.strokeStyle = `rgba(102, 126, 234, ${alpha})`;
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            }
            
            // Draw floating particles
            for (let i = 0; i < 20; i++) {
                const x = centerX + Math.sin(time * 0.5 + i) * 100;
                const y = centerY + Math.cos(time * 0.3 + i) * 80;
                const size = 2 + Math.sin(time + i) * 1;
                
                this.ctx.beginPath();
                this.ctx.arc(x, y, size, 0, Math.PI * 2);
                this.ctx.fillStyle = 'rgba(102, 126, 234, 0.4)';
                this.ctx.fill();
            }
            
            this.animationId = requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    animate() {
        if (!this.isPlaying || !this.analyser) return;
        
        this.analyser.getByteFrequencyData(this.dataArray);
        
        // Clear canvas
        this.ctx.fillStyle = 'rgba(10, 10, 10, 0.1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        switch(this.currentMode) {
            case 'spectrum':
                this.drawSpectrumRings();
                break;
            case 'particles':
                this.drawParticleSystem();
                break;
            case 'fractal':
                this.drawFractalTrees();
                break;
            case 'terrain':
                this.drawWaveTerrain();
                break;
            case 'constellation':
                this.drawConstellation();
                break;
            case 'orb':
                this.drawOrbitalBodies();
                break;
            case 'bars':
                this.drawLinearBars();
                break;
            case 'spiral':
                this.drawSpiralSpectrum();
                break;
            case 'radar':
                this.drawRadarSweep();
                break;
            case 'flow':
                this.drawFlowField();
                break;
        }
        
        this.animationId = requestAnimationFrame(() => this.animate());
    }
    
    drawSpectrumRings() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const maxRadius = Math.min(this.canvas.width, this.canvas.height) * 0.4;
        
        // Multiple rings
        for (let ring = 0; ring < 3; ring++) {
            const baseRadius = 50 + ring * 80;
            const barCount = Math.floor(this.dataArray.length / (ring + 1));
            
            for (let i = 0; i < barCount; i++) {
                const angle = (i / barCount) * Math.PI * 2;
                const amplitude = this.dataArray[i * (ring + 1)] / 255;
                const barHeight = amplitude * 60;
                
                const innerRadius = baseRadius;
                const outerRadius = baseRadius + barHeight;
                
                const x1 = centerX + Math.cos(angle) * innerRadius;
                const y1 = centerY + Math.sin(angle) * innerRadius;
                const x2 = centerX + Math.cos(angle) * outerRadius;
                const y2 = centerY + Math.sin(angle) * outerRadius;
                
                const hue = (i / barCount) * 360 + ring * 120;
                this.ctx.strokeStyle = `hsla(${hue}, 70%, 60%, ${0.8 - ring * 0.2})`;
                this.ctx.lineWidth = 4 - ring;
                
                this.ctx.beginPath();
                this.ctx.moveTo(x1, y1);
                this.ctx.lineTo(x2, y2);
                this.ctx.stroke();
            }
        }
    }
    
    drawParticleSystem() {
        this.particles.forEach(particle => {
            const freqValue = this.dataArray[particle.frequency] / 255;
            
            // Update particle based on frequency
            particle.vx += (Math.random() - 0.5) * freqValue * 0.5;
            particle.vy += (Math.random() - 0.5) * freqValue * 0.5;
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // Boundary wrapping
            if (particle.x < 0) particle.x = this.canvas.width;
            if (particle.x > this.canvas.width) particle.x = 0;
            if (particle.y < 0) particle.y = this.canvas.height;
            if (particle.y > this.canvas.height) particle.y = 0;
            
            // Size and color based on frequency
            const size = particle.size + freqValue * 5;
            const alpha = 0.3 + freqValue * 0.7;
            
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
            this.ctx.fillStyle = `hsla(${particle.hue + freqValue * 60}, 70%, 60%, ${alpha})`;
            this.ctx.fill();
            
            // Velocity damping
            particle.vx *= 0.98;
            particle.vy *= 0.98;
        });
    }
    
    drawFractalTrees() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        this.fractalNodes.forEach(node => {
            const amplitude = this.dataArray[node.frequency] / 255;
            const dynamicLength = node.length + amplitude * 100;
            
            this.drawBranch(node.x, node.y, node.angle, dynamicLength, 0, 4, amplitude);
        });
    }
    
    drawBranch(x, y, angle, length, depth, maxDepth, amplitude) {
        if (depth >= maxDepth || length < 5) return;
        
        const endX = x + Math.cos(angle) * length;
        const endY = y + Math.sin(angle) * length;
        
        const hue = depth * 60 + amplitude * 120;
        const alpha = 1 - depth * 0.2;
        
        this.ctx.strokeStyle = `hsla(${hue}, 70%, 60%, ${alpha})`;
        this.ctx.lineWidth = Math.max(1, 4 - depth);
        
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(endX, endY);
        this.ctx.stroke();
        
        // Recursive branches
        const newLength = length * 0.7;
        this.drawBranch(endX, endY, angle - 0.5 - amplitude * 0.5, newLength, depth + 1, maxDepth, amplitude);
        this.drawBranch(endX, endY, angle + 0.5 + amplitude * 0.5, newLength, depth + 1, maxDepth, amplitude);
    }
    
    drawWaveTerrain() {
        const centerY = this.canvas.height / 2;
        const waveCount = 5;
        
        for (let wave = 0; wave < waveCount; wave++) {
            this.ctx.beginPath();
            const y = centerY + (wave - 2) * 40;
            
            for (let x = 0; x < this.canvas.width; x += 4) {
                const freqIndex = Math.floor((x / this.canvas.width) * this.dataArray.length);
                const amplitude = this.dataArray[freqIndex] / 255;
                const waveY = y + Math.sin(x * 0.02 + wave + Date.now() * 0.001) * 20 * amplitude;
                
                if (x === 0) {
                    this.ctx.moveTo(x, waveY);
                } else {
                    this.ctx.lineTo(x, waveY);
                }
            }
            
            const hue = wave * 72;
            this.ctx.strokeStyle = `hsla(${hue}, 70%, 60%, 0.7)`;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }
    }
    
    drawConstellation() {
        this.constellationStars.forEach((star, index) => {
            const amplitude = this.dataArray[star.frequency] / 255;
            star.size = star.baseSize + amplitude * 4;
            star.twinkle += 0.1;
            
            const brightness = star.brightness + amplitude * 0.5 + Math.sin(star.twinkle) * 0.2;
            
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, brightness)})`;
            this.ctx.fill();
            
            // Draw connections to nearby stars
            this.constellationStars.forEach((otherStar, otherIndex) => {
                if (index !== otherIndex) {
                    const distance = Math.sqrt(
                        Math.pow(star.x - otherStar.x, 2) + Math.pow(star.y - otherStar.y, 2)
                    );
                    
                    if (distance < 150 && amplitude > 0.3) {
                        this.ctx.beginPath();
                        this.ctx.moveTo(star.x, star.y);
                        this.ctx.lineTo(otherStar.x, otherStar.y);
                        this.ctx.strokeStyle = `rgba(102, 126, 234, ${amplitude * 0.3})`;
                        this.ctx.lineWidth = 1;
                        this.ctx.stroke();
                    }
                }
            });
        });
    }
    
    drawOrbitalBodies() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // Central body
        const centralPulse = this.dataArray.reduce((a, b) => a + b) / this.dataArray.length / 255;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, 30 + centralPulse * 20, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + centralPulse * 0.7})`;
        this.ctx.fill();
        
        // Orbital bodies
        this.orbitalBodies.forEach(body => {
            const amplitude = this.dataArray[body.frequency] / 255;
            body.angle += body.speed + amplitude * 0.05;
            
            const x = centerX + Math.cos(body.angle) * body.distance;
            const y = centerY + Math.sin(body.angle) * body.distance;
            const size = body.size + amplitude * 10;
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fillStyle = `hsla(${body.hue}, 70%, 60%, ${0.5 + amplitude * 0.5})`;
            this.ctx.fill();
            
            // Orbital trail
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, body.distance, 0, Math.PI * 2);
            this.ctx.strokeStyle = `hsla(${body.hue}, 50%, 40%, 0.2)`;
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        });
    }
    
    drawLinearBars() {
        const w = this.canvas.width, h = this.canvas.height;
        const barW = Math.max(2, w / this.dataArray.length);
        const sens = this.getSensitivity();
        for (let i = 0; i < this.dataArray.length; i++) {
            const amp = (this.dataArray[i] / 255) * sens;
            const bh = amp * (h * 0.8);
            const hue = this.getHue(i, this.dataArray.length);
            this.ctx.fillStyle = `hsla(${hue},70%,60%,0.8)`;
            this.ctx.fillRect(i * barW, h - bh, barW - 1, bh);
        }
    }
    
    drawSpiralSpectrum() {
        const cx = this.canvas.width/2, cy = this.canvas.height/2;
        const sens = this.getSensitivity();
        for (let i = 0; i < this.dataArray.length; i++) {
            const t = i / this.dataArray.length;
            const amp = (this.dataArray[i]/255) * sens;
            const r = 20 + t * Math.min(cx, cy);
            const a = t * Math.PI * 6;
            const x = cx + Math.cos(a) * (r + amp*40);
            const y = cy + Math.sin(a) * (r + amp*40);
            const hue = this.getHue(i, this.dataArray.length);
            this.ctx.beginPath();
            this.ctx.arc(x, y, 2 + amp*3, 0, Math.PI*2);
            this.ctx.fillStyle = `hsla(${hue},70%,60%,0.9)`;
            this.ctx.fill();
        }
    }
    
    drawRadarSweep() {
        const cx = this.canvas.width/2, cy = this.canvas.height/2;
        const radius = Math.min(cx, cy) * 0.9;
        const time = Date.now()*0.002;
        const sweep = (time % (Math.PI*2));
        this.ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        this.ctx.beginPath(); this.ctx.arc(cx, cy, radius, 0, Math.PI*2); this.ctx.stroke();
        for (let i = 0; i < this.dataArray.length; i++) {
            const t = i / this.dataArray.length;
            const amp = this.dataArray[i]/255;
            const angle = sweep + t * Math.PI*2;
            const len = 20 + amp * 80;
            const x1 = cx + Math.cos(angle) * (radius - len);
            const y1 = cy + Math.sin(angle) * (radius - len);
            const x2 = cx + Math.cos(angle) * radius;
            const y2 = cy + Math.sin(angle) * radius;
            const hue = this.getHue(i, this.dataArray.length);
            this.ctx.strokeStyle = `hsla(${hue},70%,60%,${0.3+amp*0.7})`;
            this.ctx.beginPath(); this.ctx.moveTo(x1,y1); this.ctx.lineTo(x2,y2); this.ctx.stroke();
        }
    }
    
    drawFlowField() {
        const w = this.canvas.width, h = this.canvas.height;
        const grid = 20;
        const sens = this.getSensitivity();
        for (let y = 0; y < h; y += grid) {
            for (let x = 0; x < w; x += grid) {
                const i = Math.floor(((x+y) / (w+h)) * this.dataArray.length);
                const amp = (this.dataArray[i]/255) * sens;
                const ang = Math.sin((x+y)*0.01 + Date.now()*0.001) * Math.PI * amp;
                const x2 = x + Math.cos(ang) * grid * amp * 2;
                const y2 = y + Math.sin(ang) * grid * amp * 2;
                const hue = this.getHue(i, this.dataArray.length);
                this.ctx.strokeStyle = `hsla(${hue},70%,60%,0.4)`;
                this.ctx.beginPath(); this.ctx.moveTo(x,y); this.ctx.lineTo(x2,y2); this.ctx.stroke();
            }
        }
    }
    
    getHue(i, total) {
        if (this.modeOptions.color === 'mono') return 220;
        return (i / total) * 360;
    }
    
    getSensitivity() {
        return this.modeOptions.sensitivity === 'high' ? 1.6 :
               this.modeOptions.sensitivity === 'low' ? 0.7 : 1.0;
    }
    
    startRecording() {
        if (!this.audioBuffer || this.isRecording) return;
        const canvasStream = this.canvas.captureStream(60);
        const mixed = new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...(this.audioDest ? this.audioDest.stream.getAudioTracks() : [])
        ]);
        this.recordedChunks = [];
        this.mediaRecorder = new MediaRecorder(mixed, { mimeType: 'video/webm;codecs=vp9,opus' });
        this.mediaRecorder.ondataavailable = (e) => { if (e.data.size) this.recordedChunks.push(e.data); };
        this.mediaRecorder.onstop = () => { document.getElementById('downloadBtn').disabled = this.recordedChunks.length === 0; };
        this.mediaRecorder.start();
        this.isRecording = true;
        document.getElementById('stopRecordBtn').disabled = false;
    }
    
    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            document.getElementById('stopRecordBtn').disabled = true;
        }
    }
    
    downloadRecording() {
        if (!this.recordedChunks.length) return;
        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'audio-visualization.webm'; a.click();
        URL.revokeObjectURL(url);
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new AudioAnimator();
});

// Add smooth scrolling for better UX
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});
