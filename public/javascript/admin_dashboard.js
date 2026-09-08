// Open Modal
function openAddCandidateModal() {
    const modal = document.getElementById("candidateModal");
    if (modal) modal.style.display = "flex";
}

// Close Modal
function closeCandidateModal() {
    const modal = document.getElementById("candidateModal");
    if (modal) modal.style.display = "none";
    document.getElementById("candidateForm").reset();
}

// --- FETCH & LOAD CANDIDATES FROM DATABASE ---
async function loadCandidates() {
    const tableBody = document.getElementById("candidateTable");
    if (!tableBody) return;

    try {
        const response = await fetch('/api/admin/candidates');
        if (!response.ok) throw new Error('Failed to fetch candidates');

        const candidates = await response.json();
        tableBody.innerHTML = ""; // Clear table before rendering

        if (candidates.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No candidates found.</td></tr>`;
            return;
        }

        candidates.forEach((c) => {
            const categoryIcon = c.category === "King" ? "👑 King" : c.category === "Queen" ? "👸 Queen" : (c.category || 'Participant');
            const categoryClass = c.category ? c.category.toLowerCase() : '';
            
            const imgSrc = c.photo ? c.photo : '/uploads/default.jpg';
            const totalCandidateVotes = (c.kingVotes || 0) + (c.queenVotes || 0) + (c.votes || 0);

            // Correctly map to database column 'description' for Major
            const candidateMajor = c.description || '-';

            // 1. Main Candidate Row (Age removed, description used for Major)
            const newRow = document.createElement("tr");
            newRow.setAttribute("data-category", c.category || '');

            newRow.innerHTML = `
                <td>#${c.id}</td>
                <td>
                    <div class="candidate-info">
                        <img src="${imgSrc}" alt="${c.name}" onerror="this.src='/uploads/default.jpg'">
                        <div>
                            <strong>${c.name}</strong>
                            <small>Major: ${candidateMajor}</small>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="category ${categoryClass}">${categoryIcon}</span>
                </td>
                <td><strong>${totalCandidateVotes}</strong></td>
                <td>
                    <button class="edit-btn" onclick="toggleEditRow('${c.id}')">Edit</button>
                    <button class="delete-btn" onclick="deleteCandidate(${c.id})">Delete</button>
                </td>
            `;
            tableBody.appendChild(newRow);

            // 2. Hidden Edit Panel Row
            const editRow = document.createElement("tr");
            editRow.id = `edit-row-${c.id}`;
            editRow.className = "edit-panel-row";
            editRow.innerHTML = `
                <td colspan="5" style="padding: 0;">
                    <div class="edit-panel-content">
                        <form action="/admin/update/${c.id}?section=candidates" method="POST" enctype="multipart/form-data">
                            <h4 style="margin-bottom: 12px; color: #4b2e83; font-size: 15px;">Edit Candidate: ${c.name}</h4>
                            <div class="edit-form-grid">
                                <input type="text" name="name" value="${c.name || ''}" placeholder="Name" required />
                                <input type="file" name="photo" />
                                <input type="text" name="description" value="${candidateMajor !== '-' ? candidateMajor : ''}" placeholder="Major / Description" />
                                <select name="gender" required>
                                    <option value="boy" ${c.gender === 'boy' ? 'selected' : ''}>Boy (King)</option>
                                    <option value="girl" ${c.gender === 'girl' ? 'selected' : ''}>Girl (Queen)</option>
                                </select>
                                <input type="text" name="hobby" value="${c.hobby || ''}" placeholder="Hobby" />
                                <input type="text" name="hometown" value="${c.hometown || ''}" placeholder="Hometown" />
                                <div class="edit-actions">
                                    <button type="button" class="btn-cancel" onclick="toggleEditRow('${c.id}')">Cancel</button>
                                    <button type="submit" class="btn-save">Save Changes</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </td>
            `;
            tableBody.appendChild(editRow);
        });
    } catch (err) {
        console.error('Error loading candidates:', err);
    }
}

// --- HANDLE FORM SUBMISSION TO DATABASE ---
async function handleCandidateSubmit(event) {
    event.preventDefault();

    const form = document.getElementById('candidateForm');
    const formData = new FormData(form);

    try {
        const response = await fetch('/api/admin/candidates', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();

        if (response.ok) {
            alert(result.message || 'Candidate added successfully!');
            form.reset();
            closeCandidateModal(); 
            loadCandidates();
        } else {
            alert(result.message || 'Failed to add candidate.');
        }
    } catch (err) {
        console.error('Error submitting form:', err);
        alert('An error occurred while saving the candidate.');
    }
}

// --- DELETE CANDIDATE FROM DATABASE ---
async function deleteCandidate(id) {
    if (!confirm("Are you sure you want to delete this candidate?")) return;

    try {
        const response = await fetch(`/api/admin/candidates/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            loadCandidates();
        } else {
            alert('Failed to delete candidate.');
        }
    } catch (err) {
        console.error('Delete Error:', err);
        alert('Server connection error.');
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const headerAddBtn = document.querySelector(".page-header .add-btn");
    if (headerAddBtn) {
        headerAddBtn.addEventListener("click", openAddCandidateModal);
    }

    const urlParams = new URLSearchParams(window.location.search);
    const activeSectionUrl = urlParams.get("section");
    const savedTab = localStorage.getItem('activeAdminTab');
    
    const initialTab = activeSectionUrl || savedTab || 'dashboard';
    
    const matchingLink = document.querySelector(`.sidebar a[href="#${initialTab}-page"]`);
    if (typeof showPage === 'function') {
        showPage(initialTab, matchingLink);
    }

    loadCandidates();
});