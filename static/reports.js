document.addEventListener('DOMContentLoaded', function() {
    
    // === Pomoćna funkcija za stvaranje tablice ===
    function createTable(headers, data) {
        if (!data || data.length === 0) {
            return '<p>Nema podataka za prikaz.</p>';
        }
        const table = document.createElement('table');
        const thead = table.createTHead();
        const tbody = table.createTBody();
        const headerRow = thead.insertRow();
        
        headers.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            headerRow.appendChild(th);
        });

        data.forEach(rowData => {
            const row = tbody.insertRow();
            Object.values(rowData).forEach(cellData => {
                const cell = row.insertCell();
                cell.textContent = cellData;
            });
        });
        return table;
    }

    // === Dohvaćanje i prikazivanje podataka za svaki izvještaj ===

    // 1. Raspored studenta
    const fetchStudentScheduleBtn = document.getElementById('fetch-student-schedule-btn');
    const studentJmbagInput = document.getElementById('student-jmbag-input');
    const studentScheduleResult = document.getElementById('student-schedule-result');

    fetchStudentScheduleBtn.addEventListener('click', () => {
        const jmbag = studentJmbagInput.value.trim();
        if (!jmbag) {
            alert('Molimo unesite JMBAG.');
            return;
        }
        studentScheduleResult.innerHTML = '<p>Učitavanje...</p>';
        fetch(`/api/reports/student-schedule/${jmbag}`)
            .then(res => res.json())
            .then(data => {
                const headers = ['JMBAG', 'Student', 'Dan', 'Od', 'Do', 'Kolegij', 'Dvorana', 'Nastavnik'];
                studentScheduleResult.innerHTML = '';
                studentScheduleResult.appendChild(createTable(headers, data));
            })
            .catch(err => studentScheduleResult.innerHTML = '<p class="error">Greška pri dohvaćanju.</p>');
    });

    // 2. Kolegiji po nastavnicima
    const fetchTeacherCoursesBtn = document.getElementById('fetch-teacher-courses-btn');
    const teacherCoursesResult = document.getElementById('teacher-courses-result');

    fetchTeacherCoursesBtn.addEventListener('click', () => {
        teacherCoursesResult.innerHTML = '<p>Učitavanje...</p>';
        fetch('/api/reports/teacher-courses')
            .then(res => res.json())
            .then(data => {
                const headers = ['Nastavnik', 'Kolegij', 'Semestar'];
                teacherCoursesResult.innerHTML = '';
                teacherCoursesResult.appendChild(createTable(headers, data));
            })
            .catch(err => teacherCoursesResult.innerHTML = '<p class="error">Greška pri dohvaćanju.</p>');
    });

    // 3. Log promjena emailova (RULE)
    const fetchEmailLogsBtn = document.getElementById('fetch-email-logs-btn');
    const emailLogsResult = document.getElementById('email-logs-result');

    fetchEmailLogsBtn.addEventListener('click', () => {
        emailLogsResult.innerHTML = '<p>Učitavanje...</p>';
        fetch('/api/logs/teacher-email-changes')
            .then(res => res.json())
            .then(data => {
                const headers = ['Stari Email', 'Vrijeme Promjene'];
                emailLogsResult.innerHTML = '';
                emailLogsResult.appendChild(createTable(headers, data));
            })
            .catch(err => emailLogsResult.innerHTML = '<p class="error">Greška pri dohvaćanju.</p>');
    });
    
    // 4. Povijest događaja (TRIGGER)
    const fetchEventHistoryBtn = document.getElementById('fetch-event-history-btn');
    const eventHistoryResult = document.getElementById('event-history-result');
    
    fetchEventHistoryBtn.addEventListener('click', () => {
        eventHistoryResult.innerHTML = '<p>Učitavanje...</p>';
        fetch('/api/history/events')
            .then(res => res.json())
            .then(data => {
                const headers = ['Kolegij', 'Dan', 'Od', 'Do', 'Vrijeme Zastarjevanja'];
                eventHistoryResult.innerHTML = '';
                eventHistoryResult.appendChild(createTable(headers, data));
            })
            .catch(err => eventHistoryResult.innerHTML = '<p class="error">Greška pri dohvaćanju.</p>');
    });
});
