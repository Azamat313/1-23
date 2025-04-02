let expenses = [];

function addExpense() {
    const description = document.getElementById('expenseDescription').value;
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    const category = document.getElementById('expenseCategory').value;

    if (description && amount && category) {

        const expense = {
            description,
            amount,
            category
        };

        expenses.push(expense);

        document.getElementById('expenseDescription').value = '';
        document.getElementById('expenseAmount').value = '';
        document.getElementById('expenseCategory').value = '';

        updateExpenseList();
        updateTotal();
    } else {
        alert('Please fill all fields');
    }
}

function updateExpenseList() {
    const expenseList = document.getElementById('expenseList');
    expenseList.innerHTML = '';

    expenses.forEach((expense,index) => {
        const expenseItem = document.createElement('li');
        expenseItem.className = 'expense-item';
        expenseItem.innerHTML = `
             <span>${expense.description} - ₸${expense.amount.toFixed(2)} (${expense.category})</span>
             <button onclick="removeExpense(${index})">Remove</button>
        `;
        expenseList.appendChild(expenseItem);
    });
}

function removeExpense(index) {
    expenses.splice(index, 1);
    updateExpenseList();
    updateTotal();
}

function updateTotal() {
    const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    document.getElementById('totalAmount').innerText = `Total: ₸${total.toFixed(2)}`;
}


