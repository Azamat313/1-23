const answer = () => {
    let length = parseFloat(prompt("length of the rectangle:"));
    let width = parseFloat(prompt("width of the rectangle:"));

    if (isNaN(length) || isNaN(width)) {
        document.getElementById("ans1").innerHTML = "Enter correct numbers";
        document.getElementById("ans2").innerHTML = "";
        return;
    }

    let p = (2 * (length + width)).toFixed(2);
    let a = (length * width).toFixed(2);

    document.getElementById("ans1").innerHTML = "The permieter of rectangle is " + p;
    document.getElementById("ans2").innerHTML = "The area of rectangle is " + a;
}