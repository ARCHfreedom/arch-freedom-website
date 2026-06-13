document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('customizationForm');
    const progressFill = document.getElementById('progress-fill');
    const progressPercentage = document.getElementById('progress-percentage');
    const summaryModal = document.getElementById('summaryModal');
    const summaryContent = document.getElementById('summaryContent');

    // --- Project Type Selector Logic ---
    let currentProjectType = null;

    const projectTypeBtns = document.querySelectorAll('.project-type-btn');
    const allFormSections = document.querySelectorAll('.form-section[data-project]');

    function showSectionsForType(type) {
        currentProjectType = type;
        allFormSections.forEach(section => {
            const projects = section.getAttribute('data-project').split(' ');
            if (projects.includes(type)) {
                section.classList.remove('form-section-hidden');
            } else {
                section.classList.add('form-section-hidden');
            }
        });
        updateProgress();
    }

    projectTypeBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            projectTypeBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            showSectionsForType(this.getAttribute('data-type'));
            // Smooth scroll to first visible section
            const firstVisible = document.querySelector('.form-section:not(.form-section-hidden)');
            if (firstVisible) {
                setTimeout(() => firstVisible.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
            }
        });
    });

    // --- Progress Tracking Logic ---
    // Steps per project type — only the relevant ones count toward progress.
    const stepsByType = {
        deck:     ['layout_style','staircase_design','decking_surface','color_palette','railing_system','footprint','elevation','client_name','client_email'],
        fencing:  ['fence_orientation','fence_material','fence_height','client_name','client_email'],
        gazebo:   ['gazebo_size','gazebo_roof','gazebo_roofing','footprint','elevation','client_name','client_email'],
        multiple: ['layout_style','staircase_design','decking_surface','color_palette','railing_system','footprint','elevation','fence_orientation','fence_material','client_name','client_email']
    };

    function updateProgress() {
        if (!currentProjectType) {
            progressFill.style.width = '0%';
            progressPercentage.textContent = '0%';
            return;
        }

        const steps = stepsByType[currentProjectType] || [];
        let completedSteps = 0;

        steps.forEach(name => {
            const radioChecked = form.querySelector(`input[name="${name}"]:checked`);
            const textEl = form.querySelector(`input[name="${name}"], textarea[name="${name}"]`);
            if (radioChecked) {
                completedSteps++;
            } else if (textEl && textEl.type !== 'radio' && textEl.value && textEl.value.trim() !== '') {
                completedSteps++;
            }
        });

        const percentage = Math.round((completedSteps / steps.length) * 100);
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

        // Send to Netlify Forms
        try {
            const encode = (data) =>
                Object.keys(data)
                    .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(data[key] ?? ''))
                    .join('&');

            const payload = {
                'form-name': 'blueprint',
                'subject': `New Blueprint: ${data.client_name || 'Anonymous'}`,
                'message': emailBody,
                ...Object.fromEntries(
                    Object.entries(formattedData).map(([k, v]) => [k, Array.isArray(v) ? v.join(', ') : (v ?? '')])
                )
            };

            const response = await fetch('/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: encode(payload)
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
