document.addEventListener('DOMContentLoaded', function() {
    const grid = document.getElementById('calendar-grid');
    const prevWeekBtn = document.getElementById('prev-week-btn');
    const nextWeekBtn = document.getElementById('next-week-btn');
    const currentWeekDisplay = document.getElementById('current-week-display');

    // Dani u tjednu za zaglavlja i mapiranje
    const days = ['Ponedjeljak', 'Utorak', 'Srijeda', 'Četvrtak', 'Petak'];
    
    // Stanje koje prati trenutno prikazanu godinu i tjedan
    let state = {
        year: null,
        week: null,
    };

    /**
     * Pomoćna funkcija za dobivanje ISO broja tjedna iz datuma.
     * @param {Date} d Datum
     * @returns {Array<number>} Niz koji sadrži [godinu, broj tjedna]
     */
    function getWeekInfo(d) {
        const date = new Date(d.valueOf());
        date.setHours(0, 0, 0, 0);
        // Četvrtak u trenutnom tjednu određuje ISO tjedan
        date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
        const week1 = new Date(date.getFullYear(), 0, 4);
        const weekNumber = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
        return [date.getFullYear(), weekNumber];
    }
    
    /**
     * Pomoćna funkcija za dobivanje datuma iz godine i broja tjedna.
     * @param {number} y Godina
     * @param {number} w Broj tjedna
     * @returns {Date} Datum koji predstavlja ponedjeljak u tom tjednu
     */
    function getDateFromWeek(y, w) {
        const simple = new Date(y, 0, 1 + (w - 1) * 7);
        const dow = simple.getDay();
        const isoWeekStart = simple;
        if (dow <= 4)
            isoWeekStart.setDate(simple.getDate() - simple.getDay() + 1);
        else
            isoWeekStart.setDate(simple.getDate() + 8 - simple.getDay());
        return isoWeekStart;
    }

    /**
     * Inicijalizira kalendar dohvaćanjem podataka za trenutni tjedan.
     */
    function initializeCalendar() {
        // Postavimo tjedan na fiksnu vrijednost za demonstraciju s podacima
        // koje smo unijeli (tjedni 42 i 43). U produkciji bi se koristio trenutni datum.
        // const [initialYear, initialWeek] = getWeekInfo(new Date());
        const initialYear = 2024;
        const initialWeek = 42;
        fetchAndRenderEvents(initialYear, initialWeek);
    }

    /**
     * Dohvaća događaje s backenda za zadanu godinu i tjedan te ih iscrtava.
     * @param {number} year Godina
     * @param {number} week Broj tjedna
     */
    function fetchAndRenderEvents(year, week) {
        // Prikazujemo loading stanje
        grid.innerHTML = '<div class="loading">Učitavanje rasporeda...</div>';
        currentWeekDisplay.textContent = `Učitavanje...`;

        fetch(`/api/events?year=${year}&week=${week}`)
            .then(response => {
                if (!response.ok) throw new Error('Mrežni odgovor nije bio u redu.');
                return response.json();
            })
            .then(data => {
                if (data.error) throw new Error(data.error);
                
                state.year = data.year;
                state.week = data.week;
                renderCalendar(data.events);
                updateWeekDisplay();
            })
            .catch(error => {
                console.error('Greška pri dohvaćanju događaja:', error);
                grid.innerHTML = `<div class="error">Greška: ${error.message}. Molimo pokušajte ponovno.</div>`;
                currentWeekDisplay.textContent = 'Greška';
            });
    }

    /**
     * Iscrtava cijelu mrežu kalendara, uključujući zaglavlja, sate i događaje.
     * @param {Array} events Niz objekata koji predstavljaju događaje.
     */
    function renderCalendar(events) {
        grid.innerHTML = '';
        
        // 1. Kreiraj zaglavlje za vrijeme i dane
        grid.appendChild(Object.assign(document.createElement('div'), { className: 'time-header' }));
        days.forEach(day => grid.appendChild(Object.assign(document.createElement('div'), { className: 'day-header', textContent: day })));

        // 2. Kreiraj redove za sate (od 8 do 20h) i ćelije
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

        // 3. Prikaži svaki događaj na gridu
        events.forEach(event => {
            const startHour = parseInt(event.vrijeme_od.split(':')[0]);
            
            // Pronađi odgovarajuću ćeliju za početak događaja
            const targetCell = grid.querySelector(`[data-day="${event.dan}"][data-hour="${startHour}"]`);

            if (targetCell) {
                const eventDiv = document.createElement('div');
                eventDiv.className = 'event';
                
                eventDiv.innerHTML = `
                    <strong>${event.vrijeme_od} - ${event.vrijeme_do}</strong>
                    <span class="event-title">${event.kolegij_naziv} (${event.oblik_nastave})</span>
                    <small class="event-details">${event.dvorana_naziv} &bull; ${event.nastavnik_ime}</small>
                `;

                const startMinutes = parseInt(event.vrijeme_od.split(':')[1]);
                const endHour = parseInt(event.vrijeme_do.split(':')[0]);
                const endMinutes = parseInt(event.vrijeme_do.split(':')[1]);
                
                const durationMinutes = (endHour * 60 + endMinutes) - (startHour * 60 + startMinutes);
                const ROW_HEIGHT = 60; // Visina jednog sata u px
                
                const height = (durationMinutes / 60) * ROW_HEIGHT; 
                const topOffset = (startMinutes / 60) * ROW_HEIGHT;

                eventDiv.style.top = `${topOffset}px`;
                eventDiv.style.height = `${height - 2}px`; // -2px za padding/border
                
                targetCell.appendChild(eventDiv);
            }
        });
    }

    /**
     * Ažurira prikaz trenutnog tjedna i godine.
     */
    function updateWeekDisplay() {
        currentWeekDisplay.textContent = `Tjedan ${state.week}, ${state.year}.`;
    }

    // Event listeneri za navigacijske gumbe
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

    // Pokreni sve!
    initializeCalendar();
});
