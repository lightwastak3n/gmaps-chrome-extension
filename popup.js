const runButton = document.getElementById("runbutton");
const notOnMaps = document.getElementById("not-on-maps");
const formatChoice = document.getElementById("data-format");
const scrapeLocations = document.getElementById("scrape-locations");
const typeOfBusiness = document.getElementById("business-type");
const leadsStatus = document.getElementById("leads-num");
const bottomSection = document.getElementById("bottom");
const currentTask = document.getElementById("current-task");
const scrollingChoice = document.getElementById("scrolling-time");
const trialOver = document.getElementById("trial-over");
const mainSection = document.querySelector("main");


function hideElements(arr) {
    for (const el of arr) {
        el.hidden = true;
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


runButton.addEventListener('click', async function() {
    // Check if trial is over
    const currentUsage = await chrome.storage.local.get("usageCount"); 
    if (currentUsage.usageCount > 5) {
        mainSection.style.display = "none";
        trialOver.hidden = false;
        return;
    };

    // Get the data from the extension inputs
    const searchStrings = getSearchStrings();
    // Setup progress bar
    bottomSection.hidden = false;
    let leadsTotal = 0;
    const scrollTime = scrollingChoice.value;

    let data = [["name", "type", "rating", "address", "phone", "website"]];
    const totalTasks = searchStrings.length;
    let taskNum = 1;
    for (const searchStr of searchStrings) {
        updateTask(`${taskNum}/${totalTasks} ${searchStr}`);
        let newData = await getLocationListings(searchStr, scrollTime, "search");
        data.push(...newData);

        leadsTotal += newData.length;
        updateLeads(leadsTotal);
        taskNum++;
    }
    // Search current google maps view if the inputs are empty 
    if (searchStrings.length === 0) {
        let newData = await getLocationListings(undefined, scrollTime);
        data.push(...newData);
    }
    await updateUsageCount();
    processData(data)
});


async function getLocationListings(searchStr, scrollTime, method) {
    if (method === "url") {
        const mapsUrl = createUrl(searchStr);
        await chrome.tabs.update(currentTab.id, {url: mapsUrl});
        // Wait for the page to load
        await new Promise(resolve => setTimeout(resolve, 3000));
    } else if (method === "search") {
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
        function: scrapeListings
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
    }
}


function scrapeListings() {
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
        places.push([businessName, businessType, rating, address, phoneNumber, website]);
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
    const locationValues = scrapeLocations.value;
    let searchStrings = [];
    if (locationValues) {
        const locations = scrapeLocations.value.split("\n");
        const bType = typeOfBusiness.value;
        for (loc of locations) {
            let sString = bType.length > 0 ? `${bType} in ${loc.trim()}` : loc.trim();
            searchStrings.push(sString);
        }
    } 
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
