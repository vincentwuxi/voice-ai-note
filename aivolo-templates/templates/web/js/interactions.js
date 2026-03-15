/**
 * Aivolo Design System - Interactions
 * Version: 1.0.0
 */

(function () {
    'use strict';

    // ========================================
    // Accordion Functionality
    // ========================================

    function initAccordions() {
        const accordionHeaders = document.querySelectorAll('.accordion-header');

        accordionHeaders.forEach(header => {
            header.addEventListener('click', function () {
                const expanded = this.getAttribute('aria-expanded') === 'true';
                const content = this.nextElementSibling;

                this.setAttribute('aria-expanded', !expanded);

                if (expanded) {
                    content.setAttribute('hidden', '');
                } else {
                    content.removeAttribute('hidden');
                }
            });

            header.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.click();
                }
            });
        });
    }

    // ========================================
    // Mobile Navigation Toggle
    // ========================================

    function initMobileNav() {
        const navToggle = document.querySelector('.navbar-toggle');
        const navMenu = document.querySelector('.navbar-menu');

        if (navToggle && navMenu) {
            navToggle.addEventListener('click', function () {
                const expanded = this.getAttribute('aria-expanded') === 'true';
                this.setAttribute('aria-expanded', !expanded);
                navMenu.classList.toggle('is-open', !expanded);
            });

            window.addEventListener('resize', function () {
                if (window.innerWidth >= 992) {
                    navMenu.classList.remove('is-open');
                    navToggle.setAttribute('aria-expanded', 'false');
                }
            });
        }
    }

    // ========================================
    // Form Validation
    // ========================================

    function initFormValidation() {
        const forms = document.querySelectorAll('form');

        forms.forEach(form => {
            form.addEventListener('submit', function (e) {
                e.preventDefault();

                let isValid = true;
                const inputs = form.querySelectorAll('input[required], textarea[required]');

                inputs.forEach(input => {
                    input.classList.remove('error');
                    const existingError = input.parentElement.querySelector('.form-error');
                    if (existingError) {
                        existingError.remove();
                    }

                    if (!input.value.trim()) {
                        isValid = false;
                        input.classList.add('error');

                        const errorMsg = document.createElement('span');
                        errorMsg.className = 'form-error';
                        errorMsg.textContent = 'This field is required';
                        errorMsg.setAttribute('role', 'alert');
                        input.parentElement.appendChild(errorMsg);
                    } else if (input.type === 'email' && !isValidEmail(input.value)) {
                        isValid = false;
                        input.classList.add('error');

                        const errorMsg = document.createElement('span');
                        errorMsg.className = 'form-error';
                        errorMsg.textContent = 'Please enter a valid email';
                        errorMsg.setAttribute('role', 'alert');
                        input.parentElement.appendChild(errorMsg);
                    }
                });

                if (isValid) {
                    alert('Form submitted successfully!');
                    form.reset();
                } else {
                    const firstError = form.querySelector('.error');
                    if (firstError) {
                        firstError.focus();
                    }
                }
            });
        });
    }

    function isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    // ========================================
    // Smooth Scroll for Anchor Links
    // ========================================

    function initSmoothScroll() {
        const anchorLinks = document.querySelectorAll('a[href^="#"]');

        anchorLinks.forEach(link => {
            link.addEventListener('click', function (e) {
                const href = this.getAttribute('href');

                if (href === '#' || this.classList.contains('skip-link')) {
                    return;
                }

                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    // ========================================
    // Keyboard Navigation Accessibility
    // ========================================

    function initAccessibility() {
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Tab') {
                document.body.classList.add('keyboard-nav');
            }
        });

        document.addEventListener('mousedown', function () {
            document.body.classList.remove('keyboard-nav');
        });

        const skipLink = document.querySelector('.skip-link');
        if (skipLink) {
            skipLink.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.setAttribute('tabindex', '-1');
                    target.focus();
                }
            });
        }
    }

    // ========================================
    // Initialize All
    // ========================================

    function init() {
        initAccordions();
        initMobileNav();
        initFormValidation();
        initSmoothScroll();
        initAccessibility();

        console.log('Aivolo Design System initialized');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
