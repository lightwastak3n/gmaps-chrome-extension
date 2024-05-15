const runButton = document.getElementById("runbutton");
const description = document.querySelector("main p");

document.addEventListener("DOMContentLoaded", function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        let currentTab = tabs[0];
        console.log(currentTab);
        if (!currentTab.url.includes("google.com/maps")) {
            description.innerText = "Only works while on Google Maps.";
            runButton.hidden = true;
            dataFormat.hidden = true;
        } else {
            runButton.addEventListener('click', function() {
                chrome.scripting.executeScript({
                    target: {tabId: currentTab.id},
                    function: scrapeListings
                }, function(output) {
                    if (dataFormat.value == "csv") {
                        parseCsv(output[0].result);
                    } else {
                        parseMarkdown(output[0].result);
                    }
                    console.log("Done.");
                });
            });
        }
    });
});

async function scrollElement(el) {
    // Scroll the results for 20 "pages" or until we hit bottom
    // const wait = (sec) => {
    //     return new Promise(resolve => {
    //         setTimeout(resolve, sec * 1000);
    //     });
    // }
    // const scrollDistance = el.scrollHeight;
    // let times_scrolled = 0;
    // while (el.scrollTop != (el.scrollHeight - el.offsetHeight) && times_scrolled < 20) {
    //     el.scrollBy(0, scrollDistance);
    //     times_scrolled++;
    //     console.log("scrolled this many times", times_scrolled);
    //     await wait(2);
    // }
    // console.log("Reached the bottom.");
    return new Promise(resolve => {
        const scrollDistance = el.scrollHeight;
        let times_scrolled = 0;
        while (el.scrollTop !== (el.scrollHeight - el.offsetHeight) && times_scrolled < 20) {
            setTimeout(() => {
                el.scrollBy(0, scrollDistance);
            }, 1000);
            times_scrolled++;
        }
        resolve();
    })
}

async function scrapeListings() {
    console.log("Called scrapeListings");
    const resultsSelector = "#QA0Szd > div > div > div.w6VYqd > div.bJzME.tTVLSc" + 
        " > div > div.e07Vkf.kA9KIf > div > div > div.m6QErb.DxyBCb.kA9KIf.dS8AEf.ecceSd" + 
        " > div.m6QErb.DxyBCb.kA9KIf.dS8AEf.ecceSd";
    const el = document.querySelector(resultsSelector);
    // el.scrollBy(0, 500);
    // await scrollElement(resultsElement);
    const scrollDistance = el.scrollHeight;
    for (let i = 0; i < 20; i++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        if (el.scrollTop !== (el.scrollHeight - el.offsetHeight)) {
            el.scrollBy(0, scrollDistance);
        } else {
            let data = getData()
            console.log("Got data", data);
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
            break;
        }
    }


    function getData() {
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
    // const cleanStr = (str) => {
    //     if (!str) {
    //         return "";
    //     }
    //     const r = [",", "/", "|"];
    //     return str.split('').map(char => r.includes(char) ? ' ' : char).join('');
    // }
    // // Clean names and addresses
    // for (let i = 0; i < places.length; i++) {
    //     places[i][0] = cleanStr(places[i][0]);
    //     places[i][3] = cleanStr(places[i][3]);
    // }
    // let csvData = places.map(row => row.join(",")).join("\n");
    // let csvFile = new Blob([csvData], {type: "text/csv;charset=utf-8;"});
    // let csvUrl = URL.createObjectURL(csvFile);
    // let csvLink = document.createElement("a");
    // csvLink.href = csvUrl;
    // csvLink.download = "google_maps.csv";
    // csvLink.click();

    // return places;
}

function parseCsv(data) {
    console.log("Got data", data);
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

function getEverything() {
    scrapeListings().then((output) => {
        if (dataFormat.value == "csv") {
            parseCsv(output);
        } else {
            parseMarkdown(output);
        }
    });
}
