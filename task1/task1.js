document.getElementById('registrationForm').addEventListener('submit', function(event) {
    event.preventDefault();

    let email = document.getElementById('email').value;
    let password = document.getElementById('password').value;
    let confirmPassword = document.getElementById('confirmPassword').value;
    let emailError = document.getElementById('emailError');
    let passwordError = document.getElementById('passwordError');
    let confirmPasswordError = document.getElementById('confirmPasswordError');

    emailError.textContent = '';
    passwordError.textContent = '';
    confirmPasswordError.textContent = '';

    let valid = true;
    let emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
        emailError.textContent = '⚠ Enter a valid email';
        valid = false;
    }

    if (password.length < 8) {
        passwordError.textContent = '⚠ Password must contain at least 8 characters';
        valid = false;
    }

    if (password !== confirmPassword) {
        confirmPasswordError.textContent = '⚠ Passwords do not match';
        valid = false;
    }

    if (valid) {
        alert('Signed Up successfully!');
    }
});
