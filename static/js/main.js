// main.js — Interactive Video Modal, Sound Effects & Hans Zimmer Cornfield Chase Audio Engine

document.addEventListener('DOMContentLoaded', function () {
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
    let isMuted = false;
    let isMusicEnabled = true;
    const TOTAL_DURATION_SEC = 20; // 20 Seconds total (5 seconds per chapter)

    // ------------------------------------------------------------------ //
    // Web Audio API — Real-time Sound Effects & Cornfield Chase Engine   //
    // ------------------------------------------------------------------ //

    let audioCtx = null;

    function getAudioContext() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }

    // Metallic Coin Clink Sound Effect
    function playCoinSound() {
        if (isMuted) return;
        try {
            const ctx = getAudioContext();
            const now = ctx.currentTime;

            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();

            osc1.type = 'sine';
            osc2.type = 'sine';

            osc1.frequency.setValueAtTime(1600, now);
            osc1.frequency.exponentialRampToValueAtTime(3400, now + 0.06);

            osc2.frequency.setValueAtTime(2400, now);
            osc2.frequency.exponentialRampToValueAtTime(4800, now + 0.06);

            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);

            osc1.start(now);
            osc2.start(now);
            osc1.stop(now + 0.2);
            osc2.stop(now + 0.2);
        } catch (e) {}
    }

    // Classic Cash Register Ka-Ching Sound Effect
    function playCashRegisterSound() {
        if (isMuted) return;
        try {
            const ctx = getAudioContext();
            const now = ctx.currentTime;

            const clickOsc = ctx.createOscillator();
            const clickGain = ctx.createGain();
            clickOsc.type = 'square';
            clickOsc.frequency.setValueAtTime(280, now);
            clickGain.gain.setValueAtTime(0.2, now);
            clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
            clickOsc.connect(clickGain);
            clickGain.connect(ctx.destination);
            clickOsc.start(now);
            clickOsc.stop(now + 0.035);

            const chime1 = ctx.createOscillator();
            const chime2 = ctx.createOscillator();
            const chimeGain = ctx.createGain();

            chime1.type = 'sine';
            chime2.type = 'sine';

            chime1.frequency.setValueAtTime(1800, now + 0.035);
            chime2.frequency.setValueAtTime(2700, now + 0.035);

            chimeGain.gain.setValueAtTime(0, now);
            chimeGain.gain.setValueAtTime(0.3, now + 0.035);
            chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

            chime1.connect(chimeGain);
            chime2.connect(chimeGain);
            chimeGain.connect(ctx.destination);

            chime1.start(now + 0.035);
            chime2.start(now + 0.035);
            chime1.stop(now + 0.4);
            chime2.stop(now + 0.4);
        } catch (e) {}
    }

    // ------------------------------------------------------------------ //
    // Hans Zimmer — Cornfield Chase Synthesizer Engine                   //
    // ------------------------------------------------------------------ //

    let musicPlaying = false;
    let musicInterval = null;
    let organFilter = null;
    let masterGain = null;

    // Cornfield Chase Arpeggios (Am - F - C - G)
    const CHORDS = [
        { name: 'Am', bass: 110.0, notes: [220.0, 329.63, 440.0, 523.25, 659.25, 880.0, 1046.5] },
        { name: 'F',  bass: 87.31, notes: [174.61, 261.63, 349.23, 440.0, 523.25, 698.46, 880.0] },
        { name: 'C',  bass: 130.81, notes: [261.63, 392.00, 523.25, 659.25, 783.99, 1046.5, 1318.5] },
        { name: 'G',  bass: 98.00, notes: [196.00, 293.66, 392.00, 493.88, 587.33, 783.99, 987.77] }
    ];

    function playOrganNote(freq, duration, gainVal = 0.1) {
        if (!isMusicEnabled || !musicPlaying) return;
        try {
            const ctx = getAudioContext();
            const now = ctx.currentTime;

            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const noteGain = ctx.createGain();

            osc1.type = 'triangle'; // Organ pipe warmth
            osc2.type = 'sine';     // Octave overtone

            osc1.frequency.setValueAtTime(freq, now);
            osc2.frequency.setValueAtTime(freq * 2, now);

            noteGain.gain.setValueAtTime(gainVal, now);
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

            organFilter = ctx.createBiquadFilter();
            organFilter.type = 'lowpass';
            organFilter.frequency.setValueAtTime(700, now);
            organFilter.frequency.linearRampToValueAtTime(2800, now + 15);

            masterGain = ctx.createGain();
            masterGain.gain.setValueAtTime(0.2, now);

            organFilter.connect(masterGain);
            masterGain.connect(ctx.destination);

            let noteIdx = 0;
            let chordIdx = 0;
            let tickCount = 0;

            // Hans Zimmer rapid 12/8 organ tempo (110ms per note)
            musicInterval = setInterval(() => {
                if (!musicPlaying || !isMusicEnabled) return;
                
                const currentChord = CHORDS[chordIdx];
                const freq = currentChord.notes[noteIdx % currentChord.notes.length];
                
                playOrganNote(freq, 0.3, 0.08);

                // Sub-bass organ pedal every 8 ticks
                if (noteIdx % 8 === 0) {
                    playOrganNote(currentChord.bass, 1.0, 0.18);
                }

                noteIdx++;
                tickCount++;

                if (tickCount % 16 === 0) {
                    chordIdx = (chordIdx + 1) % CHORDS.length;
                    noteIdx = 0;
                }
            }, 110);

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
                setChapter(1, true, false);
                modal.showModal();
                startPlayback();
                if (isMusicEnabled) startCornfieldChaseEngine();
                playCoinSound();
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
    // Chapter Switching & Sound Triggers                                 //
    // ------------------------------------------------------------------ //

    function setChapter(chapterNum, setProgress = true, playSound = true) {
        const prevChapter = currentChapter;
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

        if (playSound && prevChapter !== currentChapter) {
            if (currentChapter === 2 || currentChapter === 4) {
                playCashRegisterSound();
            } else {
                playCoinSound();
            }
        }

        if (setProgress) {
            progressPercent = (currentChapter - 1) * 25;
            updatePlayerUI();
        }
    }

    chapterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            stopPlayback();
            setChapter(btn.dataset.chapter, true, true);
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
                setChapter(targetChapter, false, true);
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

            setChapter(targetChapter, false, true);
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
            playCashRegisterSound();
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
