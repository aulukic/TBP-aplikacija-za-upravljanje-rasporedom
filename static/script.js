document.addEventListener('DOMContentLoaded', function() {
    const grid = document.querySelector('.calendar-grid');
    const days = ['Ponedjeljak', 'Utorak', 'Srijeda', 'Četvrtak', 'Petak'];
    const dayColumnMap = {
        'Ponedjeljak': 2, 'Utorak': 3, 'Srijeda': 4, 'Četvrtak': 5, 'Petak': 6
    };

    // 1. Kreiraj redove za sate (od 7 do 19h)
    for (let hour = 7; hour < 20; hour++) {
        // Dodaj oznaku vremena
        const timeLabel = document.createElement('div');
        timeLabel.classList.add('time-label');
        timeLabel.textContent = `${hour}:00`;
        timeLabel.style.gridRow = `${hour - 6} / ${hour - 5}`;
        grid.appendChild(timeLabel);

        // Dodaj prazne ćelije za svaki dan
        for (let day = 1; day <= 5; day++) {
            const cell = document.createElement('div');
            cell.classList.add('calendar-cell');
            cell.style.gridRow = `${hour - 6} / ${hour - 5}`;
            cell.style.gridColumn = `${day + 1} / ${day + 2}`;
            grid.appendChild(cell);
        }
    }
    
    // 2. Dohvati događaje s backenda
    fetch('/api/events')
        .then(response => response.json())
        .then(events => {
            // 3. Prikaži svaki događaj na gridu
            events.forEach(event => {
                const eventDiv = document.createElement('div');
                eventDiv.classList.add('event');
                
                // Popuni sadržaj događaja
                eventDiv.innerHTML = `
                    <strong>${event.vrijeme_od} - ${event.vrijeme_do}</strong><br>
                    ${event.kolegij_naziv}<br>
                    <small>${event.dvorana_naziv}</small>
                `;

                // Izračunaj poziciju na gridu
                const startHour = parseInt(event.vrijeme_od.split(':')[0]);
                const startMinutes = parseInt(event.vrijeme_od.split(':')[1]);
                const endHour = parseInt(event.vrijeme_do.split(':')[0]);
                const endMinutes = parseInt(event.vrijeme_do.split(':')[1]);

                const topOffset = (startMinutes / 60) * 100; // Postotak od visine reda
                const durationHours = (endHour * 60 + endMinutes) - (startHour * 60 + startMinutes);
                const height = (durationHours / 60) * 50; // 50px po satu

                eventDiv.style.gridColumn = `${dayColumnMap[event.dan]} / span 1`;
                eventDiv.style.gridRowStart = startHour - 6; // Npr. 11:00 -> red 5
                
                // Pozicioniranje unutar ćelije
                eventDiv.style.position = 'relative'; // Promjena za jednostavnost
                eventDiv.style.height = `${height}px`;
                eventDiv.style.marginTop = `${(startMinutes / 60) * 50}px`;

                // Pronađi odgovarajuću ćeliju i dodaj događaj u nju
                const targetCell = grid.querySelector(`[style*="grid-row: ${startHour - 6}"][style*="grid-column: ${dayColumnMap[event.dan]}"]`);
                if (targetCell) {
                    targetCell.appendChild(eventDiv);
                }
            });
        });
});