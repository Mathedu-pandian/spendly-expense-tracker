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
    let playbackSpeed = 1.0;
    let progressPercent = 25;
    let timerInterval = null;

    // ------------------------------------------------------------------ //
    // Open & Close Dialog Handlers                                        //
    // ------------------------------------------------------------------ //

    openBtns.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
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

    function setChapter(chapterNum) {
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

        // Update progress bar based on chapter
        progressPercent = currentChapter * 25;
        updatePlayerUI();
    }

    chapterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            setChapter(btn.dataset.chapter);
        });
    });

    // ------------------------------------------------------------------ //
    // Playback & Scrubber Controls                                       //
    // ------------------------------------------------------------------ //

    function updatePlayerUI() {
        if (progressBar) {
            progressBar.style.width = progressPercent + '%';
        }
        if (timeDisplay) {
            const currentSec = Math.round((progressPercent / 100) * 60);
            const formattedSec = currentSec < 10 ? '0' + currentSec : currentSec;
            timeDisplay.textContent = `0:${formattedSec} / 1:00`;
        }
    }

    function startPlayback() {
        stopPlayback();
        isPlaying = true;
        if (playIcon) playIcon.textContent = '⏸';

        timerInterval = setInterval(() => {
            if (!isPlaying) return;
            progressPercent += 1 * playbackSpeed;
            if (progressPercent > 100) {
                progressPercent = 0;
            }
            
            // Auto switch chapters as progress advances
            if (progressPercent <= 25 && currentChapter !== 1) setChapter(1);
            else if (progressPercent > 25 && progressPercent <= 50 && currentChapter !== 2) setChapter(2);
            else if (progressPercent > 50 && progressPercent <= 75 && currentChapter !== 3) setChapter(3);
            else if (progressPercent > 75 && currentChapter !== 4) setChapter(4);

            updatePlayerUI();
        }, 300);
    }

    function stopPlayback() {
        if (timerInterval) clearInterval(timerInterval);
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
        speedBtn.addEventListener('click', () => {
            if (playbackSpeed === 1.0) {
                playbackSpeed = 1.5;
                speedBtn.textContent = '1.5x';
            } else if (playbackSpeed === 1.5) {
                playbackSpeed = 2.0;
                speedBtn.textContent = '2.0x';
            } else {
                playbackSpeed = 1.0;
                speedBtn.textContent = '1.0x';
            }
        });
    }

    if (scrubberTrack) {
        scrubberTrack.addEventListener('click', (e) => {
            const rect = scrubberTrack.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            progressPercent = Math.min(100, Math.max(0, (clickX / rect.width) * 100));
            
            if (progressPercent <= 25) setChapter(1);
            else if (progressPercent <= 50) setChapter(2);
            else if (progressPercent <= 75) setChapter(3);
            else setChapter(4);

            updatePlayerUI();
        });
    }

    // ------------------------------------------------------------------ //
    // Interactive Sandbox logic inside Modal                             //
    // ------------------------------------------------------------------ //

    let currentTotal = 12450;
    if (sandboxAddBtn && sandboxAmt) {
        sandboxAddBtn.addEventListener('click', () => {
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
