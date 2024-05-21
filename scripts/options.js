const searchChoice = document.querySelector("select");
const nicheBox = document.querySelector("#niches");
const citiesBox = document.querySelector("#cities");
const saveButton = document.querySelector("button");
const statusNotification = document.querySelector("#status");


document.addEventListener("DOMContentLoaded", () => {
    getSavedOptions("serchMethod").then((currentSearchMethod) =>{
        if (currentSearchMethod) {
            searchChoice.value = currentSearchMethod;
        }
    })
});


saveButton.addEventListener("click", () => {
    const nicheBoxVals = nicheBox.value.split("\n");
    const citiesBoxVals = citiesBox.value.split("\n");
    const addedNiches = nicheBoxVals[0].length > 0 ? nicheBoxVals : null
    const addedCities = citiesBoxVals[0].length > 0 ? citiesBoxVals : null
    const searchChoiceVal = searchChoice.value;
    saveOptions(searchChoiceVal, addedNiches, addedCities);
    statusNotification.hidden = false;
})

