const runButton = document.getElementById("runbutton");
const descriptions = document.querySelectorAll(".description");
const notOnMaps = document.getElementById("not-on-maps");
const formatChoice = document.getElementById("data-format");
const scrapeLocations = document.getElementById("scrape-locations");
const typeOfBusiness = document.getElementById("business-type");
const leadsStatus = document.getElementById("leads-num");
const bottomSection = document.getElementById("bottom");
const currentTask = document.getElementById("current-task");
const scrollingChoice = document.getElementById("scrolling-time")


let currentTab;
chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
    currentTab = tabs[0];
    if (!currentTab.url.includes("google.com/maps")) {
        for (let i = 0; i < descriptions.length; i++) {
            descriptions[i].hidden = true;
        }
        runButton.hidden = true;
        formatChoice.hidden = true;
        scrapeLocations.hidden = true;
        typeOfBusiness.hidden = true;
        notOnMaps.hidden = false;
    }
})


runButton.addEventListener('click', async function() {
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
        const newUrl = createUrl(searchStr);
        let newData = await getLocationListings(newUrl, scrollTime);
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
    processData(data)
});


async function getLocationListings(mapsUrl, scrollTime) {
    if (mapsUrl) {
        await chrome.tabs.update(currentTab.id, {url: mapsUrl});
        // Wait for the page to load
        await new Promise(resolve => setTimeout(resolve, 3000));
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
    // const resultsSelector = "#QA0Szd > div > div > div.w6VYqd > div.bJzME.tTVLSc" + 
    //     " > div > div.e07Vkf.kA9KIf > div > div > div.m6QErb.DxyBCb.kA9KIf.dS8AEf.ecceSd" + 
    //     " > div.m6QErb.DxyBCb.kA9KIf.dS8AEf.ecceSd";
    // const el = document.querySelector(resultsSelector);
    
    // Use ARIA to select
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
        await new Promise(resolve => setTimeout(resolve, 2000));
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
        const rating = mainData[1].includes("reviews") ? "No reviews" : mainData[1].split("(")[0];
        const [businessType, address] = mainData[2].split(" · ");
        const phoneNumber = findPhoneNumber(mainData[3]);
        const website = findLink(link.innerHTML);
        places.push([businessName, businessType, rating, address, phoneNumber, website]);
    }
    return places;
}


function parseCsv(data) {
    console.log("Parsing csv.");
    console.log("For data", data);
    // Removing some chars to get a valid csv
    const cleanStr = (str) => {
        if (!str) {
            return "";
        }
        const r = [",", "/", "|"];
        return str.split('').map(char => r.includes(char) ? ' ' : char).join('');
    }
    // Clean names and addresses
    for (let i = 0; i < data.length; i++) {
        data[i][0] = cleanStr(data[i][0]);
        data[i][3] = cleanStr(data[i][3]);
    }
    let csvData = data.map(row => row.join(",")).join("\n");
    let csvFile = new Blob([csvData], {type: "text/csv;charset=utf-8;"});
    let csvUrl = URL.createObjectURL(csvFile);

    let csvLink = document.createElement("a");
    csvLink.href = csvUrl;
    csvLink.download = "google_maps.csv";
    csvLink.click();
}


function parseMarkdown(data) {
    console.log("Parsing Markdown.");
    let markdownTable = "";
    for (let i = 0; i < data.length; i++) {
        let row = data[i];
        markdownTable += "| ";
        markdownTable += row.join(" | ") + " |\n";
        if (i === 0) {
            markdownTable += "| ";
            markdownTable += row.map(() => "----").join(" | ") + " |\n";
        }
    }
    // Open the Markdown table in a new tab
    chrome.tabs.create({ url: "data:text/plain;charset=utf-8," + encodeURIComponent(markdownTable) });
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
    const searchId = "searchboxinput";
    const searchBox = document.getElementById(searchId);
    searchBox.value = searchStr;
    const buttonId = "searchbox-searchbutton";
    const searchButton = document.getElementById(buttonId);
    searchButton.click();
    // Wait for result load before returning
    await new Promise(resolve => setTimeout(resolve, 2000));
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

