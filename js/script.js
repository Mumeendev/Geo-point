// Mobile Menu Toggle Logic
document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            menuToggle.setAttribute('aria-expanded', String(navLinks.classList.contains('active')));
            
            // Optional: Animate hamburger to X
            const spans = menuToggle.querySelectorAll('span');
            spans.forEach(span => span.classList.toggle('open'));
        });
    }

    // Smooth Scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
                // Close mobile menu if open
                if (navLinks && navLinks.classList.contains('active')) {
                    navLinks.classList.remove('active');
                    if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
                }
            }
        });
    });

    // Form Validation for Contact Page
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const service = document.getElementById('service').value;
            const message = document.getElementById('message').value.trim();
            const website = document.getElementById('website').value;
            const submitBtn = contactForm.querySelector('button[type="submit"]');

            if (name && email && service && message) {
                // Change button state
                const originalBtnText = submitBtn.innerText;
                submitBtn.innerText = 'Sending...';
                submitBtn.disabled = true;

                try {
                    const response = await fetch('/api/contact', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ name, email, service, message, website }),
                    });

                    const data = await response.json();

                    if (response.ok) {
                        alert('Thank you for your message, ' + name + '! Your message has been sent successfully.');
                        contactForm.reset();
                    } else {
                        throw new Error(data.error || 'Something went wrong');
                    }
                } catch (error) {
                    console.error('Submission error:', error);
                    alert('Oops! There was an error sending your message: ' + error.message);
                } finally {
                    submitBtn.innerText = originalBtnText;
                    submitBtn.disabled = false;
                }
            } else {
                alert('Please complete all fields and select a service.');
            }
        });
    }

    const feedbackForm = document.getElementById('feedbackForm');
    if (feedbackForm) {
        const feedbackList = document.getElementById('feedbackList');
        const status = document.getElementById('feedbackStatus');
        const renderFeedback = (entries) => {
            feedbackList.replaceChildren();
            if (!entries.length) {
                const empty = document.createElement('p');
                empty.className = 'feedback-empty';
                empty.textContent = 'Be the first to leave a comment.';
                feedbackList.append(empty);
                return;
            }
            entries.forEach((entry) => {
                const item = document.createElement('article');
                item.className = 'feedback-comment';
                const header = document.createElement('div');
                header.className = 'feedback-comment-header';
                const name = document.createElement('strong');
                name.textContent = entry.name;
                const stars = document.createElement('span');
                stars.className = 'feedback-stars';
                stars.setAttribute('aria-label', `${entry.rating} out of 5 stars`);
                stars.textContent = '★'.repeat(entry.rating) + '☆'.repeat(5 - entry.rating);
                const comment = document.createElement('p');
                comment.textContent = entry.comment;
                header.append(name, stars);
                item.append(header, comment);
                feedbackList.append(item);
            });
        };
        const loadFeedback = async () => {
            try {
                const response = await fetch('/api/feedback');
                if (!response.ok) throw new Error();
                renderFeedback(await response.json());
            } catch {
                feedbackList.innerHTML = '<p class="feedback-empty">Comments are unavailable at the moment.</p>';
            }
        };
        loadFeedback();
        feedbackForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('feedbackName').value.trim();
            const rating = feedbackForm.querySelector('input[name="rating"]:checked');
            const comment = document.getElementById('feedbackComment').value.trim();
            if (!name || !rating || !comment) return;
            try {
                const response = await fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, rating: Number(rating.value), comment }) });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Could not post your feedback.');
                feedbackForm.reset();
                status.textContent = 'Thank you for your feedback!';
                await loadFeedback();
            } catch (error) {
                status.textContent = error.message || 'Could not post your feedback.';
            }
        });
    }
});
