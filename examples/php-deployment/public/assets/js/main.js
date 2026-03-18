/**
 * TON AI Agent - Main JavaScript
 */

(function() {
    'use strict';

    // CSRF Token
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;

    // API Helper
    async function api(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        if (csrfToken) {
            headers['X-CSRF-TOKEN'] = csrfToken;
        }

        const sessionToken = localStorage.getItem('session_token');
        if (sessionToken) {
            headers['Authorization'] = `Bearer ${sessionToken}`;
        }

        try {
            const response = await fetch(endpoint, {
                ...options,
                headers: { ...headers, ...options.headers }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Form validation
    function validateForm(form) {
        let isValid = true;
        const errors = [];

        // Clear previous errors
        form.querySelectorAll('.form-error').forEach(el => el.remove());
        form.querySelectorAll('.form-input.error').forEach(el => el.classList.remove('error'));

        // Check required fields
        form.querySelectorAll('[required]').forEach(field => {
            if (!field.value.trim()) {
                isValid = false;
                showFieldError(field, 'This field is required');
            }
        });

        // Check email fields
        form.querySelectorAll('input[type="email"]').forEach(field => {
            if (field.value && !isValidEmail(field.value)) {
                isValid = false;
                showFieldError(field, 'Please enter a valid email address');
            }
        });

        return isValid;
    }

    function showFieldError(field, message) {
        field.classList.add('error');
        const error = document.createElement('div');
        error.className = 'form-error';
        error.textContent = message;
        error.style.color = 'var(--danger)';
        error.style.fontSize = '0.875rem';
        error.style.marginTop = '0.25rem';
        field.parentNode.appendChild(error);
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    // Form submission
    document.querySelectorAll('form[data-ajax]').forEach(form => {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();

            if (!validateForm(this)) {
                return;
            }

            const submitBtn = this.querySelector('[type="submit"]');
            const originalText = submitBtn?.textContent;

            try {
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Submitting...';
                }

                const formData = new FormData(this);
                const data = Object.fromEntries(formData);

                const response = await api(this.action, {
                    method: 'POST',
                    body: JSON.stringify(data)
                });

                // Success
                if (this.dataset.successMessage) {
                    showNotification(this.dataset.successMessage, 'success');
                }

                if (this.dataset.successRedirect) {
                    window.location.href = this.dataset.successRedirect;
                }

                this.reset();

            } catch (error) {
                showNotification(error.message || 'An error occurred', 'error');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
            }
        });
    });

    // Notification system
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '1rem 1.5rem',
            borderRadius: '0.5rem',
            background: type === 'success' ? 'var(--success)' :
                        type === 'error' ? 'var(--danger)' :
                        'var(--ton-blue)',
            color: 'white',
            fontWeight: '500',
            zIndex: '9999',
            animation: 'slideIn 0.3s ease',
            maxWidth: '400px'
        });

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    // Add notification animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);

    // Mobile menu toggle
    const menuToggle = document.querySelector('.menu-toggle');
    const mobileMenu = document.querySelector('.mobile-menu');

    if (menuToggle && mobileMenu) {
        menuToggle.addEventListener('click', () => {
            mobileMenu.classList.toggle('active');
            menuToggle.classList.toggle('active');
        });
    }

    // Lazy load images
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                    }
                    observer.unobserve(img);
                }
            });
        });

        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }

    // Expose API helper globally
    window.tonAiApi = api;
    window.showNotification = showNotification;

})();
