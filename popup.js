
function getText(CO2_UG) {

    let precision = 100;
    let text = (CO2_UG * precision | 0) / precision + " Microgram (µg)"

    if (CO2_UG < 1) {
        text = (CO2_UG * 1000 * precision| 0) / precision+ ' Nanogram (ng)';
    }
    if (CO2_UG > 1000) {
        text = ((CO2_UG * precision / 1000) | 0)  / precision+ ' Milligram (mg)';
    }
    if (CO2_UG > 1000000) {
        text = ((CO2_UG * precision / 1000000) | 0) / precision + ' Gram (g)';
    }

    if (CO2_UG > 1000000000) {
        text = ((CO2_UG * precision/ 1000000000) | 0) / precision+ ' Kilogram (kg)';
    }

    if (CO2_UG > 1000000000000) {
        text = ((CO2_UG * precision/ 1000000000000) | 0) / precision + ' Ton (T)';
    }

    return text;
}

chrome.runtime.sendMessage({method:"getConsumption"},function(response){
    document.getElementById('page').innerHTML = getText(response.page);
    document.getElementById('session').innerHTML = getText(response.session);
    document.getElementById('ever').innerHTML = getText(response.ever);
});

function onChangeDisplay() {

    chrome.runtime.sendMessage({method:"setDisplay", "display" : document.getElementById("display").value},function(response){

    });
}

chrome.runtime.sendMessage({method:"getDisplay"},function(response){
    document.getElementById("display").value = response.display;
    

});


document.getElementById("display").addEventListener("change", onChangeDisplay);



