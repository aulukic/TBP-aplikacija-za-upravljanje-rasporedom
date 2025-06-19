/* General Body Styles */
body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background-color: #f4f7f9;
    color: #333;
    margin: 0;
    padding: 20px;
}

/* Header and Navigation */
header {
    text-align: center;
    margin-bottom: 20px;
}

header h1 {
    color: #2c3e50;
    margin-bottom: 10px;
}

.week-navigation {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 20px;
    margin-bottom: 20px; /* Dodan razmak ispod navigacije */
}

.week-navigation h2 {
    margin: 0;
    font-size: 1.2em;
    color: #34495e;
    min-width: 180px;
    text-align: center;
}

.nav-button {
    background-color: #3498db;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 5px;
    cursor: pointer;
    font-size: 1em;
    transition: background-color 0.3s ease;
}

.nav-button:hover {
    background-color: #2980b9;
}

/* ====================================================== */
/* NOVO: Stilovi za traku za pretraživanje                */
/* ====================================================== */
.search-container {
    max-width: 500px;
    margin: 0 auto;
}

#search-input {
    width: 100%;
    padding: 12px 15px;
    font-size: 1em;
    border: 2px solid #dfe6e9;
    border-radius: 8px;
    box-sizing: border-box;
    transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

#search-input:focus {
    border-color: #3498db;
    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.2);
    outline: none;
}


/* Calendar Styles */
.calendar-container {
    max-width: 1200px;
    margin: 0 auto;
    background-color: #fff;
    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    overflow: hidden;
}

.calendar-grid {
    display: grid;
    grid-template-columns: 80px repeat(5, 1fr); 
    border-top: 1px solid #e0e0e0;
}

.time-header, .day-header {
    background-color: #f8f9fa;
    padding: 12px;
    font-weight: bold;
    text-align: center;
    border-bottom: 1px solid #e0e0e0;
    position: sticky;
    top: 0;
    z-index: 10;
}

.time-label {
    grid-column: 1 / 2;
    text-align: right;
    padding: 0 10px;
    border-right: 1px solid #e0e0e0;
    color: #7f8c8d;
    font-size: 0.9em;
    position: relative;
    top: -10px;
}

.calendar-cell {
    border-bottom: 1px solid #e0e0e0;
    border-right: 1px solid #e0e0e0;
    min-height: 60px;
    position: relative;
}

.calendar-cell:last-child {
    border-right: none;
}

/* Event Styles */
.event {
    background-color: #ecf5ff;
    border-left: 4px solid #3498db;
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 0.8em;
    overflow: hidden;
    position: absolute;
    width: calc(100% - 10px);
    left: 5px;
    box-sizing: border-box;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    transition: all 0.2s ease;
    cursor: pointer; /* Dodan cursor pointer da indicira klikabilnost */
}

.event:hover {
    transform: translateY(-2px) scale(1.02);
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    z-index: 5;
}

/* NOVO: Klasa za skrivanje događaja kod pretrage */
.event.hidden {
    opacity: 0.1;
    pointer-events: none; /* Onemogući klik na skrivene */
}

.event strong {
    display: block;
    margin-bottom: 2px;
    font-weight: 600;
    color: #2c3e50;
}

.event .event-title {
    display: block;
    font-weight: 500;
}

.event .event-details {
    display: block;
    color: #7f8c8d;
    font-size: 0.9em;
    margin-top: 2px;
}

/* Loading and Error States */
.loading, .error {
    grid-column: 1 / -1;
    padding: 50px;
    text-align: center;
    font-size: 1.2em;
    color: #7f8c8d;
}

.error {
    color: #e74c3c;
}

/* ====================================================== */
/* NOVO: Stilovi za modalni prozor                        */
/* ====================================================== */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.6);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    opacity: 0;
    transition: opacity 0.3s ease;
}

.modal-overlay.visible {
    opacity: 1;
}

.modal-content {
    background-color: #fff;
    padding: 30px;
    border-radius: 8px;
    width: 90%;
    max-width: 500px;
    position: relative;
    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
    transform: translateY(-20px);
    transition: transform 0.3s ease;
}

.modal-overlay.visible .modal-content {
    transform: translateY(0);
}

.modal-close {
    position: absolute;
    top: 10px;
    right: 15px;
    background: none;
    border: none;
    font-size: 2em;
    cursor: pointer;
    color: #aaa;
    line-height: 1;
}
.modal-close:hover {
    color: #333;
}

#modal-title {
    margin-top: 0;
    color: #2c3e50;
    border-bottom: 1px solid #e0e0e0;
    padding-bottom: 15px;
    margin-bottom: 20px;
}

#modal-body p {
    margin: 0 0 10px;
    line-height: 1.6;
    font-size: 1.1em;
}

#modal-body p strong {
    display: inline-block;
    width: 120px; /* Poravnanje oznaka */
    color: #7f8c8d;
}
