"use strict"

let discount = 0;

const discountValueElement = 
document.getElementById('discountValue');
const finalAmountElement =
document.getElementById('finalAmouunt');
const purchaseButton =
document.getElementById('purchaseButton');

purchaseButton.addEventListener('click', () => {

while (discount < 10) {
    discount = discount + 1;
    console.log(discount); 
    document.getElementById('discountValue').innerText = 'Current Discount:' + discount;
    break;
}


})


"use sctrict";

let discount1 = 0;

while (discount1 < 10) {
    discount1 = discount1 + 1;
    console.log(discount1); 
}



let num = 2;

for (let i = 1;i <= 10; i++){
    console.log(num * i);


}


let numb = 2;

let i = 1;

while(true) {
    console.log(numb * i)
    i++;
    if(i > 100)break;
}




let count = 0;

for (let i = 1; i <= 20; i++){
    if (i % 2 === 0) {
        count++;
    }
}

console.log(count);
