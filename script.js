// script.js - Main script for interactive body fitness application

// Interactive body zone clicking
document.querySelectorAll('.body-zone').forEach(zone => {
    zone.addEventListener('click', function() {
        // Highlight the clicked zone and display related ailments
        this.classList.toggle('active');
        displayAilments(this.dataset.zone);
    });
});

// Show fallback SVG silhouette if Vitruvian Man image fails to load
const vitruvianImg = document.getElementById('vitruvian-img');
if (vitruvianImg) {
    vitruvianImg.addEventListener('error', function() {
        this.style.display = 'none';
        const fallback = document.querySelector('.body-fallback');
        if (fallback) {
            fallback.style.display = 'flex';
        }
    });
}

// Admin panel functionality
const adminPanelToggle = document.getElementById('admin-panel-toggle');
if (adminPanelToggle) {
    adminPanelToggle.addEventListener('click', function() {
        document.getElementById('admin-panel').classList.toggle('visible');
    });
}

// Function to add custom ailments
function addCustomAilment(ailment) {
    // Logic to add ailments to some database or state
    console.log(`Custom ailment added: ${ailment}`);
}

// Integration with Playbook.io
function fetchWorkouts() {
    // Logic for fetching workouts from Playbook.io
    console.log('Fetching workouts...');
}

// Save healing map state
function saveHealingMapState(state) {
    localStorage.setItem('healingMapState', JSON.stringify(state));
}

// Sharing features
function shareOnSocialMedia(platform) {
    const url = window.location.href;
    // Logic to share content on selected platform
    console.log(`Sharing on ${platform}: ${url}`);
}

// Initialize functions on page load
document.addEventListener('DOMContentLoaded', () => {
    fetchWorkouts();
    // Load saved state if exists
    const savedState = localStorage.getItem('healingMapState');
    if (savedState) {
        // Restore the saved map state
        console.log('Restoring saved healing map state');
    }
});