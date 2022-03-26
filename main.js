const area = document.getElementById('area');
let move = 0
let result = ``;
const contentWrapper = document.getElementById('content');
const modalResult = document.getElementById('modal-result-wrapper');
const overlay = document.getElementById('overlay');
const btnClose = document.getElementById('btn-close');

area.addEventListener('click', e => {
    if(e.target.className === `box`) {
        if (e.target.innerHTML === '') {
            move % 2 === 0 ? e.target.innerHTML = `X` : e.target.innerHTML = `O`;
            move++;
        } else {
            console.log('занято')
        }
        check();
     }
});

const check = () => {
    const boxes = document.getElementsByClassName(`box`)
    const arr =[
        [0,1,2],
        [3,4,5],
        [6,7,8],
        [0,3,6],
        [1,4,7],
        [2,5,8],
        [0,4,8],
        [2,4,6]
    ];
    for(i = 0; i < arr.length; i++) {
        if(
            boxes[arr[i][0]].innerHTML == `X` && boxes[arr[i][1]].innerHTML == `X` && boxes[arr[i][2]].innerHTML == `X`
        ) {
            result = `хрестики`;
            prepareResult(result);
        } else if (
            boxes[arr[i][0]].innerHTML == `O` && boxes[arr[i][1]].innerHTML == `O` && boxes[arr[i][2]].innerHTML == `O`
        ) {
            result = `нолики`;
            prepareResult(result);
        }
    } 
    if  (!result) {
        let pustoj = false;
        for (let i = 0; i < boxes.length; i++) {
            if (pustoj) {
                return;
            }
            const box = boxes[i];
            pustoj = !box.innerHTML;
        }
        if (!pustoj) {
            contentWrapper.innerHTML = 'Ничья :(';
            modalResult.style.display = 'block';
        }
    }     
}

const prepareResult = winner => {
    contentWrapper.innerHTML = `Победили ${winner} !!!`;
    modalResult.style.display = 'block';
}

const closeModal = () => {
    modalResult.style.display = 'none';
    location.reload();
}

overlay.addEventListener('click', closeModal);
btnClose.addEventListener('click', closeModal)