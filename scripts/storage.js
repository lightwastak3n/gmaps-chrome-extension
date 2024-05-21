async function updateUsageCount() {
    const currentCount = await chrome.storage.local.get("usageCount");
    let totalCount = 1;
    if (currentCount.usageCount) {
        totalCount += currentCount.usageCount;
    }
    await chrome.storage.local.set({"usageCount": totalCount});
}


async function getSavedOption(optionName) {
    const data = await chrome.storage.local.get(optionName);
    return data[optionName];
}


async function saveOptions(searchMethod, niches, cities) {
    console.log("Called saveOptions with data", searchMethod, niches, cities);
    const data = await chrome.storage.local.get(null);
    const dataToStore = {};
    if (searchMethod !== data.searchMethod) {
        dataToStore["searchMethod"] = searchMethod;
    }
    let allNiches = data.niches ? [...data.niches] : [];
    if (niches) {
        allNiches.push(niches);
        dataToStore["niches"] = allNiches;
    }
    let allCities = data.cities ? [...data.cities] : [];
    if (cities) {
        allCities.push(cities);
        dataToStore["cities"] = allCities;
    }
    await chrome.storage.local.set(dataToStore);
    console.log("Saved new options", dataToStore);
}

