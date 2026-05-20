/* ==========================================================================
   STATE MANAGEMENT & CONSTANTS
   ========================================================================== */
// Replace this with your actual hosted website URL once deployed (e.g., https://mamidis-wedding-invitation.com)
// If empty, the code will dynamically fallback to the current page address.
const PUBLIC_DEPLOYMENT_URL = "https://sangeethsagar.github.io/christian-wedding-invite/";

const state = {
    isPlaying: false,
    audioInitialized: false,
    audioContext: null,
    masterGain: null,
    isMuted: false,
    particles: [],
    petals: [],
    doves: [],
    // Audio Node references to keep track of synth sounds
    synthNodes: {
        choirGains: [],
        choirOscs: [],
        currentSeqTimeout: null,
        chordInterval: null,
    }
};

// Target Wedding Date: Saturday, 30th May 2026 at 10:30 AM IST (UTC+5:30)
const weddingDate = new Date("2026-05-30T10:30:00+05:30");

// Mock initial wishes for RSVP list
const defaultWishes = [
    { name: "Pastor David Kumar", wishes: "May the Lord bless your marriage abundantly and guide you in love and faith.", attending: "yes" },
    { name: "Uncle Prasad & Family", wishes: "Wishing China Subba Rao and Soni a glorious life ahead. Sending all our love!", attending: "yes" },
    { name: "Saritha V.", wishes: "Congratulations! So happy for this beautiful union under God's grace.", attending: "yes" }
];

/* ==========================================================================
   PARTICLE & FLOWER PETAL BACKGROUND (CANVAS)
   ========================================================================== */
const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Gold Particle class
class GoldParticle {
    constructor() {
        this.reset();
    }
    reset() {
        this.x = Math.random() * canvas.width;
        this.y = canvas.height + Math.random() * 50;
        this.size = Math.random() * 2 + 1;
        this.speedY = -(Math.random() * 0.5 + 0.15);
        this.speedX = Math.random() * 0.4 - 0.2;
        this.alpha = Math.random() * 0.4 + 0.2;
        this.fadeSpeed = Math.random() * 0.005 + 0.002;
    }
    update() {
        this.y += this.speedY;
        this.x += this.speedX;
        if (this.y < 0 || this.alpha <= 0) {
            this.reset();
        }
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#FCF6BA';
        ctx.fillStyle = '#C5A059';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// Falling Flower Petal class
class FlowerPetal {
    constructor() {
        this.reset();
        this.y = Math.random() * canvas.height; // Spread initially
    }
    reset() {
        this.x = Math.random() * canvas.width;
        this.y = -20;
        this.size = Math.random() * 5 + 4;
        this.speedY = Math.random() * 0.7 + 0.4;
        this.speedX = Math.random() * 0.4 - 0.2;
        this.angle = Math.random() * Math.PI * 2;
        this.spin = Math.random() * 0.015 - 0.007;
        this.alpha = Math.random() * 0.35 + 0.25;
    }
    update() {
        this.y += this.speedY;
        this.x += Math.random() * 0.5 - 0.25 + this.speedX;
        this.angle += this.spin;
        if (this.y > canvas.height) {
            this.reset();
        }
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = '#FAF0E6'; // Ivory petal
        ctx.strokeStyle = '#EBDDC6';
        ctx.lineWidth = 0.5;
        
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(this.size, -this.size / 2, this.size, 0);
        ctx.quadraticCurveTo(this.size / 2, this.size, 0, 0);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
}

// Initialize particles
for (let i = 0; i < 60; i++) {
    state.particles.push(new GoldParticle());
}
for (let i = 0; i < 15; i++) {
    state.petals.push(new FlowerPetal());
}

function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    state.particles.forEach(p => {
        p.update();
        p.draw();
    });
    state.petals.forEach(pt => {
        pt.update();
        pt.draw();
    });
    requestAnimationFrame(animateParticles);
}
animateParticles();

/* ==========================================================================
   WEB AUDIO API SYNTHESIZER (MUSIC & BELLS)
   ========================================================================== */
function initAudio() {
    if (state.audioInitialized) return;
    
    // Create Audio Context
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    state.audioContext = new AudioContextClass();
    
    // Setup Master volume node
    state.masterGain = state.audioContext.createGain();
    state.masterGain.gain.setValueAtTime(0.30, state.audioContext.currentTime); // Comfortable default volume
    state.masterGain.connect(state.audioContext.destination);
    
    state.audioInitialized = true;
}

// FM Bell Strike Synthesis
function playChurchBell(frequency, time, duration = 6.0) {
    if (!state.audioInitialized) return;
    const ctx = state.audioContext;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const modulatorGain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(frequency, time);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(frequency * 2.4, time);

    modulatorGain.gain.setValueAtTime(frequency * 0.8, time);
    modulatorGain.gain.exponentialRampToValueAtTime(0.01, time + duration);

    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(0.12, time + 0.05); // sharp bell strike
    gainNode.gain.exponentialRampToValueAtTime(0.0001, time + duration); // decay

    osc2.connect(modulatorGain);
    modulatorGain.connect(osc1.frequency);
    
    osc1.connect(gainNode);
    gainNode.connect(state.masterGain);

    osc1.start(time);
    osc2.start(time);
    
    osc1.stop(time + duration);
    osc2.stop(time + duration);
}

// Gentle Choir Ambient Pad
function startChoirPad() {
    if (!state.audioInitialized) return;
    const ctx = state.audioContext;
    const now = ctx.currentTime;
    
    const frequencies = [110, 165, 220, 330]; // A2, E3, A3, E4 chord root
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, now);
    filter.Q.setValueAtTime(2.5, now);
    filter.connect(state.masterGain);

    frequencies.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        
        osc.type = index % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq + (Math.random() * 0.6 - 0.3), now); // Subtle detune
        
        oscGain.gain.setValueAtTime(0, now);
        oscGain.gain.linearRampToValueAtTime(0.025, now + 3);
        
        // Modulate volume dynamically to simulate organic breathing / chorus texture
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.value = 0.12 + (index * 0.02); // slow modulation
        lfoGain.gain.value = 0.012;
        
        lfo.connect(lfoGain);
        lfoGain.connect(oscGain.gain);
        
        osc.connect(oscGain);
        oscGain.connect(filter);
        
        lfo.start(now);
        osc.start(now);
        
        state.synthNodes.choirOscs.push(osc);
        state.synthNodes.choirOscs.push(lfo);
        state.synthNodes.choirGains.push(oscGain);
    });
}

// Synthesize Piano note strike
function playPianoNote(noteFreq, time, duration = 2.5) {
    if (!state.audioInitialized) return;
    const ctx = state.audioContext;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const pianoGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(noteFreq, time);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(noteFreq * 2, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, time);
    filter.frequency.exponentialRampToValueAtTime(140, time + duration);

    pianoGain.gain.setValueAtTime(0, time);
    pianoGain.gain.linearRampToValueAtTime(0.07, time + 0.01); // sharp attack
    pianoGain.gain.exponentialRampToValueAtTime(0.0001, time + duration); // decay

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(pianoGain);
    pianoGain.connect(state.masterGain);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + duration);
    osc2.stop(time + duration);
}

// Synthesize Violin/Strings note
function playViolinNote(noteFreq, time, duration = 3.5) {
    if (!state.audioInitialized) return;
    const ctx = state.audioContext;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(noteFreq, time);

    // Apply vibrato
    const vibrato = ctx.createOscillator();
    const vibratoGain = ctx.createGain();
    vibrato.frequency.value = 5.2; // 5.2 Hz vibrato
    vibratoGain.gain.value = noteFreq * 0.006;

    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(220, time);
    filter.frequency.linearRampToValueAtTime(500, time + duration * 0.35);
    filter.frequency.linearRampToValueAtTime(200, time + duration);

    // Soft attack, swell, and fade out
    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(0.022, time + 0.7);
    gainNode.gain.linearRampToValueAtTime(0.018, time + duration - 0.7);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(state.masterGain);

    vibrato.start(time);
    osc.start(time);
    
    vibrato.stop(time + duration);
    osc.stop(time + duration);
}

// Progressions in F-Major / D-Minor
const songChords = [
    { root: 174.61, triad: [220.00, 261.63, 349.23], melody: [440.00, 523.25, 440.00, 349.23] }, // F-Major
    { root: 130.81, triad: [196.00, 261.63, 329.63], melody: [392.00, 523.25, 392.00, 329.63] }, // C-Major
    { root: 146.83, triad: [174.61, 220.00, 293.66], melody: [349.23, 440.00, 349.23, 293.66] }, // D-Minor
    { root: 116.54, triad: [174.61, 233.08, 293.66], melody: [349.23, 466.16, 349.23, 293.66] }  // Bb-Major
];

let chordIndex = 0;

function playSequenceStep() {
    if (!state.isPlaying || state.isMuted) return;
    
    const ctx = state.audioContext;
    const now = ctx.currentTime;
    const chord = songChords[chordIndex];
    
    // Play Piano bass (root)
    playPianoNote(chord.root, now, 3.8);
    
    // Play arpeggiated piano triad
    chord.triad.forEach((note, i) => {
        playPianoNote(note, now + (i * 0.25), 3.0);
    });

    // Play soft Violin melody line
    const violinNote = chord.melody[Math.floor(Math.random() * chord.melody.length)];
    playViolinNote(violinNote / 2, now + 0.6, 3.2); // Sits warmer in lower octave

    chordIndex = (chordIndex + 1) % songChords.length;
}

function startMusicProgression() {
    if (state.synthNodes.chordInterval) {
        clearInterval(state.synthNodes.chordInterval);
    }
    playSequenceStep(); // Trigger first step
    state.synthNodes.chordInterval = setInterval(playSequenceStep, 4000); // Step every 4 seconds
}

function playOpeningBellsSequence() {
    const ctx = state.audioContext;
    const now = ctx.currentTime;
    
    // Opening chime chimes
    playChurchBell(180, now, 6.0);       // Bell 1
    playChurchBell(220, now + 1.6, 5.0); // Bell 2
    playChurchBell(180, now + 3.2, 6.0); // Bell 3
}

function startAllSynthAudio() {
    initAudio();
    if (state.audioContext.state === 'suspended') {
        state.audioContext.resume();
    }
    
    stopAllSynthAudio(false);
    
    // Start ambient background
    startChoirPad();
    
    // Play opening chime
    playOpeningBellsSequence();
    
    // Start main piano progression loop after bells settle
    state.synthNodes.currentSeqTimeout = setTimeout(() => {
        startMusicProgression();
    }, 4500);
}

function stopAllSynthAudio(fullReset = true) {
    if (state.synthNodes.chordInterval) {
        clearInterval(state.synthNodes.chordInterval);
        state.synthNodes.chordInterval = null;
    }
    if (state.synthNodes.currentSeqTimeout) {
        clearTimeout(state.synthNodes.currentSeqTimeout);
        state.synthNodes.currentSeqTimeout = null;
    }
    
    // Fade out active choir oscillators
    state.synthNodes.choirGains.forEach(gainNode => {
        if (state.audioContext) {
            try {
                gainNode.gain.cancelScheduledValues(state.audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(0, state.audioContext.currentTime + 1.0);
            } catch (e) {}
        }
    });

    setTimeout(() => {
        state.synthNodes.choirOscs.forEach(osc => {
            try { osc.stop(); } catch(e) {}
        });
        if (fullReset) {
            state.synthNodes.choirOscs = [];
            state.synthNodes.choirGains = [];
        }
    }, 1200);
}

/* ==========================================================================
   DOVES SYSTEM (SVG SPANNING AND FLIGHT ANIMATION)
   ========================================================================== */
function spawnDove() {
    const container = document.getElementById('dovesContainer');
    if (!container) return;

    const doveEl = document.createElement('div');
    doveEl.className = 'flying-dove';
    
    const startY = Math.random() * (container.offsetHeight * 0.45) + 30; // top half of phone mockup
    const startX = -40;
    const duration = Math.random() * 5 + 6; // 6-11 seconds to cross mockup width
    const scale = Math.random() * 0.35 + 0.45;
    
    doveEl.style.left = startX + 'px';
    doveEl.style.top = startY + 'px';
    doveEl.style.transform = `scale(${scale})`;

    // Inline Dove SVG structure with flapping wings
    doveEl.innerHTML = `
        <svg class="dove-svg" viewBox="0 0 40 40">
            <!-- Left Wing -->
            <path class="dove-wing-left" d="M20,20 C18,8 10,6 5,10 C10,15 15,18 20,20 Z" fill="#FFF"/>
            <!-- Right Wing -->
            <path class="dove-wing-right" d="M20,20 C22,8 30,6 35,10 C30,15 25,18 20,20 Z" fill="#FFF"/>
            <!-- Body -->
            <path d="M12,20 C12,16 28,16 28,20 C28,24 23,26 20,27 C17,26 12,24 12,20 Z" fill="#FFFDF8"/>
            <!-- Tail -->
            <path d="M12,20 L4,23 L6,20 L4,17 Z" fill="#FFF"/>
            <!-- Head & Beak -->
            <circle cx="27" cy="19" r="2.2" fill="#FFFDF8"/>
            <polygon points="29,18 32,19 29,20" fill="#C5A059"/>
        </svg>
    `;
    
    container.appendChild(doveEl);
    
    // Wave flight logic
    let currentX = startX;
    const amplitude = Math.random() * 20 + 8;
    const frequency = Math.random() * 0.015 + 0.005;
    const speed = (container.offsetWidth + 60) / (duration * 60); // px per frame
    
    function frame() {
        if (!state.isPlaying) {
            requestAnimationFrame(frame);
            return;
        }
        
        currentX += speed;
        const waveY = startY + Math.sin(currentX * frequency) * amplitude;
        
        doveEl.style.left = currentX + 'px';
        doveEl.style.top = waveY + 'px';
        
        if (currentX < container.offsetWidth + 40) {
            requestAnimationFrame(frame);
        } else {
            doveEl.remove();
        }
    }
    
    requestAnimationFrame(frame);
}

// Periodically release doves while playing
let doveTimer = null;
function startDoveSpawner() {
    if (doveTimer) clearInterval(doveTimer);
    doveTimer = setInterval(() => {
        if (state.isPlaying && !state.isMuted) {
            spawnDove();
        }
    }, 18000);
}

/* ==========================================================================
   SCROLL REVEAL (INTERSECTION OBSERVER)
   ========================================================================== */
function setupScrollReveal() {
    const reveals = document.querySelectorAll('.reveal');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                
                // Extra visual rewards: spawn a dove when couple section or footer enters view
                if (entry.target.classList.contains('couple-section')) {
                    setTimeout(spawnDove, 600);
                }
                if (entry.target.classList.contains('footer-section')) {
                    setTimeout(spawnDove, 300);
                }
            }
        });
    }, {
        threshold: 0.12, // Trigger when 12% of card is visible
        root: document.getElementById('mainScrollContainer') // Scroll inside mockup chassis
    });
    
    reveals.forEach(el => observer.observe(el));
}

/* ==========================================================================
   COUNTDOWN TIMER
   ========================================================================== */
function initCountdown() {
    const daysEl = document.getElementById('days');
    const hoursEl = document.getElementById('hours');
    const minsEl = document.getElementById('minutes');
    const secsEl = document.getElementById('seconds');
    
    function update() {
        const now = new Date();
        const difference = weddingDate - now;
        
        if (difference <= 0) {
            daysEl.textContent = '00';
            hoursEl.textContent = '00';
            minsEl.textContent = '00';
            secsEl.textContent = '00';
            return;
        }
        
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        
        daysEl.textContent = String(days).padStart(2, '0');
        hoursEl.textContent = String(hours).padStart(2, '0');
        minsEl.textContent = String(minutes).padStart(2, '0');
        secsEl.textContent = String(seconds).padStart(2, '0');
    }
    
    update();
    setInterval(update, 1000);
}

/* ==========================================================================
   EVENT HANDLERS & NAVIGATION ACTIONS
   ========================================================================== */

// Open Invitation Cover Click
document.getElementById('playBtn').addEventListener('click', () => {
    const cover = document.getElementById('coverScreen');
    cover.classList.add('slide-up');
    
    setTimeout(() => {
        cover.classList.add('hidden');
        document.getElementById('mainScrollContainer').classList.remove('hidden');
        document.getElementById('audioPanel').classList.remove('hidden');
        
        state.isPlaying = true;
        
        // Start Sound and interactive components
        startAllSynthAudio();
        setupScrollReveal();
        initCountdown();
        
        // Spawn opening doves
        setTimeout(spawnDove, 1200);
        setTimeout(spawnDove, 2800);
        startDoveSpawner();
    }, 1100);
});

// Sound Toggle (Mute/Unmute)
const muteBtn = document.getElementById('muteBtn');
const audioPanel = document.getElementById('audioPanel');
const speakerOn = document.getElementById('speakerOn');
const speakerOff = document.getElementById('speakerOff');

muteBtn.addEventListener('click', () => {
    state.isMuted = !state.isMuted;
    
    if (state.isMuted) {
        speakerOn.classList.add('hidden');
        speakerOff.classList.remove('hidden');
        audioPanel.classList.add('muted');
        
        if (state.masterGain && state.audioContext) {
            state.masterGain.gain.setValueAtTime(0, state.audioContext.currentTime);
        }
        stopAllSynthAudio(false);
    } else {
        speakerOn.classList.remove('hidden');
        speakerOff.classList.add('hidden');
        audioPanel.classList.remove('muted');
        
        if (state.masterGain && state.audioContext) {
            state.masterGain.gain.setValueAtTime(0.30, state.audioContext.currentTime);
        }
        if (state.isPlaying && state.audioInitialized) {
            startMusicProgression();
        }
    }
});

/* ==========================================================================
   CALENDAR ICS DOWNLOAD ENGINE
   ========================================================================== */
function downloadICS(title, description, location, startIso, endIso, filename) {
    const icsContent = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Wedding Invite//NONSGML v1.0//EN",
        "BEGIN:VEVENT",
        `DTSTART:${startIso}`,
        `DTEND:${endIso}`,
        `SUMMARY:${title}`,
        `DESCRIPTION:${description}`,
        `LOCATION:${location}`,
        "END:VEVENT",
        "END:VCALENDAR"
    ].join("\r\n");
    
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Event 1: Holy Matrimony ICS
document.getElementById('addMatrimonyCalendar').addEventListener('click', () => {
    // Saturday, 30th May 2026, 10:30 AM IST (UTC+5:30) -> 2026-05-30T10:30:00 -> 2026-05-30T05:00:00Z UTC
    // Duration: 2 Hours -> 12:30 PM IST -> 2026-05-30T07:00:00Z UTC
    downloadICS(
        "Holy Matrimony: China Subba Rao & Soni",
        "Join us to celebrate the Holy Matrimony of China Subba Rao & Soni under God's grace.",
        "Christ Roopanthara Lutheran Church, Kondapatur, Kakumanu Mandal, Guntur District, Andhra Pradesh",
        "20260530T050000Z",
        "20260530T070000Z",
        "Holy-Matrimony-SubbaRao-Soni.ics"
    );
});

// Event 2: Lunch Reception ICS
document.getElementById('addLunchCalendar').addEventListener('click', () => {
    // Saturday, 30th May 2026, 12:30 PM IST (UTC+5:30) -> 2026-05-30T12:30:00 -> 2026-05-30T07:00:00Z UTC
    // Duration: 3 Hours -> 03:30 PM IST -> 2026-05-30T10:00:00Z UTC
    downloadICS(
        "Lunch Reception: China Subba Rao & Soni",
        "Join us for the Lunch Reception celebrating the marriage of China Subba Rao & Soni.",
        "Mamidi Family Residence, Kondapatur Village, Kakumanu Mandal, Guntur District, Andhra Pradesh",
        "20260530T070000Z",
        "20260530T100000Z",
        "Lunch-Reception-SubbaRao-Soni.ics"
    );
});

/* ==========================================================================
   RSVP & WISHES (LOCAL STORAGE DATABASE)
   ========================================================================== */
const rsvpForm = document.getElementById('rsvpForm');
const wishesScroller = document.getElementById('wishesScroller');
const rsvpSuccessMsg = document.getElementById('rsvpSuccessMsg');
const resetRsvpBtn = document.getElementById('resetRsvpBtn');
const guestCountSelect = document.getElementById('guestCount');
const guestCountGroup = document.getElementById('guestCountGroup');

// Hide guest count input if declining
document.getElementsByName('attending').forEach(radio => {
    radio.addEventListener('change', (e) => {
        if (e.target.value === 'no') {
            guestCountGroup.style.display = 'none';
        } else {
            guestCountGroup.style.display = 'block';
        }
    });
});

function loadWishes() {
    let savedWishes = localStorage.getItem('weddingWishes');
    if (!savedWishes) {
        savedWishes = JSON.stringify(defaultWishes);
        localStorage.setItem('weddingWishes', savedWishes);
    }
    
    const wishesArray = JSON.parse(savedWishes);
    wishesScroller.innerHTML = '';
    
    wishesArray.forEach(item => {
        const div = document.createElement('div');
        div.className = 'wish-item';
        
        const attendingText = item.attending === 'yes' ? '✓ Attending' : 'Decline';
        div.innerHTML = `
            <div class="wish-header">
                <span class="wish-name">${escapeHTML(item.name)}</span>
                <span class="wish-attending">${attendingText}</span>
            </div>
            <p class="wish-text">${escapeHTML(item.wishes || 'Sent warm blessings.')}</p>
        `;
        wishesScroller.appendChild(div);
    });
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

// RSVP Submit
rsvpForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const name = document.getElementById('guestName').value.trim();
    const wishes = document.getElementById('wishes').value.trim();
    const attending = document.querySelector('input[name="attending"]:checked').value;
    const guestCount = attending === 'yes' ? guestCountSelect.value : '0';
    
    if (!name) return;
    
    const savedWishes = localStorage.getItem('weddingWishes');
    const wishesArray = savedWishes ? JSON.parse(savedWishes) : [];
    
    wishesArray.unshift({ name, wishes, attending, guestCount });
    localStorage.setItem('weddingWishes', JSON.stringify(wishesArray));
    
    // Toggle Success State
    rsvpForm.classList.add('hidden');
    rsvpSuccessMsg.classList.remove('hidden');
    
    loadWishes();
});

// Reset RSVP form for multiple inputs
resetRsvpBtn.addEventListener('click', () => {
    rsvpSuccessMsg.classList.add('hidden');
    rsvpForm.classList.remove('hidden');
    
    document.getElementById('guestName').value = '';
    document.getElementById('wishes').value = '';
    document.querySelector('input[name="attending"][value="yes"]').checked = true;
    guestCountSelect.value = '2';
    guestCountGroup.style.display = 'block';
});

// Initialize Guest Wishes
loadWishes();

/* ==========================================================================
   WHATSAPP SHARE INVITATION
   ========================================================================== */
document.getElementById('whatsappShareBtn').addEventListener('click', () => {
    const groomName = "China Subba Rao";
    const brideName = "Soni";
    const date = "Saturday, 30th May 2026";
    const time = "10:30 A.M";
    const location = "Lutheran Church(Kondapaturu), Kondapaturu, Andhra Pradesh";
    
    // Use public hosted URL if configured; fallback to browser URL for local testing
    let shareUrl = PUBLIC_DEPLOYMENT_URL;
    if (!shareUrl || shareUrl.trim() === "") {
        shareUrl = window.location.href;
    }
    
    // If testing locally (localhost), check if we can fall back to the Wi-Fi IP (192.168.1.4) 
    // so it can be previewed on mobile devices on the same local network.
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        shareUrl = PUBLIC_DEPLOYMENT_URL || `http://192.168.1.4:8085/`;
    }
    
    if (window.location.protocol === 'file:') {
        shareUrl = PUBLIC_DEPLOYMENT_URL || 'https://mamidis-wedding-invitation.com';
    }
    
    // Construct beautiful message with formatting
    const textMessage = `🕊️ *Mamidi's Wedding Invitation* 🕊️\n\n` +
        `"Therefore what God has joined together, let no one separate." — Mark 10:9\n\n` +
        `We solicit your gracious presence & blessings on the auspicious occasion of the Holy Matrimony of:\n\n` +
        `🤵 *${groomName}*\n` +
        `   with\n` +
        `👰 *${brideName}*\n\n` +
        `🗓️ *Date:* ${date}\n` +
        `⏰ *Time:* ${time}\n` +
        `⛪ *Venue:* ${location}\n\n` +
        `Please open our digital invitation to view details, hear music, and RSVP:\n` +
        `🔗 ${shareUrl}`;

    const encodedMessage = encodeURIComponent(textMessage);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
});
