// main.js — Interactive Video Modal & Hans Zimmer Cornfield Chase Audio Engine

document.addEventListener('DOMContentLoaded', function () {
    // Segment Tab Switcher Initialization
    const segmentTabs = document.querySelectorAll('.segment-tab');
    const tabContents = document.querySelectorAll('.tab-content');

    segmentTabs.forEach(tab => {
        tab.addEventListener('click', function () {
            const targetId = this.getAttribute('data-target');
            if (!targetId) return;

            segmentTabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            this.classList.add('active');
            const targetEl = document.getElementById(targetId);
            if (targetEl) {
                targetEl.classList.add('active');
                if (typeof renderPieChart === 'function') renderPieChart();
                if (typeof renderSpiderChart === 'function') renderSpiderChart();
            }
        });
    });

    // Theme Toggle Switcher Initialization
    const themeBtn = document.getElementById('theme-toggle-btn');
    const themeIcon = document.getElementById('theme-toggle-icon');

    function updateThemeIcon() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        if (themeIcon) {
            themeIcon.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
        }
    }
    updateThemeIcon();

    if (themeBtn) {
        themeBtn.addEventListener('click', function () {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('spendly-theme', newTheme);
            updateThemeIcon();
        });
    }

    const modal = document.getElementById('video-modal');
    if (!modal) return;

    const openBtns = [
        document.getElementById('open-video-btn'),
        document.getElementById('open-video-card-btn'),
        document.getElementById('open-video-cta-btn')
    ];
    const closeBtn = document.getElementById('close-video-modal-btn');
    
    // Chapter elements
    const chapterBtns = document.querySelectorAll('.chapter-btn');
    const scenes = document.querySelectorAll('.video-scene');
    
    // Player controls
    const playBtn = document.getElementById('video-play-btn');
    const playIcon = document.getElementById('video-play-icon');
    const progressBar = document.getElementById('video-progress-fill');
    const timeDisplay = document.getElementById('video-time-display');
    const speedBtn = document.getElementById('video-speed-btn');
    const musicToggleBtn = document.getElementById('music-toggle-btn');
    const scrubberTrack = document.getElementById('scrubber-track');

    // Interactive Sandbox elements
    const sandboxAmt = document.getElementById('sandbox-amt');
    const sandboxAddBtn = document.getElementById('sandbox-add-btn');
    const sandboxTotalVal = document.getElementById('sandbox-total-val');
    const sandboxBarFill = document.getElementById('sandbox-bar-fill');

    let currentChapter = 1;
    let isPlaying = true;
    let playbackSpeed = 1.0;
    let progressPercent = 0;
    let timerInterval = null;
    let typeTimer = null;
    let isMusicEnabled = true;
    const TOTAL_DURATION_SEC = 20; // 20 Seconds total (5 seconds per chapter)

    // ------------------------------------------------------------------ //
    // Web Audio API — Hans Zimmer Cornfield Chase Synthesizer Engine     //
    // ------------------------------------------------------------------ //

    let audioCtx = null;
    let musicPlaying = false;
    let musicInterval = null;
    let organFilter = null;
    let masterGain = null;

    function getAudioContext() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }

    // Cornfield Chase Arpeggios (Am - F - C - G)
    const CHORDS = [
        { name: 'Am', bass: 110.0, notes: [220.0, 329.63, 440.0, 523.25, 659.25, 880.0] },
        { name: 'F',  bass: 87.31, notes: [174.61, 261.63, 349.23, 440.0, 523.25, 698.46] },
        { name: 'C',  bass: 130.81, notes: [261.63, 392.00, 523.25, 659.25, 783.99, 1046.5] },
        { name: 'G',  bass: 98.00, notes: [196.00, 293.66, 392.00, 493.88, 587.33, 783.99] }
    ];

    function playOrganNote(freq, duration, gainVal = 0.08) {
        if (!isMusicEnabled || !musicPlaying) return;
        try {
            const ctx = getAudioContext();
            const now = ctx.currentTime;

            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const noteGain = ctx.createGain();

            osc1.type = 'triangle'; // Warm pipe organ timbre
            osc2.type = 'sine';     // Subdued octave overtone

            osc1.frequency.setValueAtTime(freq, now);
            osc2.frequency.setValueAtTime(freq * 2, now);

            noteGain.gain.setValueAtTime(0.001, now);
            noteGain.gain.exponentialRampToValueAtTime(gainVal, now + 0.05);
            noteGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

            osc1.connect(noteGain);
            osc2.connect(noteGain);
            
            if (organFilter) {
                noteGain.connect(organFilter);
            } else {
                noteGain.connect(ctx.destination);
            }

            osc1.start(now);
            osc2.start(now);
            osc1.stop(now + duration);
            osc2.stop(now + duration);
        } catch (e) {}
    }

    function startCornfieldChaseEngine() {
        if (!isMusicEnabled || musicPlaying) return;
        musicPlaying = true;
        
        try {
            const ctx = getAudioContext();
            const now = ctx.currentTime;

            // Warm organ low-pass filter with gentle crescendo
            organFilter = ctx.createBiquadFilter();
            organFilter.type = 'lowpass';
            organFilter.frequency.setValueAtTime(600, now);
            organFilter.frequency.linearRampToValueAtTime(2000, now + 15);

            masterGain = ctx.createGain();
            masterGain.gain.setValueAtTime(0.2, now);

            organFilter.connect(masterGain);
            masterGain.connect(ctx.destination);

            let noteIdx = 0;
            let chordIdx = 0;
            let tickCount = 0;

            // Slower, majestic tempo (230ms per arpeggio note)
            musicInterval = setInterval(() => {
                if (!musicPlaying || !isMusicEnabled) return;
                
                const currentChord = CHORDS[chordIdx];
                const freq = currentChord.notes[noteIdx % currentChord.notes.length];
                
                // Play sustained warm organ note (0.5s duration)
                playOrganNote(freq, 0.5, 0.07);

                // Warm bass pedal every 6 ticks
                if (noteIdx % 6 === 0) {
                    playOrganNote(currentChord.bass, 1.4, 0.15);
                }

                noteIdx++;
                tickCount++;

                if (tickCount % 12 === 0) {
                    chordIdx = (chordIdx + 1) % CHORDS.length;
                    noteIdx = 0;
                }
            }, 230);

        } catch (e) {}
    }

    function stopCornfieldChaseEngine() {
        musicPlaying = false;
        if (musicInterval) clearInterval(musicInterval);
        if (masterGain && audioCtx) {
            try {
                masterGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
            } catch (e) {}
        }
    }

    // ------------------------------------------------------------------ //
    // Slide 1 Typewriter Simulation                                       //
    // ------------------------------------------------------------------ //

    function playSlide1Animation() {
        if (typeTimer) clearInterval(typeTimer);
        const amtEl = document.querySelector('.animated-type-amount');
        const noteEl = document.querySelector('.animated-type-note');
        const btnEl = document.querySelector('.sim-btn-active');
        if (!amtEl || !noteEl || !btnEl) return;

        const amtText = "₹450";
        const noteText = "Dinner with friends";
        let step = 0;

        amtEl.textContent = "₹";
        noteEl.textContent = "";
        btnEl.textContent = "Adding expense...";
        btnEl.style.opacity = "0.7";

        typeTimer = setInterval(() => {
            step++;
            if (step <= amtText.length) {
                amtEl.textContent = amtText.substring(0, step);
            }
            if (step <= noteText.length) {
                noteEl.textContent = noteText.substring(0, step);
            }
            if (step >= Math.max(amtText.length, noteText.length)) {
                btnEl.textContent = "✓ Added to Spendly";
                btnEl.style.opacity = "1";
                clearInterval(typeTimer);
            }
        }, 90);
    }

    // ------------------------------------------------------------------ //
    // Open & Close Dialog Handlers                                        //
    // ------------------------------------------------------------------ //

    openBtns.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                progressPercent = 0;
                setChapter(1, true);
                modal.showModal();
                startPlayback();
                if (isMusicEnabled) startCornfieldChaseEngine();
            });
        }
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            stopPlayback();
            stopCornfieldChaseEngine();
            modal.close();
        });
    }

    // Light dismiss — close when clicking backdrop outside container
    modal.addEventListener('click', (event) => {
        const rect = modal.getBoundingClientRect();
        const isInDialog = (
            rect.top <= event.clientY &&
            event.clientY <= rect.top + rect.height &&
            rect.left <= event.clientX &&
            event.clientX <= rect.left + rect.width
        );
        if (!isInDialog) {
            stopPlayback();
            stopCornfieldChaseEngine();
            modal.close();
        }
    });

    // ------------------------------------------------------------------ //
    // Chapter Switching                                                  //
    // ------------------------------------------------------------------ //

    function setChapter(chapterNum, setProgress = true) {
        currentChapter = parseInt(chapterNum, 10);
        
        chapterBtns.forEach(b => {
            if (parseInt(b.dataset.chapter, 10) === currentChapter) {
                b.classList.add('active');
            } else {
                b.classList.remove('active');
            }
        });

        scenes.forEach((s, idx) => {
            if (idx + 1 === currentChapter) {
                s.classList.add('active');
            } else {
                s.classList.remove('active');
            }
        });

        if (currentChapter === 1) {
            playSlide1Animation();
        }

        if (setProgress) {
            progressPercent = (currentChapter - 1) * 25;
            updatePlayerUI();
        }
    }

    chapterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            stopPlayback();
            setChapter(btn.dataset.chapter, true);
        });
    });

    // ------------------------------------------------------------------ //
    // Playback & Scrubber Controls                                       //
    // ------------------------------------------------------------------ //

    function updatePlayerUI() {
        if (progressBar) {
            progressBar.style.width = Math.min(100, Math.max(0, progressPercent)) + '%';
        }
        if (timeDisplay) {
            const totalElapsedSec = Math.round((progressPercent / 100) * TOTAL_DURATION_SEC);
            const formattedSec = totalElapsedSec < 10 ? '0' + totalElapsedSec : totalElapsedSec;
            timeDisplay.textContent = `0:${formattedSec} / 0:20`;
        }
    }

    function startPlayback() {
        stopPlayback();
        isPlaying = true;
        if (playIcon) playIcon.textContent = '⏸';
        if (currentChapter === 1) playSlide1Animation();
        if (isMusicEnabled) startCornfieldChaseEngine();

        // Updates smoothly every 100ms
        timerInterval = setInterval(() => {
            if (!isPlaying) return;

            // Increment: 0.5% per 100ms at 1.0x = 100% in 20s
            progressPercent += (0.5 * playbackSpeed);
            
            if (progressPercent >= 100) {
                progressPercent = 0;
            }

            // Sync current active chapter with timeline progress
            let targetChapter = 1;
            if (progressPercent > 75) targetChapter = 4;
            else if (progressPercent > 50) targetChapter = 3;
            else if (progressPercent > 25) targetChapter = 2;

            if (targetChapter !== currentChapter) {
                setChapter(targetChapter, false);
            }

            updatePlayerUI();
        }, 100);
    }

    function stopPlayback() {
        if (timerInterval) clearInterval(timerInterval);
        if (typeTimer) clearInterval(typeTimer);
        stopCornfieldChaseEngine();
        isPlaying = false;
        if (playIcon) playIcon.textContent = '▶';
    }

    if (playBtn) {
        playBtn.addEventListener('click', () => {
            if (isPlaying) {
                stopPlayback();
            } else {
                startPlayback();
            }
        });
    }

    if (speedBtn) {
        speedBtn.textContent = playbackSpeed + 'x';
        speedBtn.addEventListener('click', () => {
            if (playbackSpeed === 0.5) {
                playbackSpeed = 1.0;
            } else if (playbackSpeed === 1.0) {
                playbackSpeed = 1.5;
            } else {
                playbackSpeed = 0.5;
            }
            speedBtn.textContent = playbackSpeed + 'x';
        });
    }

    if (musicToggleBtn) {
        musicToggleBtn.addEventListener('click', () => {
            isMusicEnabled = !isMusicEnabled;
            if (isMusicEnabled) {
                musicToggleBtn.classList.add('active');
                musicToggleBtn.textContent = '🎵 Cornfield Chase: ON';
                if (isPlaying) startCornfieldChaseEngine();
            } else {
                musicToggleBtn.classList.remove('active');
                musicToggleBtn.textContent = '🎵 Cornfield Chase: OFF';
                stopCornfieldChaseEngine();
            }
        });
    }

    if (scrubberTrack) {
        scrubberTrack.addEventListener('click', (e) => {
            const rect = scrubberTrack.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            progressPercent = Math.min(100, Math.max(0, (clickX / rect.width) * 100));
            
            let targetChapter = 1;
            if (progressPercent > 75) targetChapter = 4;
            else if (progressPercent > 50) targetChapter = 3;
            else if (progressPercent > 25) targetChapter = 2;

            setChapter(targetChapter, false);
            updatePlayerUI();
        });
    }

    // ------------------------------------------------------------------ //
    // Interactive Sandbox logic inside Modal                             //
    // ------------------------------------------------------------------ //

    let currentTotal = 12450;
    if (sandboxAmt) {
        sandboxAmt.addEventListener('focus', () => stopPlayback());
    }

    if (sandboxAddBtn && sandboxAmt) {
        sandboxAddBtn.addEventListener('click', () => {
            stopPlayback();
            const addedAmt = parseFloat(sandboxAmt.value) || 0;
            currentTotal += addedAmt;
            if (sandboxTotalVal) {
                sandboxTotalVal.textContent = '₹' + currentTotal.toLocaleString('en-IN');
            }
            if (sandboxBarFill) {
                const fillPercent = Math.min(100, (currentTotal / 20000) * 100);
                sandboxBarFill.style.width = fillPercent + '%';
            }
        });
    }
});

/* ------------------------------------------------------------------ */
/* Interactive SVG Pie & Spidergraph Radar Chart Renderers            */
/* ------------------------------------------------------------------ */

document.addEventListener('DOMContentLoaded', () => {
    
    // -------------------------------------------------------------- //
    // 1. Render Category SVG Pie / Donut Chart                        //
    // -------------------------------------------------------------- //
    
    const pieSvg = document.getElementById('category-pie-svg');
    const catData = window.SPENDLY_CATEGORY_DATA || [];

    if (pieSvg && catData.length > 0) {
        const cx = 100, cy = 100, rOuter = 82, rInner = 52;
        let cumulativeAngle = -Math.PI / 2; // Start from top 12 o'clock

        const catColors = {
            'food': '#e67e22',
            'bills': '#e74c3c',
            'transport': '#3498db',
            'health': '#2ecc71',
            'shopping': '#9b59b6',
            'entertainment': '#f1c40f',
            'other': '#7f8c8d'
        };

        const grandTotal = catData.reduce((acc, c) => acc + c.total, 0);

        catData.forEach((cat) => {
            const portion = grandTotal > 0 ? (cat.total / grandTotal) : 0;
            const sliceAngle = portion * 2 * Math.PI;

            if (sliceAngle <= 0) return;

            const startAngle = cumulativeAngle;
            const endAngle = cumulativeAngle + sliceAngle;
            cumulativeAngle = endAngle;

            // Outer arc coordinates
            const x1 = cx + rOuter * Math.cos(startAngle);
            const y1 = cy + rOuter * Math.sin(startAngle);
            const x2 = cx + rOuter * Math.cos(endAngle);
            const y2 = cy + rOuter * Math.sin(endAngle);

            // Inner hole coordinates
            const x3 = cx + rInner * Math.cos(endAngle);
            const y3 = cy + rInner * Math.sin(endAngle);
            const x4 = cx + rInner * Math.cos(startAngle);
            const y4 = cy + rInner * Math.sin(startAngle);

            const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;
            const color = catColors[cat.category.toLowerCase()] || '#95a5a6';

            // SVG Donut Path
            const pathData = [
                `M ${x1} ${y1}`,
                `A ${rOuter} ${rOuter} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                `L ${x3} ${y3}`,
                `A ${rInner} ${rInner} 0 ${largeArcFlag} 0 ${x4} ${y4}`,
                `Z`
            ].join(' ');

            const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            pathEl.setAttribute('d', pathData);
            pathEl.setAttribute('fill', color);
            pathEl.setAttribute('class', 'pie-slice');
            pathEl.setAttribute('data-category', cat.category);

            // Hover tooltip
            const titleEl = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            titleEl.textContent = `${cat.category}: ₹${cat.total.toLocaleString()} (${cat.percentage}%)`;
            pathEl.appendChild(titleEl);

            pieSvg.appendChild(pathEl);
        });
    }

    // -------------------------------------------------------------- //
    // 2. Render 7-Axis Category Spidergraph (Radar Chart)             //
    // -------------------------------------------------------------- //

    const spiderSvg = document.getElementById('spidergraph-svg');
    const spiderData = window.SPENDLY_SPIDER_DATA || [];

    if (spiderSvg && spiderData.length > 0) {
        const cx = 150, cy = 150, maxR = 95;
        const totalAxes = spiderData.length;
        const angleStep = (2 * Math.PI) / totalAxes;

        // Draw 5 Concentric Polygon Web Grids (20%, 40%, 60%, 80%, 100%)
        const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];
        gridLevels.forEach((level) => {
            const points = [];
            for (let i = 0; i < totalAxes; i++) {
                const angle = i * angleStep - Math.PI / 2;
                const r = maxR * level;
                const x = cx + r * Math.cos(angle);
                const y = cy + r * Math.sin(angle);
                points.push(`${x},${y}`);
            }
            const gridPoly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            gridPoly.setAttribute('points', points.join(' '));
            gridPoly.setAttribute('fill', 'none');
            gridPoly.setAttribute('stroke', level === 1.0 ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.06)');
            gridPoly.setAttribute('stroke-width', '1');
            spiderSvg.appendChild(gridPoly);
        });

        // Draw Radial Axis Lines and Category Labels
        const dataPoints = [];
        spiderData.forEach((node, i) => {
            const angle = i * angleStep - Math.PI / 2;

            // Axis Line
            const ax = cx + maxR * Math.cos(angle);
            const ay = cy + maxR * Math.sin(angle);
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', cx);
            line.setAttribute('y1', cy);
            line.setAttribute('x2', ax);
            line.setAttribute('y2', ay);
            line.setAttribute('stroke', 'rgba(0,0,0,0.08)');
            line.setAttribute('stroke-width', '1');
            spiderSvg.appendChild(line);

            // Calculate Data Point Position (score 0–100)
            const scoreR = maxR * (node.score / 100);
            const dx = cx + scoreR * Math.cos(angle);
            const dy = cy + scoreR * Math.sin(angle);
            dataPoints.push({ x: dx, y: dy, node: node });

            // Category Label Position (placed outside maxR)
            const labelR = maxR + 20;
            const lx = cx + labelR * Math.cos(angle);
            const ly = cy + labelR * Math.sin(angle);

            const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            textEl.setAttribute('x', lx);
            textEl.setAttribute('y', ly);
            textEl.setAttribute('text-anchor', 'middle');
            textEl.setAttribute('dominant-baseline', 'middle');
            textEl.setAttribute('font-size', '10.5');
            textEl.setAttribute('font-weight', '600');
            textEl.setAttribute('fill', 'var(--ink-muted)');
            textEl.textContent = node.category;
            spiderSvg.appendChild(textEl);
        });

        // Draw Filled Radar Polygon Area
        const polygonPoints = dataPoints.map(p => `${p.x},${p.y}`).join(' ');
        const radarPoly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        radarPoly.setAttribute('points', polygonPoints);
        radarPoly.setAttribute('fill', 'rgba(193, 127, 36, 0.25)');
        radarPoly.setAttribute('stroke', 'var(--accent)');
        radarPoly.setAttribute('stroke-width', '2');
        radarPoly.setAttribute('class', 'radar-polygon');
        spiderSvg.appendChild(radarPoly);

        // Draw Data Point Dots & Hover Tooltips
        dataPoints.forEach((p) => {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', p.x);
            circle.setAttribute('cy', p.y);
            circle.setAttribute('r', '4');
            circle.setAttribute('fill', 'var(--accent)');
            circle.setAttribute('stroke', '#ffffff');
            circle.setAttribute('stroke-width', '1.5');
            
            const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            title.textContent = `${p.node.category}: ₹${p.node.amount.toLocaleString()} (Intensity: ${p.node.score}%)`;
            circle.appendChild(title);

            spiderSvg.appendChild(circle);
        });
    }

});
