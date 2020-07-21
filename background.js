/*
  Some of it shamesly rob from @awalGarg
*/



const filter = { urls: [ "<all_urls>" ] };
const opt_extraInfoSpec = ["requestBody"]
const TAB_DB = {};

let TOTAL_CONSUMPTION_THIS_SESSION = 0;

if (!localStorage.total || localStorage.total == "NaN") {
    localStorage.total = 0;
}

function onBeforeNavigate({tabId, timeStamp, url, parentFrameId}) {
  
    if (!TAB_DB[tabId]) {
        TAB_DB[tabId] = {
            current_page  : null,
            history : []
        }
    }
    else {
        if (parentFrameId != -1) {
            return;
        }
    }

    let tab = TAB_DB[tabId];

    if (tab.current_page) {
        tab.current_page.final = getCurrentTabConsumtion(tabId);
        tab.history.push(tab.current_page);
      
        if (!localStorage.total) {
            localStorage.total = 0;
        }
    }

    tab.current_page = {
        init : timeStamp,
        url : url,
        ressources : {}
    };
}

function initTab(tabId) {
    if (!TAB_DB[tabId]) {
        TAB_DB[tabId] = {
            current_page  : null,
            history : []
        }
    }
    let tab = TAB_DB[tabId];

    if (tab.current_page) {
        tab.history.push(tab.current_page);
    }

    tab.current_page = {
        init : new Date().getTime(),
        url : "unKnonw",
        ressources : {}
    };
}
//ResourceType
// Enum
// "main_frame", "sub_frame", "stylesheet", "script", "image", "font", "object", "xmlhttprequest", "ping", "csp_report", "media", "websocket", or "other"

function onBeforeRequest({ tabId, timeStamp, requestId, type, requestBody}) {
    if (!TAB_DB[tabId]) {
        initTab(tabId);
    } 

    let tab = TAB_DB[tabId];

    let ressource = tab.current_page.ressources[requestId] = {
        init : timeStamp,
        type : type,
        payloadSize : 0
    }

    // calculate size of payload
    if (requestBody) {
        if (requestBody.formData) {
            for (let key in requestBody.formData) {
                ressource.payloadSize += key.length + requestBody.formData[key].length;
            }
        }
        if (requestBody.raw) {
            for (let data of requestBody.raw) {
                ressource.payloadSize += data.any.length;
            }
        }
    }
}

function onBeforeSendHeaders({tabId, requestId, timeStamp}) {
    let tab = TAB_DB[tabId];
    if (!tab) {
        return;
    }
    let ressource = tab.current_page.ressources[requestId];
    if (!ressource) {
        return;
    }
    ressource.tcpOpen = timeStamp;
}

function onSendHeaders({tabId, requestId, timeStamp}) {
    let tab = TAB_DB[tabId];
    if (!tab) {
        return;
    }
    let ressource = tab.current_page.ressources[requestId];
    if (!ressource) {
        return;
    }
    ressource.sendStart = timeStamp;
}

function onResponseStarted({tabId, requestId, timeStamp, fromCache}) {
    let tab = TAB_DB[tabId];
    if (!tab) {
        return;
    }
    let ressource = tab.current_page.ressources[requestId];
    if (!ressource) {
        return;
    }
    ressource.firstByte = timeStamp;
    ressource.fromCache = fromCache;

}

function onHeadersReceived({tabId, requestId, timeStamp}) {
    let tab = TAB_DB[tabId];
    if (!tab) {
        return;
    }
    let ressource = tab.current_page.ressources[requestId];
    if (!ressource) {
        return;
    }
    ressource.headerOver = timeStamp;
}

function onCompleted({tabId, requestId, timeStamp, fromCache}) {

    let tab = TAB_DB[tabId];

    if (!tab) {
        return;
    }
    let ressource = tab.current_page.ressources[requestId];
    if (!ressource) {
        return;
    }
    ressource.completed = timeStamp;
    ressource.fromCache = fromCache;

    let consumption = getRessourceConsumption(ressource);
    TOTAL_CONSUMPTION_THIS_SESSION += consumption;
    localStorage.total = parseFloat(localStorage.total) + parseFloat(consumption);

}

function onErrorOccurred({tabId, requestId, timeStamp}) {
    let tab = TAB_DB[tabId];
    if (!tab) {
        return;
    }
    let ressource = tab.current_page.ressources[requestId];
    if (!ressource) {
        return;
    }
    ressource.completed = timeStamp;
}


//  onBeforeNavigate -> onCommitted -> onDOMContentLoaded -> onCompleted
chrome.webNavigation.onBeforeNavigate.addListener(onBeforeNavigate, filter);

/*
 onBeforeRequest 
 onBeforeSendHeaders (TCP OK) 
 onSendHeaders (just before sending first HTTP data)
 onResponseStarted (first byte from server)
 onHeadersReceived (  header from server received )
 onCompleted (request over) 
 
 */
chrome.webRequest.onBeforeRequest.addListener(onBeforeRequest, filter);
chrome.webRequest.onBeforeSendHeaders.addListener(onBeforeSendHeaders, filter);
chrome.webRequest.onSendHeaders.addListener(onSendHeaders, filter);
chrome.webRequest.onResponseStarted.addListener(onResponseStarted, filter);
chrome.webRequest.onHeadersReceived.addListener(onHeadersReceived, filter);
chrome.webRequest.onCompleted.addListener(onCompleted, filter);
chrome.webRequest.onErrorOccurred.addListener(onErrorOccurred, filter);


let current_tab_id = 0;
function getCurrentTabConsumtion(tabId) {
    current_tab_id = tabId;

    // Calculate the enrgy consumption. Formula to be updated!

    if (!TAB_DB[tabId] || !TAB_DB[tabId].current_page) {
        return 0;
    }


    let page = TAB_DB[tabId].current_page;
    let CO2_UG = 0;

    for (let key in page.ressources) {
        let res = page.ressources[key]; 
        CO2_UG += getRessourceConsumption(res);
    }

    return  CO2_UG;
}

function getRessourceConsumption(res) {
    // Hypothesis  
    // CO2 / Kwh -> 0.99 pound -> ±450g https://www.eia.gov/tools/faqs/faq.php?id=74&t=11#:~:text=In%202018%2C%20total%20U.S.%20electricity,of%20CO2%20emissions%20per%20kWh.


    // Network 
    // Router : 6Wh -> 1.6mWh / seconde
    // Average hopcount : 14 ucsd.edu/~massimo/ECE158A/Handouts_files/hop-count.pdf
    // Average number of parrallele connection per router : 1000
    // Usage power : 1.6 * 14 / 1000 mWh / s -> 0.0224mWh / second -> 2.224 * 10^-2mwh/s -> 2.224 * 10^-5wh/s -> 2.224 * 10^-8 KWh/s 
    // Usage CO2 : 2.224 * 10^-8 KWh/s * 450g -> 1000.8 * 10^-8 g/s -> 1.0008 * 10^-5 mg /s -> 0.01 ug/s 

    const CO2_MG_PER_NETWORK_MS_UG = 0.01 / 1000;

    // Server 
    // Server : 300Wh -> 83.3mWh / seconde
    // Server avg parrallel connection : 100
    // Usage : 83.3 / 100 mWh/ s -> 0.833 mWh / s -> 0.833 * 10^-6 KWh/s
    // Usage C02 : 0.833 * 10^-6 KWh/s  * 450g  -> 374.85 * 10^-6 g/s -> 374.85 * ug /s
  

    // TODO. estimate better and per media type.
    
    const CO2_MG_PER_SERVER_COMPUTE_MS_UG = 374 / 1000;

    // CO2 consoption in micro gram 
    let CO2_UG = 0;
    
    if (!res.fromCache && res.completed) {
        let networkTime = res.completed - res.init;

        CO2_UG += networkTime * CO2_MG_PER_NETWORK_MS_UG;

        if (res.sendStart && res.firstByte) {
            // Approximate the server load by estimating the time between start of header send and first byte received on our side
            let serverComputeTime = res.firstByte- res.sendStart ;
            CO2_UG += serverComputeTime * CO2_MG_PER_SERVER_COMPUTE_MS_UG;
        }
    }

    return CO2_UG;
}

function updateBadge() {
    chrome.tabs.query({currentWindow: true, active: true}, function (tab) {
        let CO2_UG = 0;
        
        if (localStorage.display == "page")
        {
            CO2_UG = getCurrentTabConsumtion(tab[0].id);
        }
        if (localStorage.display == "session") {
            CO2_UG = TOTAL_CONSUMPTION_THIS_SESSION;
        }
        if (localStorage.display == "ever") {
            CO2_UG = parseFloat(localStorage.total);
        }
    
        if (chrome.browserAction) {
            let text = (CO2_UG | 0)+ "µg"
    
            if (CO2_UG < 1) {
                text = (CO2_UG * 1000 | 0) + 'ng';
            }
            if (CO2_UG > 1000) {
                text = ((CO2_UG / 1000) | 0) + 'mg';
            }
            if (CO2_UG > 1000000) {
                text = ((CO2_UG / 1000000) | 0) + 'g';
            }
    
            if (CO2_UG > 1000000000) {
                text = ((CO2_UG / 1000000000) | 0) + 'kg';
            }
    
            if (CO2_UG > 1000000000000) {
                text = ((CO2_UG / 1000000000000) | 0) + 'T';
            }
            chrome.browserAction.setBadgeText({text: text});
        }
    });

   
}

setInterval(updateBadge, 500);

if (!localStorage.display) {
    localStorage.display = "page";
}

chrome.runtime.onMessage.addListener(function(message,sender,sendResponse){
    if(message.method == "getConsumption"){

      sendResponse({
          page : getCurrentTabConsumtion(current_tab_id),
          session : TOTAL_CONSUMPTION_THIS_SESSION,
          ever : localStorage.total
      });

    }
    if(message.method == "getDisplay"){

        sendResponse({
            display : localStorage.display
        });
      }

      if(message.method == "setDisplay"){
          console.log(message)
        localStorage.display = message.display;
        sendResponse({display : message.display});
      }
  });

