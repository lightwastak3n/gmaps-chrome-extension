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
