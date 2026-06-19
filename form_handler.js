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
    updateProgress();

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

        // Format multi-selects
        const formattedData = {...data};
        if (Array.isArray(formattedData.lighting)) formattedData.lighting = formattedData.lighting.join(', ');
        if (Array.isArray(formattedData.built_ins)) formattedData.built_ins = formattedData.built_ins.join(', ');
        if (Array.isArray(formattedData.climate)) formattedData.climate = formattedData.climate.join(', ');

        // Upload site photos to ImgBB
        const photoInput = document.getElementById('site_photos');
        let photoLinks = [];
        if (photoInput && photoInput.files && photoInput.files.length > 0) {
            submitBtn.textContent = 'Uploading photos...';
            const IMGBB_KEY = '38cf7780f1d32d80902cbfa20c6c8f0f';
            const uploadPromises = Array.from(photoInput.files).map(async (file) => {
                try {
                    const fd = new FormData();
                    fd.append('image', file);
                    const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, {
                        method: 'POST', body: fd
                    });
                    const json = await res.json();
                    if (json && json.success) return json.data.url;
                } catch (e) { /* silent fail */ }
                return null;
            });
            const results = await Promise.all(uploadPromises);
            photoLinks = results.filter(Boolean);
        }

        // Build clean email body — this is the ONLY field sent so Netlify shows it cleanly
        let emailBody = '';
        emailBody += `=== NEW BLUEPRINT SUBMISSION ===\n\n`;
        emailBody += `CLIENT INFO\n`;
        emailBody += `Name:    ${data.client_name || 'N/A'}\n`;
        emailBody += `Email:   ${data.client_email || 'N/A'}\n`;
        emailBody += `Phone:   ${data.client_phone || 'N/A'}\n\n`;

        emailBody += `PROJECT TYPE: ${currentProjectType ? currentProjectType.toUpperCase() : 'N/A'}\n\n`;

        if (currentProjectType === 'deck' || currentProjectType === 'multiple') {
            emailBody += `DECK DETAILS\n`;
            emailBody += `Layout Style:     ${data.layout_style || 'N/A'}\n`;
            emailBody += `Staircase Design: ${data.staircase_design || 'N/A'}\n`;
            emailBody += `Decking Surface:  ${data.decking_surface || 'N/A'}\n`;
            emailBody += `Color Palette:    ${data.color_palette || 'N/A'}\n`;
            emailBody += `Railing System:   ${data.railing_system || 'N/A'}\n`;
            emailBody += `Lighting:         ${formattedData.lighting || 'None'}\n`;
            emailBody += `Built-Ins:        ${formattedData.built_ins || 'None'}\n`;
            emailBody += `Climate Control:  ${formattedData.climate || 'None'}\n`;
            emailBody += `Footprint:        ${data.footprint === 'Custom' ? data.custom_footprint : (data.footprint || 'N/A')}\n`;
            emailBody += `Elevation:        ${data.elevation || 'N/A'}\n`;
            emailBody += `Linear Footage:   ${data.linear_footage_railing || 'N/A'} ft\n`;
            emailBody += `Heavy Load:       ${data.heavy_load_support ? 'Yes' : 'No'}\n\n`;
        }

        if (currentProjectType === 'fencing' || currentProjectType === 'multiple') {
            emailBody += `FENCING DETAILS\n`;
            emailBody += `Orientation: ${data.fence_orientation || 'N/A'}\n`;
            emailBody += `Material:    ${data.fence_material || 'N/A'}\n`;
            emailBody += `Height:      ${data.fence_height || 'N/A'}\n\n`;
        }

        if (currentProjectType === 'gazebo') {
            emailBody += `GAZEBO DETAILS\n`;
            emailBody += `Size:     ${data.gazebo_size || 'N/A'}\n`;
            emailBody += `Roof:     ${data.gazebo_roof || 'N/A'}\n`;
            emailBody += `Roofing:  ${data.gazebo_roofing || 'N/A'}\n`;
            emailBody += `Footprint: ${data.footprint === 'Custom' ? data.custom_footprint : (data.footprint || 'N/A')}\n`;
            emailBody += `Elevation: ${data.elevation || 'N/A'}\n\n`;
        }

        if (data.additional_notes && data.additional_notes.trim()) {
            emailBody += `ADDITIONAL NOTES\n${data.additional_notes}\n\n`;
        }

        // Site photos section
        if (photoLinks.length > 0) {
            emailBody += `SITE PHOTOS (${photoLinks.length})\n`;
            photoLinks.forEach((url, i) => {
                emailBody += `Photo ${i + 1}: ${url}\n`;
            });
        } else if (photoInput && photoInput.files && photoInput.files.length > 0) {
            emailBody += `SITE PHOTOS\n`;
            emailBody += `${photoInput.files.length} photo(s) were attached but could not be uploaded. Please follow up with client.\n`;
        } else {
            emailBody += `SITE PHOTOS\nNone provided.\n`;
        }

        emailBody += `\n================================\n`;

        // Send to Netlify Forms — only send form-name and message to keep email clean
        submitBtn.textContent = 'Sending...';
        try {
            const encode = (obj) =>
                Object.keys(obj)
                    .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(obj[k] ?? ''))
                    .join('&');

            const payload = {
                'form-name': 'blueprint',
                'message': emailBody,
                // Keep client fields for Netlify's spam filter and searchability
                'client_name': data.client_name || '',
                'client_email': data.client_email || '',
                'client_phone': data.client_phone || ''
            };

            const response = await fetch('/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: encode(payload)
            });

            if (response.ok) {
                showSummary(data, photoLinks);
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

    function showSummary(data, photoLinks) {
        const items = [
            { label: 'Layout Style', value: data.layout_style },
            { label: 'Staircase', value: data.staircase_design },
            { label: 'Decking Surface', value: data.decking_surface },
            { label: 'Color Palette', value: data.color_palette },
            { label: 'Railing System', value: data.railing_system },
            { label: 'Footprint', value: data.footprint === 'Custom' ? data.custom_footprint : data.footprint },
            { label: 'Linear Footage', value: data.linear_footage_railing ? data.linear_footage_railing + ' ft' : null },
            { label: 'Heavy Load Support', value: data.heavy_load_support ? 'Yes' : 'No' }
        ].filter(item => item.value);

        summaryContent.innerHTML = items.map(item => `
            <div class="summary-item">
                <h4>${item.label}</h4>
                <p>${item.value || 'Not specified'}</p>
            </div>
        `).join('');

        // Store photo links for print
        summaryModal._photoLinks = photoLinks || [];

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
