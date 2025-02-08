let eventState = {
    attendees: [],
    selectedVenue: null,
    dateTime: null,
    events: [],
    eventName: "",
    eventType: "",
    currentUser: null
};

document.addEventListener('DOMContentLoaded', function () {
    const itineraryList = document.getElementById('itineraryList');
    itineraryList.innerHTML = '';
    eventState.currentUser = null;


    document.getElementById('addAttendeeBtn').addEventListener('click', addAttendee);
    document.getElementById('attendeeInput').addEventListener('keypress', e => {
        if (e.key === 'Enter') addAttendee();
    });
    document.getElementById('searchVenueBtn').addEventListener('click', searchVenue);
    document.getElementById('venueSearchInput').addEventListener('keypress', e => {
        if (e.key === 'Enter') searchVenue();
    });
    document.getElementById('eventDateTime').addEventListener('change', e => {
        eventState.dateTime = e.target.value;
    });
    document.getElementById('createEventBtn').addEventListener('click', () => {
        if (!isEventDataComplete()) {
            alert('Please complete all required information:\n' +
                  `${eventState.attendees.length === 0 ? '- Add attendees\n' : ''}` +
                  `${!eventState.selectedVenue ? '- Select a venue\n' : ''}` +
                  `${!eventState.dateTime ? '- Select date and time' : ''}`);
            return;
        }
        updateItinerary();
    });
    document.querySelector('a[href="#venueSearch"]').addEventListener('click', openLoginModal);
    document.querySelector('a[href="#attendees"]').addEventListener('click', openFaqModal);

    ['eventName', 'eventType', 'eventDateTime'].forEach(id => {
        document.getElementById(id).addEventListener(
            id === 'eventDateTime' ? 'change' : 'input', 
            saveProgress
        );
    });
});

function addAttendee() {
    const attendeeInput = document.getElementById('attendeeInput');
    const attendeeName = attendeeInput.value.trim();
    const attendeeList = document.getElementById('attendeeList');

    if (!attendeeName) {
        alert('Please enter an attendee name');
        return;
    }

    const li = document.createElement('li');
    li.className = 'new-item';
    li.innerHTML = `
        <span>${attendeeName}</span>
        <button style="background-color: #f43f5e; padding: 8px 12px">
            <i class="fas fa-trash"></i>
        </button>
    `;

    li.querySelector('button').onclick = () => {
        li.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => {
            li.remove();
            eventState.attendees = Array.from(attendeeList.querySelectorAll('span'))
                .map(span => span.textContent);
        }, 300);
    };

    attendeeList.appendChild(li);
    eventState.attendees.push(attendeeName);
    attendeeInput.value = '';
    saveProgress();
}

async function searchVenue() {
    const query = document.getElementById('venueSearchInput').value.trim();
    const venueList = document.getElementById('venueList');
    venueList.innerHTML = '';

    if (!query) {
        alert('Please enter a location to search.');
        return;
    }

    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (data.length === 0) {
            alert('No results found.');
            return;
        }

        data.forEach(venue => {
            const li = document.createElement('li');
            li.className = 'new-item';
            li.innerHTML = `
                <span><i class="fas fa-map-marker-alt"></i> ${venue.display_name}</span>
                <button class="selectVenueBtn" data-name="${venue.display_name}">
                    <i class="fas fa-check"></i> Select
                </button>
            `;
            venueList.appendChild(li);
        });

        document.querySelectorAll('.selectVenueBtn').forEach(button => {
            button.addEventListener('click', () => selectVenue(button.dataset.name));
        });

    } catch (error) {
        alert('Error fetching venue data. Please try again.');
        console.error('API Error:', error);
    }
}

function selectVenue(venueName) {
    eventState.selectedVenue = venueName;
    const venueList = document.getElementById('venueList');
    venueList.querySelectorAll('button').forEach(btn => {
        btn.style.backgroundColor = btn.dataset.name === venueName ? '#f78a5c' : '#437590';
    });
    alert(`Venue "${venueName}" has been selected`);
    saveProgress();
}

function updateItinerary() {
    if (!eventState.currentUser) {
        alert('Please log in first to create events.');
        openLoginModal();
        return;
    }

    const eventName = document.getElementById('eventName').value.trim();
    const eventType = document.getElementById('eventType').value.trim();

    if (!eventName || !eventType) {
        alert('Please enter an event name and select an event type.');
        return;
    }

    const eventDate = new Date(eventState.dateTime);
    const formattedDateTime = eventDate.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const newEvent = {
        name: eventName,
        type: eventType,
        venue: eventState.selectedVenue,
        dateTime: formattedDateTime,
        attendees: [...eventState.attendees]
    };

    eventState.events.push(newEvent);
    localStorage.setItem(eventState.currentUser, JSON.stringify(eventState));
    renderEvent(newEvent);
    showToast("Event added to itinerary!");
}

function renderEvent(event) {
    const itineraryList = document.getElementById('itineraryList');
    const itineraryContent = document.createElement('div');
    itineraryContent.className = 'itinerary-item new-item';
    itineraryContent.innerHTML = `
        <h3><i class="fas fa-calendar-check"></i> Event Details</h3>
        <p><strong><i class="fas fa-clipboard-list"></i> Event Name:</strong> ${event.name}</p>
        <p><strong><i class="fas fa-tag"></i> Event Type:</strong> ${event.type}</p>
        <p><strong><i class="fas fa-map-marker-alt"></i> Venue:</strong> ${event.venue}</p>
        <p><strong><i class="far fa-clock"></i> Date & Time:</strong> ${event.dateTime}</p>
        <p><strong><i class="fas fa-users"></i> Attendees (${event.attendees.length}):</strong></p>
        <ul class="itinerary-attendees">
            ${event.attendees.map(attendee => `<li>${attendee}</li>`).join('')}
        </ul>
    `;
    itineraryList.appendChild(itineraryContent);
}

function renderItinerary() {
    const itineraryList = document.getElementById('itineraryList');
    itineraryList.innerHTML = '';
    
    if (eventState.currentUser && eventState.events?.length > 0) {
        eventState.events.forEach(renderEvent);
    }
}

function loginUser() {
    const email = document.getElementById('username').value.trim();
    if (!email) {
        alert("Please enter an email to log in.");
        return;
    }
    
    const username = email.split('@')[0];

    const savedData = localStorage.getItem(email);
    if (savedData) {
        eventState = JSON.parse(savedData);
        eventState.currentUser = email;
        restoreUserProgress();
        alert("Welcome back! Your progress has been restored.");
    } else {
        eventState = {
            attendees: [],
            selectedVenue: null,
            dateTime: null,
            events: [],
            eventName: "",
            eventType: "",
            currentUser: email
        };
        alert("New user detected! Your progress will be saved as you go.");
    }

    const loginLink = document.querySelector('a[href="#venueSearch"]');
    loginLink.innerHTML = `<i class="fas fa-user"></i> ${username}`;
    closeLoginModal();
    renderItinerary();
}
function isEventDataComplete() {
    return eventState.attendees.length > 0 && 
           eventState.selectedVenue && 
           eventState.dateTime;
}

function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast show";
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function saveProgress() {
    if (!eventState.currentUser) return;

    eventState.eventName = document.getElementById('eventName').value.trim();
    eventState.eventType = document.getElementById('eventType').value.trim();
    eventState.dateTime = document.getElementById('eventDateTime').value;
    localStorage.setItem(eventState.currentUser, JSON.stringify(eventState));
}

function restoreUserProgress() {
    document.getElementById('eventName').value = eventState.eventName || '';
    document.getElementById('eventType').value = eventState.eventType || '';
    document.getElementById('eventDateTime').value = eventState.dateTime || '';
    
    const attendeeList = document.getElementById('attendeeList');
    const venueList = document.getElementById('venueList');
    
    attendeeList.innerHTML = '';
    eventState.attendees.forEach(attendee => {
        const li = document.createElement('li');
        li.textContent = attendee;
        attendeeList.appendChild(li);
    });

    venueList.innerHTML = eventState.selectedVenue ? `<li>${eventState.selectedVenue}</li>` : '';
}

function openLoginModal() {
    document.getElementById('loginModal').style.display = 'block';
}

function closeLoginModal() {
    document.getElementById('loginModal').style.display = 'none';
}

function openFaqModal() {
    document.getElementById('faqModal').style.display = 'block';
}

function closeFaqModal() {
    document.getElementById('faqModal').style.display = 'none';
}

function toggleFaq(id) {
    const faq = document.getElementById(`faq${id}`);
    faq.style.display = faq.style.display === 'block' ? 'none' : 'block';
}




document.addEventListener('DOMContentLoaded', function() {
    let slides = document.querySelectorAll('.slide');
    let currentSlide = 0;
    
    function showSlide(n) {
        slides.forEach(slide => slide.classList.remove('active'));
        currentSlide = (n + slides.length) % slides.length;
        slides[currentSlide].classList.add('active');
    }
    
    function nextSlide() {
        showSlide(currentSlide + 1);
    }
    
    function previousSlide() {
        showSlide(currentSlide - 1);
    }

    document.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowRight') nextSlide();
        if (e.key === 'ArrowLeft') previousSlide();
    });
});
