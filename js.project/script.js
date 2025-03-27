document.addEventListener("DOMContentLoaded", loadNotes);

const addNoteBtn = document.getElementById("add-note");
const noteTitle = document.getElementById("note-title");
const noteContent = document.getElementById("note-content");
const noteCategory = document.getElementById("note-category");
const notesList = document.getElementById("notes-list");
const filterCategory = document.getElementById("filter-category");
const clearNotesBtn = document.getElementById("clear-notes");

addNoteBtn.addEventListener("click", addNote);
clearNotesBtn.addEventListener("click", clearNotes);
filterCategory.addEventListener("change", filterNotes);

function addNote() {
    const title = noteTitle.value.trim();
    const content = noteContent.value.trim();
    const category = noteCategory.value;

    if (title === "" || content === "") {
        alert("Enter the title and content of your note!");
        return;
    }

    const note = {
        id: Date.now(),
        title,
        content,
        category,
        important: false,
    };

    saveNoteToLocalStorage(note);
    displayNotes();
    
    noteTitle.value = "";
    noteContent.value = "";
}

function saveNoteToLocalStorage(note) {
    let notes = JSON.parse(localStorage.getItem("notes")) || [];
    notes.push(note);
    localStorage.setItem("notes", JSON.stringify(notes));
}

function loadNotes() {
    displayNotes();
}

function displayNotes() {
    notesList.innerHTML = "";
    let notes = JSON.parse(localStorage.getItem("notes")) || [];

    notes.forEach(note => {
        const noteElement = document.createElement("div");
        noteElement.classList.add("note");
        if (note.important) noteElement.classList.add("important");

        noteElement.innerHTML = `
            <h3>${note.title}</h3>
            <p>${note.content}</p>
            <small>Categoty: ${note.category}</small>
            <div class="actions">
                <button onclick="toggleImportant(${note.id})">Important</button>
                <button onclick="deleteNote(${note.id})">Delete</button>
            </div>
        `;

        notesList.appendChild(noteElement);
    });
}

function deleteNote(id) {
    let notes = JSON.parse(localStorage.getItem("notes")) || [];
    notes = notes.filter(note => note.id !== id);
    localStorage.setItem("notes", JSON.stringify(notes));
    displayNotes();
}

function toggleImportant(id) {
    let notes = JSON.parse(localStorage.getItem("notes")) || [];
    notes = notes.map(note => {
        if (note.id === id) note.important = !note.important;
        return note;
    });
    localStorage.setItem("notes", JSON.stringify(notes));
    displayNotes();
}

function clearNotes() {
    if (confirm("Are you sure you want to delete all notes?")) {
        localStorage.removeItem("notes");
        displayNotes();
    }
}

function filterNotes() {
    const category = filterCategory.value;
    let notes = JSON.parse(localStorage.getItem("notes")) || [];
    
    notesList.innerHTML = "";
    notes
        .filter(note => category === "all" || note.category === category)
        .forEach(note => {
            const noteElement = document.createElement("div");
            noteElement.classList.add("note");
            if (note.important) noteElement.classList.add("important");

            noteElement.innerHTML = `
                <h3>${note.title}</h3>
                <p>${note.content}</p>
                <small>Category: ${note.category}</small>
                <div class="actions">
                    <button onclick="toggleImportant(${note.id})">Important</button>
                    <button onclick="deleteNote(${note.id})">Delete</button>
                </div>
            `;

            notesList.appendChild(noteElement);
        });
}