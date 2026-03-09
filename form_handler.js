document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('customizationForm');
    const progressFill = document.getElementById('progress-fill');
    const progressPercentage = document.getElementById('progress-percentage');
    const summaryModal = document.getElementById('summaryModal');
    const summaryContent = document.getElementById('summaryContent');

    // --- Progress Tracking Logic ---
    // Define the specific required radio groups that must be answered to count a section as complete.
    // Only these groups count toward progress — optional checkboxes and file uploads do NOT.
    const requiredGroups = [
        ['layout_style', 'staircase_design'],   // Section A
        ['decking_surface', 'color_palette', 'railing_system'], // Section B
        // Section C is optional (checkboxes) — skip
        ['footprint', 'elevation'],              // Section D
        // Section E is optional (number + toggle) — skip
        // Section F is optional (file upload) — skip
        ['client_name', 'client_email']          // Your Information
    ];
    const totalTrackedSections = requiredGroups.length;

    function updateProgress() {
        let completedSections = 0;

        requiredGroups.forEach(groupNames => {
            let allAnswered = true;
            groupNames.forEach(name => {
                const el = form.querySelector(`[name="${name}"]`);
                if (!el) { allAnswered = false; return; }

                if (el.type === 'radio') {
                    // Radio: check if any in the group is checked
                    if (!form.querySelector(`input[name="${name}"]:checked`)) {
                        allAnswered = false;
                    }
                } else {
                    // Text/email/tel: check if it has a non-empty value
                    if (!el.value || el.value.trim() === '') {
                        allAnswered = false;
                    }
                }
            });
            if (allAnswered) completedSections++;
        });

        const percentage = Math.round((completedSections / totalTrackedSections) * 100);
        progressFill.style.width = percentage + '%';
        progressPercentage.textContent = percentage + '%';
    }

    form.addEventListener('change', updateProgress);
    form.addEventListener('input', updateProgress);
    updateProgress(); // Initial check

    // --- Form Submission Logic ---
    form.addEventListener('submit', async function(event) {
        event.preventDefault();

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        
        submitBtn.textContent = 'Sending...';
        submitBtn.disabled = true;

        const formData = new FormData(form);
        const data = {};

        // Collect all form data
        for (let [key, value] of formData.entries()) {
            if (key === 'site_photos') {
                if (!data[key]) data[key] = [];
                if (value.name) {
                    data[key].push({ name: value.name, type: value.type, size: value.size });
                }
            } else if (key === 'custom_footprint' && formData.get('footprint') !== 'Custom') {
                continue;
            } else if (key === 'heavy_load_support') {
                data[key] = value === 'on';
            } else if (form.elements[key] && (form.elements[key].type === 'checkbox' || (form.elements[key].length && form.elements[key][0].type === 'checkbox'))) {
                if (!data[key]) data[key] = [];
                data[key].push(value);
            } else {
                data[key] = value;
            }
        }

        // Format multi-selects for email
        const formattedData = {...data};
        if (Array.isArray(formattedData.lighting)) formattedData.lighting = formattedData.lighting.join(', ');
        if (Array.isArray(formattedData.built_ins)) formattedData.built_ins = formattedData.built_ins.join(', ');
        if (Array.isArray(formattedData.climate)) formattedData.climate = formattedData.climate.join(', ');

        // Construct email body
        let emailBody = `New Unique Project Inquiry - ${data.client_name || 'Anonymous'}\n\n`;
        emailBody += `Client: ${data.client_name}\nEmail: ${data.client_email}\nPhone: ${data.client_phone || 'N/A'}\n\n`;
        emailBody += `Blueprint Details:\n`;
        emailBody += `- Layout: ${data.layout_style}\n- Stairs: ${data.staircase_design}\n`;
        emailBody += `- Surface: ${data.decking_surface}\n- Color: ${data.color_palette}\n- Railing: ${data.railing_system}\n`;
        emailBody += `- Enhancements: ${formattedData.lighting || 'None'}, ${formattedData.built_ins || 'None'}, ${formattedData.climate || 'None'}\n`;
        emailBody += `- Dimensions: ${data.footprint} (${data.linear_footage_railing} ft)\n- Heavy Load: ${data.heavy_load_support ? 'Yes' : 'No'}\n`;

        // Send to Formspree
        try {
            const response = await fetch('https://formspree.io/f/xzzdnyyl', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({
                    subject: `New Blueprint: ${data.client_name}`,
                    message: emailBody,
                    _replyto: data.client_email
                })
            });

            if (response.ok) {
                showSummary(data);
                form.reset();
                updateProgress();
            } else {
                alert('Submission failed. Please try again.');
            }
        } catch (error) {
            alert('An error occurred. Please check your connection.');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });

    function showSummary(data) {
        const items = [
            { label: 'Layout Style', value: data.layout_style },
            { label: 'Staircase', value: data.staircase_design },
            { label: 'Decking Surface', value: data.decking_surface },
            { label: 'Color Palette', value: data.color_palette },
            { label: 'Railing System', value: data.railing_system },
            { label: 'Footprint', value: data.footprint === 'Custom' ? data.custom_footprint : data.footprint },
            { label: 'Linear Footage', value: data.linear_footage_railing + ' ft' },
            { label: 'Heavy Load Support', value: data.heavy_load_support ? 'Yes' : 'No' }
        ];

        summaryContent.innerHTML = items.map(item => `
            <div class="summary-item">
                <h4>${item.label}</h4>
                <p>${item.value || 'Not specified'}</p>
            </div>
        `).join('');

        summaryModal.style.display = 'block';
    }
});

// Deselection logic for radio buttons
document.querySelectorAll('.option-card input[type="radio"]').forEach(radio => {
    radio.addEventListener('click', function(e) {
        if (this.previousValue === this.value) {
            this.checked = false;
            this.previousValue = null;
            this.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
            document.querySelectorAll(`input[name="${this.name}"]`).forEach(r => r.previousValue = null);
            this.previousValue = this.value;
        }
    });
});

// Custom footprint toggle
document.addEventListener('change', function(event) {
    if (event.target.name === 'footprint') {
        const customInput = document.getElementById('custom_footprint_input');
        if (event.target.value === 'Custom') {
            customInput.style.display = 'block';
            customInput.required = true;
        } else {
            customInput.style.display = 'none';
            customInput.required = false;
        }
    }
});
