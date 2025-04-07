# Google maps scraper
Google maps scraper that lets you input list of places and business types and then automatically scrolls and collects data.

## Scraping Instructions Overview

- **General Guidelines**
  - Do not change tabs or close the extension while scraping; it will stop.
  - Default format is CSV, but Markdown is also available.
  - Scroll duration can be 20–120 seconds (default is 40s per location or until page bottom).

- **Data Collected**
  - Public, visible data only.
  - Includes: name, business type, rating, address, place, phone, and website.

## Modes of Operation

- **Scan Current Region**
  - Zoom in, search, choose format/time, then press **Run**.
  - Extension scrolls and collects data for the visible region.

- **Find Same Business in Multiple Regions**
  - Enter a business name or choose from saved ones.
  - Input one location per line (e.g., `madrid`, `warsaw`, `brent london`).
  - Press **Run** to scan across all listed regions.

- **Find Different Businesses in Different Regions**
  - Leave business type field empty.
  - Enter one search term per line in the location field (e.g., `dentist in Paris`).
  - Press **Run** to gather data per search term.

## Settings

- **Search Method**
  - *Search using URL*: Might close extension on some systems but yields better results.
  - *Search using Search Button* (default): More stable, but possibly less accurate.

- **Niche Management**
  - Create and save groups of niches for repeated use.

- **City Management**
  - Create and save groups of locations for repeated use.

## Screenshots
<img src="/samples/IMG-20240521-WA0007.jpg" height=400>