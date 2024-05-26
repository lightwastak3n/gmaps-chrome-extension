const runButton = document.getElementById("runbutton");
const notOnMaps = document.getElementById("not-on-maps");
const formatChoice = document.getElementById("data-format");
const locationsBox = document.getElementById("locations-box");
const locationsDropdown = document.getElementById("locations-dropdown");
const typeOfBusiness = document.getElementById("business-type");
const leadsStatus = document.getElementById("leads-num");
const bottomSection = document.getElementById("bottom");
const currentTask = document.getElementById("current-task");
const scrollingChoice = document.getElementById("scrolling-time");
const trialOver = document.getElementById("trial-over");
const mainSection = document.querySelector("main");
const nichesList = document.getElementById("niche-list");


let SCRAPING = false;

// Populate niches
getSavedOption("niches").then((storedNichesList) => {
    if (storedNichesList) {
        storedNichesList.forEach(niche => {
            const option = document.createElement("option");
            option.value = niche;
            nichesList.appendChild(option);
        });
    }
})

// Populate cities
getSavedOption("cities").then((storedCitiesLists) => {
    if (storedCitiesLists) {
        storedCitiesLists.forEach(cityList => {
            const option = document.createElement("option");
            option.value = cityList;
            option.innerText = cityList;
            locationsDropdown.appendChild(option);
        })
    }
})


function changeRunButton(mode) {
    if (mode === "run") {
        runButton.innerHTML = "<img src='images/run.png' alt=''><span>Run</span>"; 
    } else {
        runButton.innerHTML = "<img src='images/stop.png' alt=''><span>Stop</span>"; 
    }
}


let currentTab;
chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
    currentTab = tabs[0];
    if (!currentTab.url.includes("google.com/maps")) {
        mainSection.style.display = "none";
        notOnMaps.hidden = false;
    }
})


let data = [["name", "type", "rating", "address", "place", "phone", "website"]];
runButton.addEventListener('click', async function() {
    if (SCRAPING) {
        SCRAPING = false;
        processData(data);
        data = [["name", "type", "rating", "address", "place", "phone", "website"]];
        changeRunButton("run");;
        return;
    }
    SCRAPING = true;
    changeRunButton("stop");
    // Check if trial is over
    const currentUsage = await chrome.storage.local.get("usageCount"); 
    if (currentUsage.usageCount > 1000) {
        mainSection.style.display = "none";
        trialOver.hidden = false;
        return;
    };
    // Setup progress bar
    bottomSection.hidden = false;
    let leadsTotal = 0;
    const scrollTime = scrollingChoice.value;
    //Get search method
    const searchMethod = await getSavedOption("searchMethod");
    // Get the data from the extension inputs
    const searchStrings = getSearchStrings();
    const totalTasks = searchStrings.length;
    let taskNum = 1;
    for (const searchStr of searchStrings) {
        updateTask(`${taskNum}/${totalTasks} ${searchStr}`);
        let newData = await getLocationListings(searchStr, scrollTime, searchMethod);
        data.push(...newData);
        leadsTotal += newData.length;
        updateLeads(leadsTotal);
        taskNum++;
    }
    // Search current google maps view if the inputs are empty 
    if (searchStrings.length === 0) {
        let newData = await getLocationListings(undefined, scrollTime, undefined);
        data.push(...newData);
    }
    await updateUsageCount();
    processData(data);
    changeRunButton("run");
    SCRAPING = false;
});


async function getLocationListings(searchStr, scrollTime, method) {
    // Check if word "in" is in searchStr and split by that otherwise the place is everything but first word?    
    console.log("called getLocationSettings with searchStr", searchStr);
    let placeName = "";
    if (searchStr && searchStr.split(" ").includes("in")) {
        placeName = capitalizeEachWord(searchStr.split(" in ")[1].trim());
    } else if (searchStr) {
        placeName = capitalizeEachWord(searchStr.split(" ").slice(1).join(" "));
    }
    if (method === "url") {
        const mapsUrl = createUrl(searchStr);
        await chrome.tabs.update(currentTab.id, {url: mapsUrl});
        // Wait for the page to load
        await new Promise(resolve => setTimeout(resolve, 3000));
    } else if (method === "search-button") {
        await chrome.scripting.executeScript({
            target: {tabId: currentTab.id},
            function: runSearch,
            args: [searchStr]
        })
    }
    await chrome.scripting.executeScript({
        target: {tabId: currentTab.id},
        function: scrollListings,
        args: [scrollTime]
    });
    let locData = await chrome.scripting.executeScript({
        target: {tabId: currentTab.id},
        function: scrapeListings,
        args: [placeName]
    });
    return locData[0].result; 
}


async function scrollListings(scrollTime) {
    // Use ARIA to select results div
    const el = document.querySelector("div[role='feed']");
    const scrollDistance = el.scrollHeight;
    const turns = scrollTime / 2;
    for (let i = 0; i < turns; i++) {
        if (el.scrollTop !== (el.scrollHeight - el.offsetHeight)) {
            el.scrollBy(0, scrollDistance);
        } else {
            break;
        }
        // Wait for the new results to load
        await new Promise(resolve => setTimeout(resolve, 3000));
        // if (SCRAPING == false) {
        //     break;
        // }
    }
}


function scrapeListings(placeName) {
    const findPhoneNumber = (str) => {
        if (str === undefined) {
            return "";
        }
        const re = /(?:[-+() ]*\d){5,15}/gm;
        const num = str.match(re);
        if (num === null) {
            return "";
        }
        return num.map(function(s) { return s.trim(); })[0];
    }
    const findLink = (str) => {
        const linkRegex = /href=["']([^"']+)["']/i;
        const match = linkRegex.exec(str);
        return match ? match[1] : "";
    }
    let places = []
    const links = Array.from(document.querySelectorAll(".lI9IFe"));
    for (let i = 0; i < links.length; i++) {
        const link = links[i];
        const mainData = link.innerText.split("\n");
        const businessName = mainData[0];
        let rating = mainData[1].includes("reviews") ? "No reviews" : mainData[1].split("(")[0];
        rating = rating.replace(",", ".");
        const [businessType, address] = mainData[2].split(" · ");
        const phoneNumber = findPhoneNumber(mainData[3]);
        const website = findLink(link.innerHTML);
        places.push([businessName, businessType, rating, address, placeName, phoneNumber, website]);
    }
    return places;
}


function processData(data) {
    if (formatChoice.value === "csv") {
        parseCsv(data);
    } else {
        parseMarkdown(data);
    }
}


function getSearchStrings() {
    // Check business input
    let businessToSearch = []; 
    if (typeOfBusiness.value.includes(",")) {
        businessToSearch = typeOfBusiness.value.split(",");
    } else {
        businessToSearch.push(typeOfBusiness.value);
    }
    console.log("Btype processed", businessToSearch)
    // Check the locations inputs
    let locationsToSearch;
    if (locationsBox.value) {
        locationsToSearch = locationsBox.value.split("\n");
        if (businessToSearch[0].length === 0) {
            return locationsToSearch;
        }
    } else if (locationsDropdown.value) {
        locationsToSearch = locationsDropdown.value.split(",");
    }
    let searchStrings = [];
    if (locationsToSearch && businessToSearch[0].length > 0) {
        for (const bt of businessToSearch) {
            for (const loc of locationsToSearch) {
                let sString = `${bt} in ${loc.trim()}`;
                searchStrings.push(sString);
            }
        }
    }
    console.log("Search strings", searchStrings);
    return searchStrings;
}


async function runSearch(searchStr) {
    // Switched from this to directly changing url
    const searchBox = document.getElementById('searchboxinput');
    searchBox.value = searchStr;
    const searchButton = document.getElementById("searchbox-searchbutton");
    searchButton.click();
    // Wait for result load before returning
    await new Promise(resolve => setTimeout(resolve, 4000));
}


function createUrl(searchStr) {
    const words = searchStr.split(" ").join("+")
    return `https://www.google.com/maps/search/${words}`
}


function updateLeads(val) {
    leadsStatus.innerText = val;
}


function updateTask(val) {
    currentTask.innerText = val;
}


async function updateUsageCount() {
    let currentCount = await chrome.storage.local.get("usageCount");
    let totalCount = 1;
    if (currentCount.usageCount) {
        totalCount += currentCount.usageCount;
    }
    await chrome.storage.local.set({"usageCount": totalCount});
}
