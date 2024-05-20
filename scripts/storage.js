async function updateUsageCount() {
    let currentCount = await chrome.storage.local.get("usageCount");
    let totalCount = 1;
    if (currentCount.usageCount) {
        totalCount += currentCount.usageCount;
    }
    await chrome.storage.local.set({"usageCount": totalCount});
}


async function getSavedOption(optionName) {
    const data = await chrome.storage.local.get(optionName);
    return data.optionName;
}


async function saveOptions(searchMethod, niches, cities) {
    const data = await chrome.storage.local.get(null);
    const dataToStore = {};
    if (searchMethod !== data.searchMethod) {
        dataToStore["searchMethod"] = searchMethod;
    }
    const newNiches = [...data.niches, niches];
    const newCities = [...data.cities, cities];
    await chrome.storage.local.set(dataToStore);
}

