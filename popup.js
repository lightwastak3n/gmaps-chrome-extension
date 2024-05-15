const runButton = document.getElementById("runbutton");
const description = document.querySelector("main p");
const formatChoice = document.querySelector("main select");
const scrapeLocations = document.getElementById("scrape-locations");


let currentTab;
chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
    currentTab = tabs[0];
    if (!currentTab.url.includes("google.com/maps")) {
        description.innerHTML = "Only works while on <a href='https://www.google.com/maps' target='_blank'>Google Maps</a>";
        runButton.hidden = true;
        formatChoice.hidden = true;
        scrapeLocations.hidden = true;
    }
})


runButton.addEventListener('click', async function() {
    await chrome.scripting.executeScript({
        target: {tabId: currentTab.id},
        function: scrollListings
    });
    let data = await chrome.scripting.executeScript({
        target: {tabId: currentTab.id},
        function: scrapeListings
    });
    processData(data[0].result);
});


async function scrollListings() {
    const resultsSelector = "#QA0Szd > div > div > div.w6VYqd > div.bJzME.tTVLSc" + 
        " > div > div.e07Vkf.kA9KIf > div > div > div.m6QErb.DxyBCb.kA9KIf.dS8AEf.ecceSd" + 
        " > div.m6QErb.DxyBCb.kA9KIf.dS8AEf.ecceSd";
    const el = document.querySelector(resultsSelector);
    const scrollDistance = el.scrollHeight;
    for (let i = 0; i < 20; i++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        if (el.scrollTop !== (el.scrollHeight - el.offsetHeight)) {
            el.scrollBy(0, scrollDistance);
        } else {
            break;
        }
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
    let places = [["name", "type", "rating", "address", "phone", "website"]];
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




