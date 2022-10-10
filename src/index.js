const OPENWEATHER_API_KEY = 'dbc2e3e877d3b42a9389d36216570e5b';

async function getCityCoords(city) {
    const response = await fetch(
        `http://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=5&appid=${OPENWEATHER_API_KEY}`
    );
    const cityInfo = await response.json();
    const { lat, lon } = cityInfo[0];

    return Promise.resolve([lat, lon]);
}
async function getCurrentWeather(city) {
    const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${OPENWEATHER_API_KEY}`
    );
    const currWeather = await response.json();

    return Promise.resolve(currWeather);
}

getCurrentWeather('London').then((weather) => console.log(weather));
