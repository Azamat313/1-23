function isPalindrome() {
    const word = document.getElementById("word").value.toLowerCase()
    const reversed = word.split("").reverse().join("");
    const result = document.getElementById("result");

    if (word == reversed) {
        result.textContent = `"${word}" is Palindrome.  `;
    } else {
        result.textContent = `"${word}" is NOT Palindrome.`;
        
    }
}
