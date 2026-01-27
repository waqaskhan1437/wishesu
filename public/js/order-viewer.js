/**
 * Unified Order Viewer - Handles both buyer and admin views
 * Replaces buyer-order.js and order-detail.js
 */

(function () {
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('id');
    const isAdmin = urlParams.get('admin') === '1';
    let orderData = null;
    let selectedRating = 5;
    let countdownTimer = null;

    if (!orderId) {
        showError('Order ID not found');
        return;
    }

    // Character counter for review comment
    const commentEl = document.getElementById('review-comment');
    const countEl = document.getElementById('comment-count');
    if (commentEl && countEl) {
        commentEl.addEventListener('input', function () {
            countEl.textContent = this.value.length;
            countEl.style.color = this.value.length > 900 ? '#ef4444' : '#6b7280';
        });
    }

    // Setup view based on admin mode
    if (isAdmin) {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block');
        document.querySelectorAll('.buyer-only').forEach(el => el.style.display = 'none');
        const backBtn = document.getElementById('back-btn');
        if (backBtn) backBtn.href = '/admin/dashboard.html';
    } else {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.buyer-only').forEach(el => el.style.display = 'block');
        const backBtn = document.getElementById('back-btn');
        if (backBtn) backBtn.href = '/';
    }

    // Check if returning from tip payment
    const tipSuccess = urlParams.get('tip_success');
    const tipAmount = urlParams.get('tip_amount');
    if (tipSuccess === '1' && tipAmount) {
        fetch('/api/order/tip-paid', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId, amount: parseFloat(tipAmount) })
        }).then(() => {
            window.history.replaceState({}, '', `?id=${orderId}`);
            alert('🎉 Thank you for your generous tip!');
        });
    }

    // Fetch server time and load order
    if (typeof fetchServerTimeOffset === 'function') {
        fetchServerTimeOffset().then(offset => {
            window.timerOffset = offset;
            loadOrder();
        }).catch(() => {
            window.timerOffset = 0;
            loadOrder();
        });
    } else {
        window.timerOffset = 0;
        loadOrder();
    }

    // Rating stars
    document.querySelectorAll('.rating-stars span').forEach(star => {
        star.addEventListener('click', function () {
            selectedRating = parseInt(this.dataset.rating);
            updateStars(selectedRating);
        });
    });

    // Review form
    document.getElementById('review-form')?.addEventListener('submit', submitReview);

    // Approve button
    document.getElementById('approve-btn')?.addEventListener('click', () => {
        const reviewSection = document.getElementById('review-section');
        if (reviewSection) {
            reviewSection.style.display = 'block';
            reviewSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    });

    // Revision button
    document.getElementById('revision-btn')?.addEventListener('click', requestRevision);

    // Tip buttons
    document.querySelectorAll('.tip-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            processTip(this.dataset.amount);
        });
    });

    // Admin delivery
    document.getElementById('submit-delivery-btn')?.addEventListener('click', submitDelivery);

    async function loadOrder() {
        try {
            const res = await fetch(`/api/order/buyer/${orderId}`);
            const data = await res.json();
            if (!res.ok || !data.order) throw new Error(data.error || 'Order not found');
            orderData = data.order;
            displayOrder(orderData);
        } catch (err) {
            showError('Error: ' + err.message);
        }
    }

    function displayOrder(order) {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('order-content').style.display = 'block';

        // Handle different element ID naming conventions
        const orderIdEl = document.getElementById('order-id-display') || document.getElementById('order-id');
        const emailEl = document.getElementById('email-display') || document.getElementById('email');
        const amountEl = document.getElementById('amount-display') || document.getElementById('amount');
        const statusEl = document.getElementById('status-display') || document.getElementById('status');
        const dateEl = document.getElementById('order-date') || document.getElementById('date');
        const deliveryEl = document.getElementById('delivery-time-display');

        if (orderIdEl) orderIdEl.textContent = (orderIdEl.id.includes('display') ? 'Order #' : '') + order.order_id;
        if (emailEl) emailEl.textContent = order.email || 'N/A';
        if (amountEl) amountEl.textContent = '$' + (order.amount || 0);
        if (statusEl) statusEl.textContent = order.status;
        if (dateEl) dateEl.textContent = new Date(order.created_at).toLocaleString();

        // Show delivery time in proper format
        if (deliveryEl) {
            const deliveryMins = order.delivery_time_minutes || 60;
            let deliveryText = '';
            if (deliveryMins <= 60) {
                deliveryText = 'Instant Delivery In 60 Minutes';
            } else {
                const days = Math.ceil(deliveryMins / (24 * 60));
                if (days === 1) {
                    deliveryText = '24 Hour Express Delivery';
                } else {
                    deliveryText = `${days} Days Delivery`;
                }
            }
            deliveryEl.textContent = deliveryText;
        }

        // Product summary card (buyer-order style)
        renderProductSummary(order);

        displayRequirements(order.addons || []);

        const statusMsg = document.getElementById('status-message');

        if (order.status === 'delivered' && order.delivered_video_url) {
            showDelivery(order);
        } else {
            startCountdown(order.delivery_time_minutes || 60, order.created_at);

            if (isAdmin) {
                const deliverySection = document.getElementById('delivery-section');
                if (deliverySection) deliverySection.style.display = 'block';
                if (statusMsg) statusMsg.style.display = 'none';
            } else {
                if (statusMsg) {
                    statusMsg.style.display = 'block';
                    statusMsg.className = 'status-message status-processing';
                    statusMsg.innerHTML = '<h3>🎬 Video Being Created</h3><p>Our team is working on your personalized video. You\'ll be notified when it\'s ready!</p>';
                }
            }
        }
    }

    function renderProductSummary(order) {
        const productCard = document.getElementById('product-summary-card');
        if (!productCard) return;

        const productTitle = order.product_title || '';
        const productThumb = order.product_thumbnail || '';
        const productId = order.product_id || '';

        productCard.innerHTML = '';
        const img = document.createElement('img');
        img.className = 'product-summary-thumb';
        img.alt = productTitle ? `Product: ${productTitle}` : 'Product thumbnail';
        if (productThumb) img.src = productThumb;

        const meta = document.createElement('div');
        meta.className = 'product-summary-meta';

        const titleEl = document.createElement('p');
        titleEl.className = 'product-summary-title';

        const productUrl = productId ? `/product?id=${encodeURIComponent(productId)}` : '/products';
        const a = document.createElement('a');
        a.href = productUrl;
        a.textContent = productTitle || 'View purchased product';
        a.rel = 'noopener';
        titleEl.appendChild(a);

        const actions = document.createElement('div');
        actions.className = 'product-summary-actions';

        const viewBtn = document.createElement('a');
        viewBtn.href = productUrl;
        viewBtn.textContent = 'View Product';
        viewBtn.rel = 'noopener';

        const buyAgainBtn = document.createElement('a');
        buyAgainBtn.href = productUrl;
        buyAgainBtn.textContent = 'Buy Again';
        buyAgainBtn.className = 'secondary';
        buyAgainBtn.rel = 'noopener';

        actions.appendChild(viewBtn);
        actions.appendChild(buyAgainBtn);
        meta.appendChild(titleEl);
        meta.appendChild(actions);

        if (productThumb) productCard.appendChild(img);
        productCard.appendChild(meta);
        productCard.style.display = 'flex';
    }

    function displayRequirements(addons) {
        const list = document.getElementById('requirements-list') || document.getElementById('requirements');
        if (!list) return;

        const photos = [];

        if (!addons || addons.length === 0) {
            list.innerHTML = '<div class="addon-item" style="color:#6b7280;font-style:italic;">No requirements provided.</div>';
            return;
        }

        const filtered = addons.filter(a => a.field !== '_temp_session');

        if (filtered.length === 0) {
            list.innerHTML = '<div class="addon-item" style="color:#6b7280;font-style:italic;">No requirements provided.</div>';
            return;
        }

        list.innerHTML = filtered.map(a => {
            let val = a.value || '';
            let label = a.field || 'Item';

            if (val.includes('[TEMP_FILE]') || val.includes('[PHOTO LINK]')) {
                const url = val.split(']:')[1]?.trim();
                if (url) {
                    photos.push(url);
                    return `<div class="addon-item"><span class="addon-label">${label}:</span> <a href="${url}" target="_blank" style="color:#3b82f6;">View Photo 📷</a></div>`;
                }
                return `<div class="addon-item"><span class="addon-label">${label}:</span> Photo uploaded</div>`;
            }

            return `<div class="addon-item"><span class="addon-label">${label}:</span> ${val}</div>`;
        }).join('');

        if (photos.length > 0) {
            const photosSection = document.getElementById('photos-section');
            const photosGrid = document.getElementById('photos-grid') || document.getElementById('photos');
            if (photosSection) photosSection.style.display = 'block';
            if (photosGrid) {
                photosGrid.innerHTML = photos.map(url => `<div class="photo-item"><img src="${url}" onclick="window.open('${url}', '_blank')" onerror="this.style.display='none'"></div>`).join('');
            }
        }
    }

    function startCountdown(minutes, createdAt) {
        const countdownSection = document.getElementById('countdown-section');
        if (countdownSection) countdownSection.style.display = 'block';

        if (countdownTimer) {
            countdownTimer.stop();
        }

        if (typeof CountdownTimer === 'function') {
            const displayEl = document.getElementById('countdown-display');
            if (displayEl) {
                countdownTimer = new CountdownTimer('countdown-display', minutes, createdAt, {
                    serverTimeOffset: window.timerOffset || 0
                });
                countdownTimer.start();
            }
        }
    }

    function showDelivery(order) {
        document.getElementById('countdown-section').style.display = 'none';

        const videoSection = document.getElementById('video-section') || document.getElementById('video-player-section');
        if (videoSection) videoSection.style.display = 'block';

        const statusMsg = document.getElementById('status-message');
        if (statusMsg && !isAdmin) {
            statusMsg.style.display = 'block';
            statusMsg.className = 'status-message status-delivered';
            statusMsg.innerHTML = '<h3>✅ Video Ready!</h3><p>Your video has been delivered and is ready to watch.</p>';
        }

        // Initialize video player
        const playerContainer = document.getElementById('player-container') || document.getElementById('universal-video-player');
        if (playerContainer && order.delivered_video_url) {
            let videoMetadata = null;
            if (order.delivered_video_metadata) {
                try {
                    videoMetadata = JSON.parse(order.delivered_video_metadata);
                } catch (e) {
                    console.warn('Failed to parse video metadata:', e);
                }
            }

            const player = window.UniversalVideoPlayer || window.UniversalPlayer;
            if (player) {
                player.render(playerContainer.id, order.delivered_video_url, videoMetadata);
            }
        }

        // Setup download button
        const downloadBtn = document.getElementById('download-btn');
        if (downloadBtn && order.delivered_video_url) {
            const player = window.UniversalVideoPlayer || window.UniversalPlayer;
            if (player) {
                const detected = player.detect(order.delivered_video_url);
                const openOnlyTypes = ['youtube', 'vimeo', 'bunny-embed'];

                if (openOnlyTypes.includes(detected.type)) {
                    downloadBtn.textContent = '🔗 Open Video';
                    downloadBtn.href = order.delivered_video_url;
                    downloadBtn.target = '_blank';
                    downloadBtn.removeAttribute('download');
                } else {
                    downloadBtn.textContent = '⬇️ Download Video';
                    downloadBtn.href = `/download/${order.order_id}`;
                    downloadBtn.removeAttribute('target');
                    downloadBtn.setAttribute('download', '');
                }
            }
        }

        // Show action buttons for buyers
        if (!isAdmin) {
            const revisionBtn = document.getElementById('revision-btn');
            const approveBtn = document.getElementById('approve-btn');
            if (revisionBtn) revisionBtn.style.display = 'inline-flex';
            if (approveBtn) approveBtn.style.display = 'inline-flex';

            // Check if already reviewed
            if (order.has_review) {
                hideReviewUIElements();
                if (videoSection) {
                    const thankYou = document.createElement('div');
                    thankYou.style.cssText = 'background:#d1fae5;border:2px solid #10b981;padding:20px;border-radius:12px;text-align:center;margin-top:20px;';
                    thankYou.innerHTML = '<h3 style="color:#065f46;margin:0;">✅ Thank you for your review!</h3><p style="color:#047857;margin:10px 0 0;">Your feedback has been submitted.</p>';
                    videoSection.appendChild(thankYou);
                }
            }

            // Show tip section
            updateTipUI(order);
        }
    }

    async function submitDelivery() {
        const url = document.getElementById('delivery-url')?.value.trim();
        const file = document.getElementById('delivery-file')?.files[0];
        const thumb = document.getElementById('thumbnail-url')?.value.trim();
        const subtitlesUrl = document.getElementById('subtitles-url')?.value.trim();

        if (!url && !file) {
            alert('Provide URL or upload file');
            return;
        }

        let videoUrl = url;
        if (file) {
            const maxSize = 500 * 1024 * 1024;
            if (file.size > maxSize) {
                alert(`File too large! Maximum size is 500MB.`);
                return;
            }

            const btn = document.getElementById('submit-delivery-btn');
            const progressDiv = document.getElementById('upload-progress');
            const progressBar = document.getElementById('progress-bar');
            const progressText = document.getElementById('progress-text');

            if (btn) {
                btn.innerHTML = '<span style="display: inline-flex; align-items: center; gap: 8px;"><span style="display: inline-block; width: 16px; height: 16px; border: 2px solid white; border-top-color: transparent; border-radius: 50%; animation: spin 0.6s linear infinite;"></span>Uploading...</span>';
                btn.disabled = true;
            }
            if (progressDiv) progressDiv.style.display = 'block';

            try {
                const itemId = 'delivery_' + orderId + '_' + Date.now();
                const filename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                const uploadUrl = `/api/upload/customer-file?itemId=${itemId}&filename=${encodeURIComponent(filename)}&originalFilename=${encodeURIComponent(file.name)}&orderId=${encodeURIComponent(orderId)}`;

                const xhr = new XMLHttpRequest();
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable && progressBar && progressText) {
                        const percent = (e.loaded / e.total) * 100;
                        progressBar.style.width = percent + '%';
                        progressText.textContent = `Uploading... ${Math.round(percent)}%`;
                    }
                });

                xhr.addEventListener('load', () => {
                    if (xhr.status === 200) {
                        const data = JSON.parse(xhr.responseText);
                        if (data.url) {
                            submitDeliveryWithUrl(data.url, thumb, subtitlesUrl, data);
                        } else {
                            alert('Upload failed: ' + (data.error || 'Unknown error'));
                        }
                    } else {
                        alert('Upload failed');
                    }
                });

                xhr.open('POST', uploadUrl);
                xhr.send(file);
                return;
            } catch (err) {
                alert('Upload failed: ' + err.message);
                if (btn) {
                    btn.textContent = '✅ Submit Delivery';
                    btn.disabled = false;
                }
                return;
            }
        } else {
            submitDeliveryWithUrl(videoUrl, thumb, subtitlesUrl);
        }
    }

    async function submitDeliveryWithUrl(videoUrl, thumb, subtitlesUrl, uploadData) {
        const btn = document.getElementById('submit-delivery-btn');

        try {
            if (btn) btn.innerHTML = 'Submitting...';

            const deliveryData = { orderId, videoUrl, thumbnailUrl: thumb };
            if (subtitlesUrl) deliveryData.subtitlesUrl = subtitlesUrl;
            if (uploadData?.embedUrl) {
                deliveryData.embedUrl = uploadData.embedUrl;
                deliveryData.itemId = uploadData.itemId;
            }

            const res = await fetch('/api/order/deliver', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(deliveryData)
            });
            const data = await res.json();
            if (res.ok && data.success) {
                if (btn) btn.innerHTML = '✅ Delivered!';
                setTimeout(() => loadOrder(), 1500);
            } else throw new Error(data.error || 'Failed');
        } catch (err) {
            alert('Error: ' + err.message);
            if (btn) {
                btn.textContent = '✅ Submit Delivery';
                btn.disabled = false;
            }
        }
    }

    async function requestRevision(e) {
        if (e) e.preventDefault();
        const reason = prompt('What needs to be changed?');
        if (!reason || !reason.trim()) return;
        try {
            const res = await fetch('/api/order/revision', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId, reason: reason.trim() })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                alert('✅ Revision requested!');
                loadOrder();
            } else throw new Error(data.error || 'Failed');
        } catch (err) {
            alert('Error: ' + err.message);
        }
    }

    async function submitReview(e) {
        e.preventDefault();
        const name = document.getElementById('reviewer-name')?.value.trim();
        const comment = document.getElementById('review-comment')?.value.trim();
        const portfolioEnabled = document.getElementById('portfolio-checkbox')?.checked;

        if (!name || !comment) {
            alert('Please fill all fields');
            return;
        }

        try {
            // Use shared utility if available
            if (typeof submitReviewToAPI === 'function') {
                await submitReviewToAPI(orderData, { name, comment, rating: selectedRating, portfolioEnabled });
            } else {
                const res = await fetch('/api/reviews/add', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        productId: orderData.product_id,
                        author: name,
                        rating: selectedRating,
                        comment: comment,
                        orderId: orderData.order_id,
                        showOnProduct: portfolioEnabled ? 1 : 0
                    })
                });
                const data = await res.json();
                if (!res.ok || !data.success) throw new Error(data.error || 'Failed');

                if (portfolioEnabled) {
                    await fetch('/api/order/portfolio', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ orderId: orderData.order_id, portfolioEnabled: 1 })
                    });
                }
            }

            alert('✅ Review submitted!');
            hideReviewUIElements();
        } catch (err) {
            alert('Error: ' + err.message);
        }
    }

    function hideReviewUIElements() {
        const reviewSection = document.getElementById('review-section');
        const approveBtn = document.getElementById('approve-btn');
        const revisionBtn = document.getElementById('revision-btn');
        if (reviewSection) reviewSection.style.display = 'none';
        if (approveBtn) approveBtn.style.display = 'none';
        if (revisionBtn) revisionBtn.style.display = 'none';
    }

    function setTipButtonsDisabled(disabled) {
        document.querySelectorAll('.tip-btn').forEach(btn => {
            btn.disabled = !!disabled;
            btn.style.opacity = disabled ? '0.65' : '1';
            btn.style.cursor = disabled ? 'not-allowed' : 'pointer';
        });
    }

    function updateTipUI(order) {
        const tipSection = document.getElementById('tip-section');
        if (!tipSection) return;

        if (order.tip_paid) {
            tipSection.style.display = 'none';
            showTipThankYou(order.tip_amount || 0);
            return;
        }

        tipSection.style.display = 'block';
    }

    function showTipThankYou(amount) {
        const container = document.getElementById('video-section') || document.getElementById('video-player-section') || document.getElementById('order-actions');
        if (!container || document.getElementById('tip-thankyou')) return;

        const box = document.createElement('div');
        box.id = 'tip-thankyou';
        box.style.cssText = 'background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 2px solid #fbbf24; padding: 20px; border-radius: 12px; text-align: center; margin-top: 20px;';
        const safe = Number(amount);
        const shown = Number.isFinite(safe) ? safe : 0;
        box.innerHTML = `<h3 style="color:#92400e;margin:0;">💝 Thank you for your $${shown} tip!</h3><p style="color:#78350f;margin:10px 0 0;">Your generosity means the world to us!</p>`;
        container.appendChild(box);
    }

    async function markTipPaid(amount) {
        const tipAmount = Number(amount);
        if (!Number.isFinite(tipAmount) || tipAmount <= 0) return;

        await fetch('/api/order/tip-paid', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId, amount: tipAmount })
        });

        if (orderData) {
            orderData.tip_paid = 1;
            orderData.tip_amount = tipAmount;
        }

        const tipSection = document.getElementById('tip-section');
        if (tipSection) tipSection.style.display = 'none';
        showTipThankYou(tipAmount);
    }

    async function processTip(amount) {
        const tipAmount = Number(amount);
        if (!orderData || !Number.isFinite(tipAmount) || tipAmount <= 0) return;

        if (orderData.tip_paid) {
            showTipThankYou(orderData.tip_amount || tipAmount);
            return;
        }

        setTipButtonsDisabled(true);

        let methods = [];
        try {
            if (window.TipCheckout?.loadPaymentMethods) {
                methods = await window.TipCheckout.loadPaymentMethods();
            }
        } catch (e) {
            methods = [];
        }

        const paypalMethod = methods.find(m => m?.id === 'paypal' && m.enabled !== false && m.client_id);
        const whopMethod = methods.find(m => m?.id === 'whop' && m.enabled !== false);

        // PayPal priority
        if (paypalMethod && window.TipCheckout?.openPayPalTip) {
            try {
                window.TipCheckout.openPayPalTip({
                    clientId: paypalMethod.client_id,
                    productId: orderData.product_id,
                    amount: tipAmount,
                    email: orderData.email || '',
                    orderId: orderData.order_id,
                    onSuccess: async () => await markTipPaid(tipAmount),
                    onClose: () => setTipButtonsDisabled(false)
                });
                return;
            } catch (err) {
                alert('Error: ' + (err.message || 'PayPal checkout failed'));
                setTipButtonsDisabled(false);
                return;
            }
        }

        // Fallback to Whop
        if (!whopMethod || typeof window.whopCheckout !== 'function') {
            alert('Payment system not available');
            setTipButtonsDisabled(false);
            return;
        }

        try {
            const res = await fetch('/api/whop/create-plan-checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    product_id: orderData.product_id,
                    amount: tipAmount,
                    email: orderData.email || '',
                    metadata: { type: 'tip', orderId: orderData.order_id, tipAmount }
                })
            });

            const data = await res.json();
            if (!res.ok || data.error) throw new Error(data.error || 'Failed');

            if (data.plan_id) {
                window.whopCheckout({
                    planId: data.plan_id,
                    amount: tipAmount,
                    email: orderData.email || '',
                    metadata: { type: 'tip', orderId: orderData.order_id, tipAmount },
                    onComplete: async () => {
                        await markTipPaid(tipAmount);
                        window.whopCheckoutClose?.();
                    }
                });
                return;
            }

            if (data.checkout_url) {
                window.location.href = data.checkout_url;
                return;
            }

            throw new Error('Payment system not available');
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setTipButtonsDisabled(false);
        }
    }

    function updateStars(rating) {
        document.querySelectorAll('.rating-stars span').forEach((star, i) => {
            star.classList.toggle('active', i < rating);
        });
    }

    function showError(msg) {
        document.getElementById('loading').style.display = 'none';
        const errorEl = document.getElementById('error');
        if (errorEl) {
            errorEl.textContent = msg;
            errorEl.style.display = 'block';
        }
    }

    updateStars(5);
})();
