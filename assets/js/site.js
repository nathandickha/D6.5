"use strict";
const header = document.querySelector('.site-header');
const menu = document.querySelector('.menu-btn');
menu?.addEventListener('click', () => header?.classList.toggle('mobile-open'));
document.querySelectorAll('.nav-links a').forEach(a => a.addEventListener('click', () => header?.classList.remove('mobile-open')));
const year = document.querySelector('[data-year]');
if (year)
    year.textContent = String(new Date().getFullYear());
const form = document.querySelector('[data-contact-form]');
form?.addEventListener('submit', e => { e.preventDefault(); const n = document.querySelector('[data-form-notice]'); if (n) {
    n.style.display = 'block';
    n.textContent = 'Thanks — this static demo has validated your enquiry. Connect Formspree, Netlify Forms or your own API before launch.';
} form.reset(); });
