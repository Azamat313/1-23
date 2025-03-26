const student = {
    name: "Алина",
    age: 20,
    grades: [85, 90, 100],

    addGrade: function(grade) {
        if (typeof grade === 'number' && grade >= 0 && grade <= 100) {
            this.grades.push(grade);
            this.displayInfo();
        } else {
            alert("Некорректная оценка!");
        }
    },

    averageGrade: function() {
        if (this.grades.length === 0) {
            return 0;
        }
        const sum = this.grades.reduce((acc, grade) => acc + grade, 0);
        return sum / this.grades.length;
    },

    displayInfo: function() {
        const infoDiv = document.getElementById("student-info");
        infoDiv.innerHTML = `
            <p><strong>Имя:</strong> ${this.name}</p>
            <p><strong>Возраст:</strong> ${this.age}</p>
            <p><strong>Оценки:</strong> ${this.grades.join(", ")}</p>
            <p><strong>Средний балл:</strong> ${this.averageGrade().toFixed(2)}</p>
        `;
    }
};

student.displayInfo();

document.getElementById("add-grade-btn").addEventListener("click", function() {
    const newGrade = parseInt(document.getElementById("new-grade").value);
    student.addGrade(newGrade);
    document.getElementById("new-grade").value = "";
});