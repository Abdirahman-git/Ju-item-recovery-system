(function() {
  'use strict';

  // ==========================================
  // PARTICLE BACKGROUND
  // ==========================================
  const canvas = document.getElementById('particles');
  const ctx = canvas.getContext('2d');
  let particles = [];
  let animationId;
  let mouseX = 0, mouseY = 0;

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  class Particle {
    constructor() {
      this.reset();
    }
    reset() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.size = Math.random() * 2 + 0.5;
      this.speedX = (Math.random() - 0.5) * 0.5;
      this.speedY = (Math.random() - 0.5) * 0.5;
      this.opacity = Math.random() * 0.5 + 0.1;
    }
    update() {
      this.x += this.speedX;
      this.y += this.speedY;
      if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
      if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
    }
    draw() {
      const isLight = document.documentElement.classList.contains('light');
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = isLight
        ? 'rgba(16, 185, 129, ' + this.opacity + ')'
        : 'rgba(16, 185, 129, ' + this.opacity + ')';
      ctx.fill();
    }
  }

  function initParticles() {
    particles = [];
    const count = Math.min(Math.floor((canvas.width * canvas.height) / 12000), 120);
    for (let i = 0; i < count; i++) {
      particles.push(new Particle());
    }
  }

  function connectParticles() {
    const maxDist = 150;
    const isLight = document.documentElement.classList.contains('light');
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < maxDist) {
          const opacity = (1 - dist / maxDist) * 0.15;
          ctx.beginPath();
          ctx.strokeStyle = isLight
            ? 'rgba(16, 185, 129, ' + opacity + ')'
            : 'rgba(16, 185, 129, ' + opacity + ')';
          ctx.lineWidth = 0.5;
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }
  }

  function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => { p.update(); p.draw(); });
    connectParticles();
    animationId = requestAnimationFrame(animateParticles);
  }

  resizeCanvas();
  initParticles();
  animateParticles();

  window.addEventListener('resize', () => {
    resizeCanvas();
    initParticles();
  });

  // ==========================================
  // CUSTOM CURSOR (desktop only)
  // ==========================================
  const cursor = document.getElementById('cursor');
  const follower = document.getElementById('cursorFollower');

  if (window.innerWidth > 768) {
    document.addEventListener('mousemove', e => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      cursor.style.left = mouseX + 'px';
      cursor.style.top = mouseY + 'px';
      follower.style.left = mouseX + 'px';
      follower.style.top = mouseY + 'px';
    });

    const hoverTargets = document.querySelectorAll('a, button, .project-card, .skill-card');
    hoverTargets.forEach(el => {
      el.addEventListener('mouseenter', () => follower.classList.add('hovering'));
      el.addEventListener('mouseleave', () => follower.classList.remove('hovering'));
    });
  }

  // ==========================================
  // TYPING EFFECT
  // ==========================================
  const typedEl = document.getElementById('typed');
  const roles = [
    'Software Developer',
    'Web & Mobile Developer',
    'Data Analyst',
    'Machine Learning Enthusiast',
    'Digital Marketer',
    'Computer Science Student',
    'Open Source Contributor'
  ];
  let roleIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  let typeSpeed = 80;

  function typeEffect() {
    const current = roles[roleIndex];
    if (isDeleting) {
      typedEl.textContent = current.substring(0, charIndex - 1);
      charIndex--;
      typeSpeed = 40;
    } else {
      typedEl.textContent = current.substring(0, charIndex + 1);
      charIndex++;
      typeSpeed = 80;
    }

    if (!isDeleting && charIndex === current.length) {
      typeSpeed = 2000;
      isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
      isDeleting = false;
      roleIndex = (roleIndex + 1) % roles.length;
      typeSpeed = 400;
    }

    setTimeout(typeEffect, typeSpeed);
  }
  typeEffect();

  // ==========================================
  // SCROLL ANIMATIONS (Intersection Observer)
  // ==========================================
  const fadeElements = document.querySelectorAll('.fade-in');
  const fadeObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, i * 80);
        fadeObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  fadeElements.forEach(el => fadeObserver.observe(el));

  // Skill bar animation
  const skillFills = document.querySelectorAll('.skill-fill');
  const skillObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const level = entry.target.getAttribute('data-level');
        entry.target.style.width = level + '%';
        skillObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  skillFills.forEach(el => skillObserver.observe(el));

  // ==========================================
  // NAVBAR SCROLL & ACTIVE LINK
  // ==========================================
  const navbar = document.getElementById('navbar');
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('.section, .hero');

  function handleScroll() {
    // Navbar background
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }

    // Active nav link
    let current = '';
    sections.forEach(section => {
      const top = section.offsetTop - 120;
      if (window.scrollY >= top) {
        current = section.getAttribute('id');
      }
    });
    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === '#' + current) {
        link.classList.add('active');
      }
    });
  }

  window.addEventListener('scroll', handleScroll, { passive: true });

  // ==========================================
  // MOBILE NAV
  // ==========================================
  const navToggle = document.getElementById('navToggle');
  const navLinksContainer = document.getElementById('navLinks');

  navToggle.addEventListener('click', () => {
    navToggle.classList.toggle('active');
    navLinksContainer.classList.toggle('open');
  });

  navLinksContainer.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      navToggle.classList.remove('active');
      navLinksContainer.classList.remove('open');
    });
  });

  // ==========================================
  // DARK/LIGHT MODE TOGGLE
  // ==========================================
  const themeToggle = document.getElementById('themeToggle');
  const savedTheme = localStorage.getItem('portfolio-theme');

  if (savedTheme) {
    document.documentElement.className = savedTheme;
  }

  themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.classList.contains('dark');
    if (isDark) {
      document.documentElement.className = 'light';
      localStorage.setItem('portfolio-theme', 'light');
    } else {
      document.documentElement.className = 'dark';
      localStorage.setItem('portfolio-theme', 'dark');
    }
  });

  // ==========================================
  // PROJECT CARD FLIP
  // ==========================================
  document.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('a')) return;
      card.classList.toggle('flipped');
    });
  });

  // ==========================================
  // PROJECT FILTERS
  // ==========================================
  const filterBtns = document.querySelectorAll('.filter-btn');
  const projectCards = document.querySelectorAll('.project-card');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.getAttribute('data-filter');

      projectCards.forEach((card, i) => {
        const tags = card.getAttribute('data-tags') || '';
        const show = filter === 'all' || tags.includes(filter);

        card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        if (show) {
          card.style.display = '';
          setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'scale(1)';
          }, i * 50);
        } else {
          card.style.opacity = '0';
          card.style.transform = 'scale(0.95)';
          setTimeout(() => {
            card.style.display = 'none';
          }, 400);
        }
      });
    });
  });

  // ==========================================
  // CONTACT FORM VALIDATION
  // ==========================================
  const form = document.getElementById('contactForm');
  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const subjectInput = document.getElementById('subject');
  const messageInput = document.getElementById('message');

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function showError(input, errorId, message) {
    const errorEl = document.getElementById(errorId);
    input.style.borderColor = '#ef4444';
    errorEl.textContent = message;
  }

  function clearError(input, errorId) {
    const errorEl = document.getElementById(errorId);
    input.style.borderColor = '';
    errorEl.textContent = '';
  }

  [nameInput, emailInput, subjectInput, messageInput].forEach(input => {
    input.addEventListener('input', () => {
      clearError(input, input.id + 'Error');
    });
  });

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    let valid = true;

    if (!nameInput.value.trim()) {
      showError(nameInput, 'nameError', 'Please enter your name.');
      valid = false;
    }

    if (!emailInput.value.trim()) {
      showError(emailInput, 'emailError', 'Please enter your email.');
      valid = false;
    } else if (!validateEmail(emailInput.value)) {
      showError(emailInput, 'emailError', 'Please enter a valid email address.');
      valid = false;
    }

    if (!subjectInput.value.trim()) {
      showError(subjectInput, 'subjectError', 'Please enter a subject.');
      valid = false;
    }

    if (!messageInput.value.trim()) {
      showError(messageInput, 'messageError', 'Please enter your message.');
      valid = false;
    }

    if (!valid) return;

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    setTimeout(() => {
      submitBtn.classList.remove('loading');
      submitBtn.classList.add('success');
      form.reset();

      setTimeout(() => {
        submitBtn.classList.remove('success');
        submitBtn.disabled = false;
      }, 3000);
    }, 1500);
  });

  // ==========================================
  // RESUME BUTTON
  // ==========================================
  document.getElementById('resumeBtn').addEventListener('click', function(e) {
    e.preventDefault();
    const link = document.createElement('a');
    link.href = '#';
    link.download = 'Abdirahman_Resume.pdf';
    link.click();
    alert('Resume download would start here. Replace this with your actual resume PDF.');
  });

  // ==========================================
  // PROJECTS COMPLETED COUNTER ANIMATION
  // ==========================================
  const statNumbers = document.querySelectorAll('.stat-number');

  function animateCounter(el) {
    const target = parseInt(el.getAttribute('data-target'));
    let current = 0;
    const duration = 2000;
    const stepTime = 30;
    const steps = duration / stepTime;
    const increment = target / steps;

    el.textContent = '0';

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      el.textContent = Math.floor(current);
    }, stepTime);

    el._counterTimer = timer;
  }

  const statObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
      } else {
        if (entry.target._counterTimer) {
          clearInterval(entry.target._counterTimer);
        }
        entry.target.textContent = '0';
      }
    });
  }, { threshold: 0.1 });

  statNumbers.forEach(el => statObserver.observe(el));

  // ==========================================
  // SMOOTH SCROLL FOR ANCHOR LINKS
  // ==========================================
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      e.preventDefault();
      const target = document.querySelector(targetId);
      if (target) {
        const offset = 80;
        const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

})();
