document.addEventListener('DOMContentLoaded', function() {
    // === DOM Elementi ===
    const grid = document.getElementById('calendar-grid');
    const prevWeekBtn = document.getElementById('prev-week-btn');
    const nextWeekBtn = document.getElementById('next-week-btn');
    const currentWeekDisplay = document.getElementById('current-week-display');
    const searchInput = document.getElementById('search-input');
    
    // Elementi za modal s detaljima
    const detailsModal = document.getElementById('event-details-modal');
    const detailsModalTitle = detailsModal.querySelector('#modal-title');
    const detailsModalBody = detailsModal.querySelector('#modal-body');
    const deleteEventBtn = detailsModal.querySelector('#delete-event-btn');
    
    // Elementi za modal s formom za dodavanje
    const addEventModal = document.getElementById('add-event-modal');
    const addEventBtn = document.getElementById('add-event-btn');
    const addEventForm = document.getElementById('add-event-form');
    const cancelFormBtn = addEventModal.querySelector('.cancel-button');

    const days = ['Ponedjeljak', 'Utorak', 'Srijeda', 'Četvrtak', 'Petak'];
    
    // === Stanje Aplikacije ===
    let state = {
        year: null,
        week: null,
        events: [],       // Svi događaji za trenutni tjedan
        formData: {},     // Podaci za popunjavanje formi (grupe, nastavnici...)
        selectedEventId: null // ID događaja otvorenog u modalu
    };
    
    // === Pomoćne Funkcije za Datume ===
    function getWeekInfo(d) {
        const date = new Date(d.valueOf());
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
        const week1 = new Date(date.getFullYear(), 0, 4);
        const weekNumber = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
        return [date.getFullYear(), weekNumber];
    }
    
    function getDateFromWeek(y, w) {
        const simple = new Date(y, 0, 1 + (w - 1) * 7);
        const dow = simple.getDay();
        const isoWeekStart = simple;
        if (dow <= 4) isoWeekStart.setDate(simple.getDate() - simple.getDay() + 1);
        else isoWeekStart.setDate(simple.getDate() + 8 - simple.getDay());
        return isoWeekStart;
    }

    // === Logika Dohvaćanja i Prikazivanja Podataka ===
    
    // Glavna inicijalizacijska funkcija
    function initializeCalendar() {
        const initialYear = 2024;
        const initialWeek = 42;
        fetchAndRenderEvents(initialYear, initialWeek);
        fetchFormData();
        addEventListeners();
    }
    
    // Dohvaća podatke za popunjavanje padajućih izbornika
    function fetchFormData() {
        fetch('/api/form-data')
            .then(res => res.json())
            .then(data => {
                state.formData = data;
                populateAddFormSelects();
            })
            .catch(error => console.error("Greška pri dohvaćanju podataka za formu:", error));
    }
    
    // Dohvaća događaje za određeni tjedan i pokreće iscrtavanje
    function fetchAndRenderEvents(year, week) {
        grid.innerHTML = '<div class="loading">Učitavanje rasporeda...</div>';
        currentWeekDisplay.textContent = `Učitavanje...`;

        fetch(`/api/events?year=${year}&week=${week}`)
            .then(response => response.ok ? response.json() : Promise.reject('Mrežni odgovor nije bio u redu.'))
            .then(data => {
                if (data.error) return Promise.reject(data.error);
                
                state.year = data.year;
                state.week = data.week;
                state.events = data.events;
                
                renderCalendarGrid(data.events);
                updateWeekDisplay();
            })
            .catch(error => {
                console.error('Greška pri dohvaćanju događaja:', error);
                grid.innerHTML = `<div class="error">Greška: ${error}. Molimo pokušajte ponovno.</div>`;
                currentWeekDisplay.textContent = 'Greška';
            });
    }

    // Iscrtava cijeli kalendar na temelju dohvaćenih događaja
    function renderCalendarGrid(events) {
        grid.innerHTML = '';
        
        grid.appendChild(Object.assign(document.createElement('div'), { className: 'time-header' }));
        days.forEach(day => grid.appendChild(Object.assign(document.createElement('div'), { className: 'day-header', textContent: day })));

        for (let hour = 8; hour < 21; hour++) {
            grid.appendChild(Object.assign(document.createElement('div'), { className: 'time-label', textContent: `${hour}:00` }));
            days.forEach(day => {
                const cell = document.createElement('div');
                cell.className = 'calendar-cell';
                cell.dataset.day = day;
                cell.dataset.hour = hour;
                grid.appendChild(cell);
            });
        }

        events.forEach(event => {
            const startHour = parseInt(event.vrijeme_od.split(':')[0]);
            const targetCell = grid.querySelector(`[data-day="${event.dan}"][data-hour="${startHour}"]`);

            if (targetCell) {
                const eventDiv = document.createElement('div');
                eventDiv.className = 'event';
                eventDiv.dataset.eventId = event.id_dogadaj;
                
                eventDiv.innerHTML = `
                    <strong>${event.vrijeme_od} - ${event.vrijeme_do}</strong>
                    <span class="event-title">${event.kolegij_naziv} (${event.oblik_nastave})</span>
                    <small class="event-details">${event.dvorana_naziv} &bull; ${event.nastavnik_ime}</small>
                `;

                const startMinutes = parseInt(event.vrijeme_od.split(':')[1]);
                const endHour = parseInt(event.vrijeme_do.split(':')[0]);
                const endMinutes = parseInt(event.vrijeme_do.split(':')[1]);
                
                const durationMinutes = (endHour * 60 + endMinutes) - (startHour * 60 + startMinutes);
                const ROW_HEIGHT = 60;
                
                const height = (durationMinutes / 60) * ROW_HEIGHT; 
                const topOffset = (startMinutes / 60) * ROW_HEIGHT;

                eventDiv.style.top = `${topOffset}px`;
                eventDiv.style.height = `${height - 2}px`;
                
                targetCell.appendChild(eventDiv);
            }
        });
    }

    // Ažurira prikaz tjedna i godine u zaglavlju
    function updateWeekDisplay() {
        currentWeekDisplay.textContent = `Tjedan ${state.week}, ${state.year}.`;
    }

    // === Logika za Modale i Forme ===
    function openModal(modalElement) {
        modalElement.style.display = 'flex';
        setTimeout(() => modalElement.classList.add('visible'), 10);
    }

    function closeModal(modalElement) {
        modalElement.classList.remove('visible');
        setTimeout(() => {
            modalElement.style.display = 'none';
            if(modalElement === addEventModal) addEventForm.reset(); // Resetiraj formu kod zatvaranja
        }, 300);
    }

    function showDetailsModal(eventId) {
        const event = state.events.find(e => e.id_dogadaj === eventId);
        if (!event) return;
        state.selectedEventId = eventId;
        
        detailsModalTitle.textContent = event.kolegij_naziv;
        detailsModalBody.innerHTML = `
            <p><strong>Vrijeme:</strong> ${event.vrijeme_od} - ${event.vrijeme_do}</p>
            <p><strong>Dan:</strong> ${event.dan}</p>
            <p><strong>Nastavnik:</strong> ${event.nastavnik_ime}</p>
            <p><strong>Dvorana:</strong> ${event.dvorana_naziv}</p>
            <p><strong>Grupa:</strong> ${event.grupa_naziv}</p>
            <p><strong>Oblik nastave:</strong> ${event.oblik_nastave}</p>
        `;
        openModal(detailsModal);
    }

    function populateAddFormSelects() {
        const selects = {
            'grupe': addEventForm.querySelector('#grupa'),
            'nastavnici': addEventForm.querySelector('#nastavnik'),
            'dvorane': addEventForm.querySelector('#dvorana'),
        };

        for (const key in selects) {
            const selectEl = selects[key];
            selectEl.innerHTML = '<option value="">Odaberite...</option>';
            state.formData[key]?.forEach(item => {
                const option = document.createElement('option');
                option.value = item[Object.keys(item)[0]]; 
                option.textContent = item[Object.keys(item)[1]];
                selectEl.appendChild(option);
            });
        }
        
        const danSelect = addEventForm.querySelector('#dan');
        danSelect.innerHTML = '';
        days.forEach(dan => danSelect.add(new Option(dan, dan)));
        
        addEventForm.querySelector('#br_tjedna').value = state.week;
    }
    
    // === Rukovanje Događajima (Event Handlers) ===
    function handleSearch(event) {
        const searchTerm = event.target.value.toLowerCase().trim();
        const allEventDivs = grid.querySelectorAll('.event');

        allEventDivs.forEach(eventDiv => {
            const eventId = parseInt(eventDiv.dataset.eventId, 10);
            const eventData = state.events.find(e => e.id_dogadaj === eventId);

            if (eventData) {
                const eventText = [
                    eventData.kolegij_naziv,
                    eventData.nastavnik_ime,
                    eventData.dvorana_naziv,
                    eventData.grupa_naziv
                ].join(' ').toLowerCase();

                eventDiv.classList.toggle('hidden', !eventText.includes(searchTerm));
            }
        });
    }

    async function handleAddFormSubmit(event) {
        event.preventDefault();
        const formData = new FormData(addEventForm);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/api/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Greška na serveru.');
            
            closeModal(addEventModal);
            fetchAndRenderEvents(state.year, state.week);
            alert('Događaj je uspješno dodan!');

        } catch (error) {
            console.error('Greška pri dodavanju događaja:', error);
            alert(`Greška: ${error.message}`);
        }
    }

    async function handleDeleteEvent() {
        if (!state.selectedEventId) return;

        if (confirm('Jeste li sigurni da želite obrisati ovaj događaj?')) {
            try {
                const response = await fetch(`/api/events/${state.selectedEventId}`, { method: 'DELETE' });

                const result = await response.json();
                if (!response.ok) throw new Error(result.error || 'Greška na serveru.');
                
                closeModal(detailsModal);
                
                const eventToRemove = grid.querySelector(`.event[data-event-id="${state.selectedEventId}"]`);
                if(eventToRemove) eventToRemove.remove();
                
                state.events = state.events.filter(e => e.id_dogadaj !== state.selectedEventId);
                state.selectedEventId = null;

                alert('Događaj je uspješno obrisan.');

            } catch (error) {
                console.error('Greška pri brisanju događaja:', error);
                alert(`Greška: ${error.message}`);
            }
        }
    }
    
    // Centralizirano dodavanje Event Listenera
    function addEventListeners() {
        prevWeekBtn.addEventListener('click', () => {
            const currentDate = getDateFromWeek(state.year, state.week);
            currentDate.setDate(currentDate.getDate() - 7);
            const [newYear, newWeek] = getWeekInfo(currentDate);
            fetchAndRenderEvents(newYear, newWeek);
        });

        nextWeekBtn.addEventListener('click', () => {
            const currentDate = getDateFromWeek(state.year, state.week);
            currentDate.setDate(currentDate.getDate() + 7);
            const [newYear, newWeek] = getWeekInfo(currentDate);
            fetchAndRenderEvents(newYear, newWeek);
        });
        
        grid.addEventListener('click', e => {
            const eventDiv = e.target.closest('.event');
            if (eventDiv) showDetailsModal(parseInt(eventDiv.dataset.eventId, 10));
        });

        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.addEventListener('click', e => {
                if (e.target === modal) closeModal(modal);
            });
        });
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', e => closeModal(btn.closest('.modal-overlay')));
        });

        addEventBtn.addEventListener('click', () => {
            addEventForm.querySelector('#br_tjedna').value = state.week; // Postavi trenutni tjedan
            openModal(addEventModal);
        });
        addEventForm.addEventListener('submit', handleAddFormSubmit);
        cancelFormBtn.addEventListener('click', () => closeModal(addEventModal));
        deleteEventBtn.addEventListener('click', handleDeleteEvent);
        
        searchInput.addEventListener('input', handleSearch);
    }
    
    // Pokreni sve!
    initializeCalendar();
});
