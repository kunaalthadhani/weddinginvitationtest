/* =====================================================
   Kunaal & Rachel — Wedding Invitation
   Countdown · Envelope animation · RSVP · Audio
   ===================================================== */

(() => {
  'use strict';

  // ============================================================
  // CONFIG — edit these for a real deployment
  // ============================================================
  const WEDDING_DATE = new Date('2026-12-01T17:30:00+04:00'); // Abu Dhabi local time
  const VENUE = {
    name: 'Emirates Palace',
    address: 'West Corniche Road, Abu Dhabi, UAE',
  };

  // Paste your Google Apps Script Web App URL here once you deploy it.
  // Until then, the form will simulate a successful send.
  const RSVP_ENDPOINT = ''; // e.g. 'https://script.google.com/macros/s/AKfy.../exec'

  // ============================================================
  // 1. VEIL LIFT — reveals the invite sitting beneath it
  // ============================================================
  const veil = document.getElementById('veil');

  const liftVeil = () => {
    if (veil.classList.contains('is-lifted')) return;
    veil.classList.add('is-lifted');

    // Kick the background video on the first user gesture
    // (iOS/Safari often block muted autoplay until interaction).
    const bgVideo = document.getElementById('bg-video');
    if (bgVideo) {
      bgVideo.muted = true;
      const p = bgVideo.play();
      if (p && p.catch) p.catch(() => {/* still blocked — give up silently */});
    }

    // Start music on the first user gesture too.
    tryStartMusic();

    // Trigger the invite cascade ~0.4s into the lift so the names
    // appear to be revealed as the veil rises.
    setTimeout(() => {
      document.querySelectorAll('#screen-invite .fade-in')
        .forEach(el => el.classList.add('is-visible'));
    }, 400);
  };

  veil.addEventListener('click', liftVeil);

  // Try to start the video as soon as the page loads (works on most
  // desktop browsers + Android; iOS may still wait for the tap).
  window.addEventListener('load', () => {
    const bgVideo = document.getElementById('bg-video');
    if (!bgVideo) return;
    bgVideo.muted = true;
    const p = bgVideo.play();
    if (p && p.catch) p.catch(() => {/* will start on veil tap */});
  });

  // ============================================================
  // 2. SMOOTH "View Details" SCROLL
  // ============================================================
  document.querySelectorAll('[data-scroll-to]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.scrollTo);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // ============================================================
  // 3. COUNTDOWN
  // ============================================================
  const $days    = document.getElementById('cd-days');
  const $hours   = document.getElementById('cd-hours');
  const $minutes = document.getElementById('cd-minutes');
  const $seconds = document.getElementById('cd-seconds');

  const $clockHour = document.getElementById('clock-hour');
  const $clockMin  = document.getElementById('clock-min');
  const $clockSec  = document.getElementById('clock-sec');

  const pad = n => String(Math.max(0, n)).padStart(2, '0');

  const tickCountdown = () => {
    const now  = new Date();
    const diff = WEDDING_DATE - now;

    if (diff <= 0) {
      $days.textContent = $hours.textContent = $minutes.textContent = $seconds.textContent = '00';
      return;
    }

    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    $days.textContent    = pad(d);
    $hours.textContent   = pad(h);
    $minutes.textContent = pad(m);
    $seconds.textContent = pad(s);

    // Live clock arms (uses the real current time, decorative)
    const t = new Date();
    const secAng = t.getSeconds() * 6;
    const minAng = t.getMinutes() * 6 + t.getSeconds() * 0.1;
    const hrAng  = (t.getHours() % 12) * 30 + t.getMinutes() * 0.5;
    if ($clockSec)  $clockSec.setAttribute('transform',  `rotate(${secAng} 60 60)`);
    if ($clockMin)  $clockMin.setAttribute('transform',  `rotate(${minAng} 60 60)`);
    if ($clockHour) $clockHour.setAttribute('transform', `rotate(${hrAng}  60 60)`);
  };

  tickCountdown();
  setInterval(tickCountdown, 1000);

  // ============================================================
  // 4. ADD TO CALENDAR (.ics download)
  // ============================================================
  document.getElementById('add-to-cal').addEventListener('click', (e) => {
    e.preventDefault();

    const dt = (d) =>
      d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

    const start = WEDDING_DATE;
    const end   = new Date(WEDDING_DATE.getTime() + 5 * 60 * 60 * 1000); // 5 hours

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//KR-Wedding//EN',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:kr-wedding-${start.getTime()}@local`,
      `DTSTAMP:${dt(new Date())}`,
      `DTSTART:${dt(start)}`,
      `DTEND:${dt(end)}`,
      'SUMMARY:Kunaal & Rachel — Wedding Celebration',
      `LOCATION:${VENUE.name}, ${VENUE.address}`,
      'DESCRIPTION:Join us as we celebrate the wedding of Kunaal & Rachel.',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = 'KunaalAndRachel-Wedding.ics';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  });

  // ============================================================
  // 5. RSVP FORM
  // ============================================================
  const form        = document.getElementById('rsvp-form');
  const submitBtn   = document.getElementById('rsvp-submit');
  const statusEl    = document.getElementById('form-status');
  const guestsField = document.getElementById('guests-field');

  // Show/hide guest count based on attendance
  form.querySelectorAll('input[name="attending"]').forEach(r => {
    r.addEventListener('change', () => {
      guestsField.classList.toggle('is-hidden', r.value === 'No' && r.checked);
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = {
      name:      form.name.value.trim(),
      attending: form.attending.value,
      guests:    form.guests.value || '1',
      message:   form.message.value.trim(),
      timestamp: new Date().toISOString(),
    };

    if (!data.name || !data.attending) {
      statusEl.textContent = 'Please fill in your name and select an option.';
      statusEl.className = 'form-status is-error';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';
    statusEl.textContent = '';
    statusEl.className = 'form-status';

    try {
      if (RSVP_ENDPOINT) {
        await fetch(RSVP_ENDPOINT, {
          method: 'POST',
          mode: 'no-cors', // Apps Script web apps don't return CORS headers
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(data),
        });
      } else {
        // Demo: simulate latency
        await new Promise(r => setTimeout(r, 700));
        console.info('[RSVP demo, no endpoint configured]', data);
      }

      statusEl.textContent = data.attending === 'Yes'
        ? 'Thank you — we cannot wait to celebrate with you ♡'
        : 'Thank you for letting us know — you will be missed.';
      statusEl.className = 'form-status is-success';
      submitBtn.textContent = 'Sent ✓';
      form.querySelectorAll('input, textarea').forEach(el => el.setAttribute('disabled', ''));
    } catch (err) {
      console.error(err);
      statusEl.textContent = 'Something went wrong. Please try again.';
      statusEl.className = 'form-status is-error';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send RSVP';
    }
  });

  // ============================================================
  // 6. BACKGROUND MUSIC
  // ============================================================
  const audio      = document.getElementById('bg-music');
  const audioBtn   = document.getElementById('audio-toggle');
  let musicStarted = false;

  audio.volume = 0.35;

  const tryStartMusic = () => {
    if (musicStarted) return;
    audio.play().then(() => {
      musicStarted = true;
      audioBtn.classList.remove('is-muted');
    }).catch(() => {
      // Autoplay blocked — leave the toggle button visible for manual play.
      audioBtn.classList.add('is-muted');
    });
  };

  audioBtn.addEventListener('click', () => {
    if (audio.paused) {
      audio.play().then(() => {
        musicStarted = true;
        audioBtn.classList.remove('is-muted');
      }).catch(() => {/* file missing */});
    } else {
      audio.pause();
      audioBtn.classList.add('is-muted');
    }
  });

  // Start muted state — user can click toggle to play
  audioBtn.classList.add('is-muted');

  // ============================================================
  // 7. SCROLL-IN ANIMATIONS — staggered, ease-out-expo
  // ============================================================
  // Each section gets its own ordered list of animated children
  // so reveals cascade gracefully when the section enters view.
  const sectionMap = [
    ['#screen-invite',    ['.invite-intro', '.couple', '.invite-sub', '.date-block', '.cta']],
    ['#screen-countdown', ['.section-eyebrow', '.section-title', '.countdown', '.eyebrow--small', '.countdown-poem', '.countdown-divider', '.countdown-blessing']],
    ['#screen-venue',     ['.section-eyebrow', '.section-title', '.venue-card']],
    ['#screen-program',   ['.monogram-mini', '.section-eyebrow', '.section-title', '.program-date', '.program', '.program-note']],
    ['#screen-rsvp',      ['.section-eyebrow', '.section-title', '.rsvp-note', '.rsvp-form']],
    ['.footer',           ['.footer__monogram', '.footer__line']],
  ];

  const STAGGER_MS = 180; // gap between each child arrival
  const tracked = [];

  sectionMap.forEach(([sectionSel, childSelectors]) => {
    const section = document.querySelector(sectionSel);
    if (!section) return;
    childSelectors.forEach((sel, i) => {
      const el = section.querySelector(sel);
      if (!el) return;
      el.classList.add('fade-in');
      el.style.transitionDelay = `${i * STAGGER_MS}ms`;
      tracked.push({ el, section });
    });
  });

  // Reveal the children of a section together as soon as the section
  // enters view — so the stagger plays as one graceful cascade.
  // (screen-invite is excluded: it's already in view under the veil,
  // and its cascade is triggered by liftVeil() instead.)
  const inviteSection = document.getElementById('screen-invite');
  const sectionObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      tracked
        .filter(t => t.section === entry.target)
        .forEach(t => t.el.classList.add('is-visible'));
      sectionObserver.unobserve(entry.target);
    });
  }, { threshold: 0.18 });

  Array.from(new Set(tracked.map(t => t.section)))
    .filter(section => section !== inviteSection)
    .forEach(section => sectionObserver.observe(section));
})();
