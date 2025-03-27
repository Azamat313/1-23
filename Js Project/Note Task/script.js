let notes = JSON.parse(localStorage.getItem("notes")) || [];

function addNote() {
    let text = document.getElementById("noteText").value;
    let tags = document.getElementById("noteTags").value.split(",").map(t => t.trim());
    if (!text) return;
    let note = { text, tags, date: new Date().toISOString() };
    notes.push(note);
    localStorage.setItem("notes", JSON.stringify(notes));
    document.getElementById("noteText").value = "";
    document.getElementById("noteTags").value = "";
    renderNotes();
}

function renderNotes(filteredNotes = notes) {
    let list = document.getElementById("notesList");
    list.innerHTML = "";
    filteredNotes.forEach((note, index) => {
        let div = document.createElement("div");
        div.className = "note";
        div.innerHTML = `
            <p>${note.text}</p>
            <p class="tags">Tags: ${note.tags.join(", ")}</p>
            <button onclick="editNote(${index})">Edit</button>
            <button onclick="deleteNote(${index})">Delete</button>
        `;
        list.appendChild(div);
    });
}

function deleteNote(index) {
    notes.splice(index, 1);
    localStorage.setItem("notes", JSON.stringify(notes));
    renderNotes();
}

function editNote(index) {
    let newText = prompt("Edit note", notes[index].text);
    if (newText) {
        notes[index].text = newText;
        localStorage.setItem("notes", JSON.stringify(notes));
        renderNotes();
    }
}

function filterNotes() {
    let searchTag = document.getElementById("searchTag").value.toLowerCase();
    let filtered = notes.filter(note => note.tags.some(tag => tag.toLowerCase().includes(searchTag)));
    renderNotes(filtered);
}

function sortNotes() {
    notes.sort((a, b) => new Date(b.date) - new Date(a.date));
    localStorage.setItem("notes", JSON.stringify(notes));
    renderNotes();
}

renderNotes();