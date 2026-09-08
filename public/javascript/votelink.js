// Hamburger menu toggle logic
function toggleMenu() {
    const navLinks = document.getElementById('nav-links');
    const menuIcon = document.getElementById('menu-icon');
    
    if (navLinks) navLinks.classList.toggle('show');
    
    if (menuIcon && navLinks) {
        if (navLinks.classList.contains('show')) {
            menuIcon.className = "ri-close-line";
        } else {
            menuIcon.className = "ri-menu-line";
        }
    }
}

// Nav links load
document.addEventListener("DOMContentLoaded", function() {
    const navbarPlaceholder = document.getElementById('navbar-placeholder');
    if (navbarPlaceholder) {
        fetch('navbar.html')
            .then(response => response.text())
            .then(data => {
                navbarPlaceholder.innerHTML = data;
            })
            .catch(error => console.error('Error loading navbar:', error));
    }
});

// ********** Candidate Selection & Validation Logic ********** //

function selectCandidate(button, category, candidateId) {
    const candidateCard = button.closest('.candidate');
    const hiddenInput = document.getElementById("input-" + category);

    if (button.classList.contains("selected")) {
        button.classList.remove("selected");
        if (hiddenInput) hiddenInput.value = "";
        return;
    }

    if (candidateCard) {
        candidateCard.querySelectorAll('.select-btn').forEach(btn => {
            if (!btn.classList.contains(category + '-btn')) {
                btn.classList.remove("selected");
            }
        });
    }

    let targetClass = "." + category + "-btn";
    document.querySelectorAll(targetClass).forEach(btn => {
        btn.classList.remove("selected");
    });

    button.classList.add("selected");
    if (hiddenInput) {
        hiddenInput.value = candidateId;
    }
    //  to show data in voted page
    if (candidateCard) {
        const nameElement = candidateCard.querySelector(".card-title");
        const idElement = candidateCard.querySelector(".candidateid");
        const imgElement = candidateCard.querySelector("img");
        
        const candidateName = nameElement ? nameElement.innerText.trim() : "";
        const candidateIdText = idElement ? idElement.innerText.trim() : candidateId;
        const candidateImg = imgElement ? imgElement.src : "";

        let storageKey = category;
        if (category === 'b-popular') storageKey = 'bPopular';
        if (category === 'g-popular') storageKey = 'gPopular';

        localStorage.setItem(storageKey + "Id", candidateIdText);
        localStorage.setItem(storageKey + "Name", candidateName);
        localStorage.setItem(storageKey + "Img", candidateImg);
    }

}

//submit btn js
async function validateAndSubmit(event) {
    event.preventDefault(); // Stop standard form submission

    const categories = ['king', 'smart', 'b-popular', 'queen', 'style', 'g-popular'];
    const error = document.getElementById("error-message");
    const form = document.getElementById("voteForm");

    for (let cat of categories) {
        const input = document.getElementById("input-" + cat);
        if (!input || !input.value || input.value.trim() === "") {
            if (error) {
                error.innerText = "Please select one candidate for all 6 categories before confirming.";
            } else {
                alert("Please select one candidate for all 6 categories before confirming.");
            }
            return false;
        }
    }

    if (error) error.innerText = "";

    try {
        const formData = new URLSearchParams(new FormData(form));
        
        const response = await fetch(form.action || '/api/vote', {
            method: 'POST',
            body: formData,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const result = await response.json();

        if (result.success) {
            // Redirect to the voted page on success
            window.location.href = '/votedpage';
        } else {
            if (error) {
                error.innerText = result.message || "Failed to submit vote.";
            }
        }
    } catch (err) {
        console.error("Error submitting vote:", err);
        if (error) {
            error.innerText = "An unexpected error occurred. Please try again.";
        }
    }

    return false;
}

// ********** View Profile Modal Box ********** //

function openModal(cardElement) {
    const modal = document.getElementById("candidateModal");
    
    const imgElement = cardElement.querySelector("img");
    const tagElement = cardElement.querySelector(".card-tag");
    const titleElement = cardElement.querySelector(".card-title");
    const idElement = cardElement.querySelector(".candidateid");

    const tagText = tagElement ? tagElement.innerText.trim().toUpperCase() : "";
    const candidateIdText = idElement ? idElement.innerText.trim() : "";
    const candidateName = titleElement ? titleElement.innerText.trim() : "";

    const majorMap = {
        "CIVIL": "Civil Engineering",
        "CEIT": "Computer Engineering and Information Technology",
        "EP": "Electrical Power Engineering",
        "EC": "Electrical Communication Engineering",
        "ME": "Mechanical Engineering",
        "AG": "Agricultural Engineering",
        "AGRI": "Agricultural Engineering",
        "ARCHI": "Architecture Engineering",
        "BT": "Biotechnology Engineering",
        "CHE": "Chemical Engineering",
        "MC": "Mechatronic Engineering",
        "NC": "Nuclear Engineering",
        "NT": "Nuclear Technology"
    };

    const fullMajor = majorMap[tagText] || tagText || "Engineering";
    const combinedIdAndMajor = `${candidateIdText} - ${fullMajor}`;

    const hobbyText = cardElement.dataset.hobby || "Coding";
    const placeText = cardElement.dataset.place || "Mandalay";

    const modalImg = document.getElementById("modal-img");
    const modalTag = document.getElementById("modal-tag");
    const modalName = document.getElementById("modal-name");
    const modalId = document.getElementById("modal-id");
    const modalHobby = document.getElementById("modal-hobby");
    const modalPlace = document.getElementById("modal-place");

    if (modalImg) modalImg.src = imgElement ? imgElement.src : "";
    if (modalTag) modalTag.innerText = tagText; 
    if (modalName) modalName.innerText = cardElement.dataset.name || candidateName;
    if (modalId) modalId.innerText = combinedIdAndMajor; 
    if (modalHobby) modalHobby.innerText = hobbyText;
    if (modalPlace) modalPlace.innerText = placeText;

    if (modal) {
        modal.style.display = "flex";
    }
}

function closeModal() {
    const modal = document.getElementById("candidateModal");
    if (modal) {
        modal.style.display = "none";
    }
}

// Close modal when clicking outside the content window
window.onclick = function(event) {
    const modal = document.getElementById("candidateModal");
    if (event.target === modal) {
        closeModal();
    }
}

// Auto-lock voting interface if user has already voted
document.addEventListener("DOMContentLoaded", function () {
    const userHasVoted = document.body.dataset.hasVoted === 'true';
    
    if (userHasVoted) {
        // 1. Show the HTML read-only warning banner if present, or create it dynamically
        const banner = document.getElementById('readOnlyBanner');
        if (banner) {
            banner.style.display = 'block';
        }

        // 2. Disable all candidate selection buttons
        const selectButtons = document.querySelectorAll('.select-btn');
        selectButtons.forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = "0.7";
            btn.style.cursor = "not-allowed";
        });

        // 3. Disable the final confirm submit button and hide submit area if needed
        const submitBtn = document.querySelector('.submit-btn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.style.background = "#94a3b8";
            submitBtn.style.cursor = "not-allowed";
            submitBtn.innerText = "Votes Already Submitted";
        }

        const submitArea = document.getElementById('submitAreaContainer');
        if (submitArea) {
            submitArea.style.display = 'none';
        }

        // 4. Fallback notification banner if 'readOnlyBanner' is missing from the HTML
        const form = document.getElementById('voteForm');
        if (form && !document.getElementById('readOnlyBanner') && !document.getElementById('voted-banner')) {
            const fallbackBanner = document.createElement('div');
            fallbackBanner.id = 'voted-banner';
            fallbackBanner.style.cssText = "background: #dcfce7; color: #166534; padding: 15px; text-align: center; border-radius: 12px; margin-bottom: 25px; font-weight: 600; border: 1px solid #bbf7d0;";
            fallbackBanner.innerHTML = '<i class="ri-checkbox-circle-line" style="font-size: 18px; vertical-align: middle; margin-right: 5px;"></i> Your votes have already been recorded successfully. This page is now in view-only mode.';
            form.insertBefore(fallbackBanner, form.firstChild);
        }
    }
});