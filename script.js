// Configuration
const COMPLAINTS_KEY = 'resolveit_complaints';
const GEMINI_API_KEY = "AIzaSyD-CDJyAxI8poLhwiWRS_QzQSVI6F9FtUM"; // User will replace this

// Utility functions
const getComplaints = () => {
    const data = localStorage.getItem(COMPLAINTS_KEY);
    return data ? JSON.parse(data) : [];
};

const saveComplaint = (complaint) => {
    const complaints = getComplaints();
    complaints.unshift(complaint); // Add to the beginning
    localStorage.setItem(COMPLAINTS_KEY, JSON.stringify(complaints));
};

const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
};

const showToast = () => {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
};

// Form handling (add-complaint.html)
const complaintForm = document.getElementById('complaintForm');
const btnGenerateQuestion = document.getElementById('btnGenerateQuestion');
const btnSubmitComplaint = document.getElementById('btnSubmitComplaint');
const aiSection = document.getElementById('aiSection');
const aiQuestionText = document.getElementById('aiQuestionText');
const aiAnswerInput = document.getElementById('aiAnswer');

let currentAIQuestion = '';

if (btnGenerateQuestion) {
    btnGenerateQuestion.addEventListener('click', async () => {
        const name = document.getElementById('name').value.trim();
        const city = document.getElementById('city').value.trim();
        const mobile = document.getElementById('mobile').value.trim();
        const complaintText = document.getElementById('complaintText').value.trim();

        // Basic validation before generating question
        if (!name || !city || !mobile || !complaintText) {
            if (complaintForm && !complaintForm.checkValidity()) {
                complaintForm.reportValidity();
                return;
            }
            alert('Please fill out all fields first.');
            return;
        }

        btnGenerateQuestion.disabled = true;
        btnGenerateQuestion.textContent = 'Generating...';

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Based on the following complaint, ask exactly ONE brief, specific follow-up question to get more necessary details. Keep it under 2 sentences. Complaint: "${complaintText}"`
                        }]
                    }]
                })
            });

            if (!response.ok) {
                throw new Error('API Request failed');
            }

            const data = await response.json();
            const question = data.candidates[0].content.parts[0].text.trim();

            currentAIQuestion = question;
            aiQuestionText.textContent = question;

            // UI updates
            aiSection.style.display = 'block';
            btnGenerateQuestion.style.display = 'none';
            btnSubmitComplaint.style.display = 'block';

            // Scroll to AI section
            aiSection.scrollIntoView({ behavior: 'smooth', block: 'end' });

        } catch (error) {
            console.error('Error generating question:', error);
            alert('Failed to generate AI question. Please check your API key and try again.');
            btnGenerateQuestion.disabled = false;
            btnGenerateQuestion.textContent = 'Generate Follow-up Question';
        }
    });
}

if (complaintForm) {
    complaintForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Gather data
        const name = document.getElementById('name').value.trim();
        const city = document.getElementById('city').value.trim();
        const mobile = document.getElementById('mobile').value.trim();
        const complaintText = document.getElementById('complaintText').value.trim();
        const aiAnswer = aiAnswerInput ? aiAnswerInput.value.trim() : '';

        if (!name || !city || !mobile || !complaintText) {
            alert('Please fill out all fields.');
            return;
        }

        if (currentAIQuestion && !aiAnswer) {
            alert('Please provide an answer to the AI follow-up question.');
            return;
        }

        const newComplaint = {
            id: Date.now().toString(),
            name,
            city,
            mobile,
            complaintText,
            aiQuestion: currentAIQuestion,
            aiAnswer: aiAnswer,
            timestamp: new Date().toISOString()
        };

        // Save and reset
        saveComplaint(newComplaint);
        complaintForm.reset();

        // Show success notification
        showToast();

        // Redirect to homepage after a short delay
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
    });
}

// Listing handling (index.html)
const complaintsContainer = document.getElementById('complaintsContainer');
if (complaintsContainer) {
    const renderComplaints = () => {
        const complaints = getComplaints();

        if (complaints.length === 0) {
            complaintsContainer.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <div class="empty-icon">📂</div>
                    <h3>No Complaints Found</h3>
                    <p style="color: var(--text-muted); margin-top: 0.5rem; margin-bottom: 1.5rem;">There are no complaints registered yet.</p>
                    <a href="add-complaint.html" class="btn-primary">Register the first complaint</a>
                </div>
            `;
            return;
        }

        complaintsContainer.innerHTML = complaints.map(c => `
            <div class="complaint-card">
                <div class="complaint-header">
                    <div>
                        <div class="complaint-user">${c.name}</div>
                        <div style="font-size: 0.875rem; color: var(--text-muted); margin-top: 0.25rem;">
                            📍 ${c.city} &nbsp;|&nbsp; 📞 ${c.mobile}
                        </div>
                    </div>
                    <div class="complaint-meta">
                        <span>🕒 ${formatDate(c.timestamp)}</span>
                    </div>
                </div>
                <div class="complaint-body">
                    ${c.complaintText.replace(/\n/g, '<br>')}
                </div>
                ${c.aiQuestion ? `
                <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px dashed var(--border-color);">
                    <div style="color: var(--primary-color); font-weight: 500; font-size: 0.9rem; margin-bottom: 0.5rem;">🤖 AI Follow-up:</div>
                    <div style="font-style: italic; margin-bottom: 0.5rem; color: var(--text-color);">Q: ${c.aiQuestion}</div>
                    <div style="color: var(--text-color);"><strong>A:</strong> ${c.aiAnswer || '<em>No answer provided</em>'}</div>
                </div>
                ` : ''}
            </div>
        `).join('');
    };

    renderComplaints();
}
