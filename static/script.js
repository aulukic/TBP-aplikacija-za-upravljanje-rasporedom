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
    const editEventBtn = detailsModal.querySelector('#edit-event-btn');
    const deleteEventBtn = detailsModal.querySelector('#delete-event-btn');
    
    // Elementi za modal s formom za dodavanje/uređivanje
    const addEventModal = document.getElementById('add-event-modal');
    const addEventBtn = document.getElementById('add-event-btn');
    const addEventForm = document.getElementById('add-event-form');
    const formTitle = addEventModal.querySelector('#form-title');
    const formSubmitBtn = addEventModal.querySelector('#form-submit-btn');
    const cancelFormBtn = addEventModal.querySelector('.cancel-button');

    const days = ['Ponedjeljak', 'Utorak', 'Srijeda', 'Četvrtak', 'Petak'];
    
    // === Stanje Aplikacije ===
    let state = {
        year: null,
        week: null,
        events: [],
        formData: {},
        selectedEventId: null, // ID događaja otvorenog u details modalu
        editModeEventId: null  // ID događaja koji se trenutno uređuje
    };
    
    // === Pomoćne Funkcije za Datume (nepromijenjene) ===
    function getWeekInfo(d) {
        const date = new Date(d.valueOf());
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
        const week1 = new Date(date.getFullYear(), 0, 4);
        return [date.getFullYear(), 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7)];
    }
    
    function getDateFromWeek(y, w) {
        const simple = new Date(y, 0, 1 + (w - 1) * 7);
        const dow = simple.getDay();
        const isoWeekStart = simple;
        if (dow <= 4) isoWeekStart.setDate(simple.getDate() - simple.getDay() + 1);
        else isoWeekStart.setDate(simple.getDate() + 8 - simple.getDay());
        return isoWeekStart;
    }

    // === Logika Dohvaćanja i Prikazivanja Podataka (uglavnom nepromijenjeno) ===
    function initializeCalendar() {
        fetchAndRenderEvents(2024, 42); // Početni prikaz
        fetchFormData();
        addEventListeners();
    }
    
    function fetchFormData() {
        fetch('/api/form-data').then(res => res.json()).then(data => {
            state.formData = data;
            populateAddFormSelects();
        }).catch(err => console.error("Greška pri dohvaćanju podataka za formu:", err));
    }
    
    function fetchAndRenderEvents(year, week) {
        grid.innerHTML = '<div class="loading">Učitavanje rasporeda...</div>';
        currentWeekDisplay.textContent = `Učitavanje...`;
        fetch(`/api/events?year=${year}&week=${week}`)
            .then(res => res.ok ? res.json() : Promise.reject('Mrežni odgovor nije bio u redu.'))
            .then(data => {
                if (data.error) return Promise.reject(data.error);
                state.year = data.year;
                state.week = data.week;
                state.events = data.events;
                renderCalendarGrid(data.events);
                updateWeekDisplay();
            }).catch(err => {
                grid.innerHTML = `<div class="error">Greška: ${err}. Molimo pokušajte ponovno.</div>`;
                currentWeekDisplay.textContent = 'Greška';
            });
    }

    function renderCalendarGrid(events) {
        grid.innerHTML = '';
        grid.appendChild(Object.assign(document.createElement('div'), { className: 'time-header' }));
        days.forEach(day => grid.appendChild(Object.assign(document.createElement('div'), { className: 'day-header', textContent: day })));
        for (let hour = 8; hour < 21; hour++) {
            grid.appendChild(Object.assign(document.createElement('div'), { className: 'time-label', textContent: `${hour}:00` }));
            days.forEach(day => grid.appendChild(Object.assign(document.createElement('div'), { className: 'calendar-cell', dataset: { day, hour } })));
        }
        events.forEach(event => {
            const startHour = parseInt(event.vrijeme_od.split(':')[0]);
            const targetCell = grid.querySelector(`[data-day="${event.dan}"][data-hour="${startHour}"]`);
            if (!targetCell) return;
            const eventDiv = document.createElement('div');
            eventDiv.className = 'event';
            eventDiv.dataset.eventId = event.id_dogadaj;
            eventDiv.innerHTML = `<strong>${event.vrijeme_od} - ${event.vrijeme_do}</strong><span class="event-title">${event.kolegij_naziv} (${event.oblik_nastave})</span><small class="event-details">${event.dvorana_naziv} &bull; ${event.nastavnik_ime}</small>`;
            const startMinutes = parseInt(event.vrijeme_od.split(':')[1]);
            const endMinutes = (parseInt(event.vrijeme_do.split(':')[0]) * 60 + parseInt(event.vrijeme_do.split(':')[1])) - (startHour * 60 + startMinutes);
            eventDiv.style.top = `${(startMinutes / 60) * 60}px`;
            eventDiv.style.height = `${(endMinutes / 60) * 60 - 2}px`;
            targetCell.appendChild(eventDiv);
        });
    }

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
            if (modalElement === addEventModal) {
                addEventForm.reset();
                state.editModeEventId = null; // Resetiraj mod uređivanja
            }
        }, 300);
    }

    function showDetailsModal(eventId) {
        const event = state.events.find(e => e.id_dogadaj === eventId);
        if (!event) return;
        state.selectedEventId = eventId;
        detailsModalTitle.textContent = event.kolegij_naziv;
        detailsModalBody.innerHTML = `<p><strong>Vrijeme:</strong> ${event.vrijeme_od} - ${event.vrijeme_do}</p><p><strong>Dan:</strong> ${event.dan}</p><p><strong>Nastavnik:</strong> ${event.nastavnik_ime}</p><p><strong>Dvorana:</strong> ${event.dvorana_naziv}</p><p><strong>Grupa:</strong> ${event.grupa_naziv}</p><p><strong>Oblik nastave:</strong> ${event.oblik_nastave}</p>`;
        openModal(detailsModal);
    }

    function populateAddFormSelects() {
        const selects = { grupe: '#grupa', nastavnici: '#nastavnik', dvorane: '#dvorana' };
        for (const key in selects) {
            const selectEl = addEventForm.querySelector(selects[key]);
            selectEl.innerHTML = '<option value="">Odaberite...</option>';
            state.formData[key]?.forEach(item => {
                selectEl.add(new Option(item[Object.keys(item)[1]], item[Object.keys(item)[0]]));
            });
        }
        const danSelect = addEventForm.querySelector('#dan');
        danSelect.innerHTML = '';
        days.forEach(dan => danSelect.add(new Option(dan, dan)));
    }

    // NOVO: Otvara formu za dodavanje ILI uređivanje
    function openAddEditModal(eventId = null) {
        addEventForm.reset();
        state.editModeEventId = eventId;

        if (eventId) { // Mod za uređivanje
            const event = state.events.find(e => e.id_dogadaj === eventId);
            if (!event) return;
            formTitle.textContent = 'Uredi događaj';
            formSubmitBtn.textContent = 'Spremi promjene';
            // Popuni formu s postojećim podacima
            addEventForm.querySelector('#grupa').value = event.id_grupa_fk;
            addEventForm.querySelector('#nastavnik').value = event.id_nastavnik_fk;
            addEventForm.querySelector('#dvorana').value = event.id_dvorana_fk;
            addEventForm.querySelector('#dan').value = event.dan;
            addEventForm.querySelector('#br_tjedna').value = event.br_tjedna;
            addEventForm.querySelector('#vrijeme_od').value = event.vrijeme_od;
            addEventForm.querySelector('#vrijeme_do').value = event.vrijeme_do;
            addEventForm.querySelector('#oblik_nastave').value = event.oblik_nastave;
        } else { // Mod za dodavanje
            formTitle.textContent = 'Dodaj novi događaj';
            formSubmitBtn.textContent = 'Spremi događaj';
            addEventForm.querySelector('#br_tjedna').value = state.week;
        }
        openModal(addEventModal);
    }
    
    // === Rukovanje Događajima (Event Handlers) ===
    function handleSearch(event) {
        const searchTerm = event.target.value.toLowerCase().trim();
        grid.querySelectorAll('.event').forEach(eventDiv => {
            const eventData = state.events.find(e => e.id_dogadaj === parseInt(eventDiv.dataset.eventId));
            if (eventData) {
                const eventText = [eventData.kolegij_naziv, eventData.nastavnik_ime, eventData.dvorana_naziv, eventData.grupa_naziv].join(' ').toLowerCase();
                eventDiv.classList.toggle('hidden', !eventText.includes(searchTerm));
            }
        });
    }

    // NOVO: Jedna funkcija za slanje forme (i dodavanje i uređivanje)
    async function handleAddEditFormSubmit(event) {
        event.preventDefault();
        const formData = new FormData(addEventForm);
        const data = Object.fromEntries(formData.entries());

        const isEditMode = state.editModeEventId !== null;
        const url = isEditMode ? `/api/events/${state.editModeEventId}` : '/api/events';
        const method = isEditMode ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Greška na serveru.');
            
            closeModal(addEventModal);
            fetchAndRenderEvents(state.year, state.week); // Uvijek osvježi prikaz
            alert(result.message);

        } catch (error) {
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
                fetchAndRenderEvents(state.year, state.week); // Osvježi prikaz
                alert(result.message);
            } catch (error) {
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

        document.querySelectorAll('.modal-overlay').forEach(m => m.addEventListener('click', e => e.target === m && closeModal(m)));
        document.querySelectorAll('.modal-close').forEach(b => b.addEventListener('click', e => closeModal(b.closest('.modal-overlay'))));

        addEventBtn.addEventListener('click', () => openAddEditModal()); // Otvara formu za dodavanje
        addEventForm.addEventListener('submit', handleAddEditFormSubmit); // Listener za slanje forme
        cancelFormBtn.addEventListener('click', () => closeModal(addEventModal));
        
        editEventBtn.addEventListener('click', () => { // NOVO: Pokreće mod za uređivanje
            closeModal(detailsModal);
            openAddEditModal(state.selectedEventId);
        });
        
        deleteEventBtn.addEventListener('click', handleDeleteEvent);
        searchInput.addEventListener('input', handleSearch);
    }
    
    // Pokreni sve!
    initializeCalendar();
});
