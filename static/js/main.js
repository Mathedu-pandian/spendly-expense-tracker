// main.js — Interactive Video Modal & Product Walkthrough Logic

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
    const scrubberTrack = document.getElementById('scrubber-track');

    // Interactive Sandbox elements
    const sandboxAmt = document.getElementById('sandbox-amt');
    const sandboxAddBtn = document.getElementById('sandbox-add-btn');
    const sandboxTotalVal = document.getElementById('sandbox-total-val');
    const sandboxBarFill = document.getElementById('sandbox-bar-fill');

    let currentChapter = 1;
    let isPlaying = true;
    let playbackSpeed = 1.0; // Standard 1.0x playback speed
    let progressPercent = 0;
    let timerInterval = null;
    let typeTimer = null;
    const TOTAL_DURATION_SEC = 60; // 1 Minute total walkthrough

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
        }, 120);
    }

    // ------------------------------------------------------------------ //
    // Open & Close Dialog Handlers                                        //
    // ------------------------------------------------------------------ //

    openBtns.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                progressPercent = 0;
                setChapter(1);
                modal.showModal();
                startPlayback();
            });
        }
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            stopPlayback();
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
            stopPlayback(); // Pause auto-advance when user manually clicks
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
            const minutes = Math.floor(totalElapsedSec / 60);
            const seconds = totalElapsedSec % 60;
            const formattedSec = seconds < 10 ? '0' + seconds : seconds;
            timeDisplay.textContent = `${minutes}:${formattedSec} / 1:00`;
        }
    }

    function startPlayback() {
        stopPlayback();
        isPlaying = true;
        if (playIcon) playIcon.textContent = '⏸';
        if (currentChapter === 1) playSlide1Animation();

        // Updates smoothly every 150ms
        timerInterval = setInterval(() => {
            if (!isPlaying) return;

            // Increment: 0.25% per 150ms at 1.0x = 100% in 60s
            progressPercent += (0.25 * playbackSpeed);
            
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
        }, 150);
    }

    function stopPlayback() {
        if (timerInterval) clearInterval(timerInterval);
        if (typeTimer) clearInterval(typeTimer);
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
