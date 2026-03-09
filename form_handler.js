document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('customizationForm');

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
                // Handle multiple files
                if (!data[key]) {
                    data[key] = [];
                }
                if (value.name) { // Check if it's a valid file
                    data[key].push({ name: value.name, type: value.type, size: value.size });
                }
            } else if (key === 'custom_footprint' && formData.get('footprint') !== 'Custom') {
                // Only include custom_footprint if 'Custom' is selected
                continue;
            } else if (key === 'heavy_load_support') {
                data[key] = value === 'on'; // Convert checkbox value to boolean
            } else if (form.elements[key] && form.elements[key].type === 'checkbox') {
                // Handle multiple checkboxes for lighting, built_ins, climate
                if (!data[key]) {
                    data[key] = [];
                }
                data[key].push(value);
            } else {
                data[key] = value;
            }
        }

        // Convert checkbox arrays to comma-separated strings
        if (data.lighting) data.lighting = data.lighting.join(', ');
        if (data.built_ins) data.built_ins = data.built_ins.join(', ');
        if (data.climate) data.climate = data.climate.join(', ');

        // Construct email body
        let emailBody = 'New Unique Project Inquiry - ' + (data.client_name || 'Anonymous') + '\n\n';
        emailBody += 'Client Information:\n';
        emailBody += `Name: ${data.client_name || 'N/A'}\n`;
        emailBody += `Email: ${data.client_email || 'N/A'}\n`;
        emailBody += `Phone: ${data.client_phone || 'N/A'}\n`;
        emailBody += `Message: ${data.client_message || 'N/A'}\n\n`;

        emailBody += 'Customization Blueprint:\n';

        emailBody += 'Section A: Structural Foundation\n';
        emailBody += `Layout Style: ${data.layout_style || 'N/A'}\n`;
        emailBody += `Staircase Design: ${data.staircase_design || 'N/A'}\n`;
        emailBody += `Framing: High-quality pressure-treated timber for a classic, sturdy foundation.\n\n`;

        emailBody += 'Section B: Material & Aesthetics\n';
        emailBody += `Decking Surface: ${data.decking_surface || 'N/A'}\n`;
        emailBody += `Color Palette: ${data.color_palette || 'N/A'}\n`;
        emailBody += `Railing System: ${data.railing_system || 'N/A'}\n\n`;

        emailBody += 'Section C: Lifestyle Enhancements\n';
        emailBody += `Lighting: ${data.lighting || 'None selected'}\n`;
        emailBody += `Built-ins: ${data.built_ins || 'None selected'}\n`;
        emailBody += `Climate Control: ${data.climate || 'None selected'}\n\n`;

        emailBody += 'Section D: Scope & Scale (Project Dimensions)\n';
        emailBody += `Approximate Footprint: ${data.footprint || 'N/A'} ${data.footprint === 'Custom' ? '(' + (data.custom_footprint || 'N/A') + ')' : ''}\n`;
        emailBody += `Elevation Level: ${data.elevation || 'N/A'}\n\n`;

        emailBody += 'Section E: Detailed Infrastructure\n';
        emailBody += `Linear Footage for Railing: ${data.linear_footage_railing || 'N/A'} feet\n`;
        emailBody += `Heavy Load Support: ${data.heavy_load_support ? 'Yes' : 'No'}\n\n`;

        emailBody += 'Section F: Mission Sight (Site Photos)\n';
        if (data.site_photos && data.site_photos.length > 0) {
            emailBody += 'Uploaded Photos:\n';
            data.site_photos.forEach(file => {
                emailBody += `- ${file.name} (${(file.size / 1024).toFixed(2)} KB)\n`;
            });
        } else {
            emailBody += 'No photos uploaded.\n';
        }

        // Send email using Formspree
        const formspreeEndpoint = 'https://formspree.io/f/xzzdnyyl'; // Formspree endpoint for jonathan@archfreedom.com
        const response = await fetch(formspreeEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                subject: `New Unique Project Inquiry - ${data.client_name || 'Anonymous'}`, // Email subject
                _replyto: data.client_email, // Set reply-to to client's email
                message: emailBody // Full email body
            })
        });

        if (response.ok) {
            alert('Your customization blueprint has been sent! We will get back to you shortly.');
            form.reset();
        } else {
            alert('There was an error sending your blueprint. Please try again or contact us directly.');
        }
    }).finally(() => {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    });
});

// Show custom footprint input when "Custom" is selected
document.addEventListener('change', function(event) {
    if (event.target.name === 'footprint') {
        const customInput = document.getElementById('custom_footprint_input');
        if (event.target.value === 'Custom') {
            customInput.style.display = 'block';
        } else {
            customInput.style.display = 'none';
        }
    }
});

// Allow radio buttons to be deselected by clicking them again
document.querySelectorAll('.option-card input[type="radio"]').forEach(radio => {
    radio.addEventListener('click', function(e) {
        if (this.previousValue === this.value) {
            this.checked = false;
            this.previousValue = null;
            // Trigger change event to update any dependent UI (like custom footprint)
            this.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
            // Clear previousValue for other radios in the same group
            document.querySelectorAll(`input[name="${this.name}"]`).forEach(r => r.previousValue = null);
            this.previousValue = this.value;
        }
    });
});
