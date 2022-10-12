import $, { get } from 'jquery';
import moment from 'moment';
import events from './events';

const OPENWEATHER_API_KEY = 'dbc2e3e877d3b42a9389d36216570e5b';

const iconTranslate = {
    '01d': 'sunny',
    '01n': 'night',
    '02d': 'partly-cloudy',
    '02n': 'night-partly-cloud',
    '03d': 'cloudy',
    '03n': 'cloudy',
    '04d': 'cloudy',
    '04n': 'cloudy',
    '09d': 'rainy',
    '09n': 'rainy',
    '10d': 'pouring',
    '10n': 'pouring',
    '11d': 'lightning',
    '11n': 'lightning',
    '13d': 'snowy',
    '13n': 'snowy',
    '50d': 'fog',
    '50n': 'fog',
};

const bkgTranslate = {
    '01d': 'sunny',
    '01n': 'night-clear',
    '02d': 'partly-cloudy',
    '02n': 'partly-cloud',
    '03d': 'cloudy',
    '03n': 'cloudy',
    '04d': 'cloudy',
    '04n': 'cloudy',
    '09d': 'rainy',
    '09n': 'rainy',
    '10d': 'rainy',
    '10n': 'rainy',
    '11d': 'thunderstorm',
    '11n': 'thunderstorm',
    '13d': 'snowy',
    '13n': 'snowy',
    '50d': 'fog',
    '50n': 'fog',
};

async function getNearestCity({ latitude, longitude }) {
    try {
        const response = await fetch(
            'http://api.openweathermap.org/geo/1.0/reverse?' +
                `lat=${latitude}&lon=${longitude}&limit=1&appid=${OPENWEATHER_API_KEY}`
        );
        if (!response.ok) throw new Error('Request failed.');
        const city = await response.json();

        return city[0].name;
    } catch (error) {
        alert(error.message);
    }
}

async function getCurrentWeather(city, units) {
    try {
        const response = await fetch(
            'https://api.openweathermap.org/data/2.5/weather?' +
                `q=${city}&appid=${OPENWEATHER_API_KEY}&units=${units}`
        );
        if (response.status === 404) events.emit('cityNotFound');
        if (!response.ok) throw new Error('Request failed.');
        const currWeather = await response.json();

        return currWeather;
    } catch (error) {
        console.log(error.message);
    }
}

async function get5daysForecast(city, units) {
    try {
        const response = await fetch(
            'https://api.openweathermap.org/data/2.5/forecast?' +
                `q=${city}&appid=${OPENWEATHER_API_KEY}&units=${units}`
        );
        if (!response.ok) throw new Error('Request failed.');
        const currWeather = await response.json();

        return currWeather;
    } catch (error) {
        console.log(error.message);
    }
}

let main = (function () {
    const $bkg = $('body');
    const $unitsButtons = $('.units');
    const $currLocButton = $('#current-loc');
    const $cityForm = $('#search-city');
    const $notFound = $('#not-found');

    $unitsButtons.on('click', switchUnits);
    $currLocButton.on('click', switchCity);
    $cityForm.on('submit', hideError);

    events.on('cityNotFound', renderError);
    events.on('weatherUpdated', renderBackground);

    switchCity();

    function switchUnits() {
        $unitsButtons.toggleClass('active');
        const newUnits = $('.units.active').attr('id');

        events.emit('unitsSwitched', newUnits);
        hideError();
    }

    async function switchCity() {
        const newCity = await getCurrentCity();

        events.emit('citySwitched', newCity);
        hideError();
    }

    function getCurrentCity() {
        async function findCity(position, resolve) {
            const nearestCity = await getNearestCity(position.coords);

            resolve(nearestCity);
        }

        function logError(error, resolve) {
            if (error.code === error.PERMISSION_DENIED) {
                alert(
                    'Could not retrieve current location.\n' +
                        'Loading default location instead (Barcelona, ES).'
                );
            }
            resolve('Barcelona, ES');
        }

        return new Promise((resolve) => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => findCity(position, resolve),
                    (error) => logError(error, resolve)
                );
            } else {
                alert('Could not retrieve current location.');
            }
        });
    }

    function renderBackground(icon) {
        $bkg.css({ 'background-image': `url(media/bkg/${bkgTranslate[icon]}.jpg` });
    }

    function renderError() {
        $notFound.removeClass('hidden');
    }

    function hideError() {
        $notFound.addClass('hidden');
    }
})();

let todayWeather = (function () {
    const $card = $('#today');
    const $city = $card.find('.city');
    const $date = $card.find('.date');
    const $time = $card.find('.time');
    const $icon = $card.find('.weather-icon');
    const $temp = $card.find('.temperature');
    const $desc = $card.find('.description');
    const $windSpeed = $card.find('#windspeed');
    const $humidity = $card.find('#humidity');
    const $feelsLike = $card.find('#feels-like');
    const $cityForm = $('#search-city');

    let currCity;
    let currUnits = 'metric';

    $cityForm.on('submit', submitCity);
    events.on('unitsSwitched', updateUnits);
    events.on('citySwitched', updateCity);

    function submitCity(e) {
        e.preventDefault();

        const newCity = $cityForm.find('#city-input')[0].value;
        updateCity(newCity);
    }

    async function updateUnits(newUnits) {
        currUnits = newUnits;
        const weather = await getCurrentWeather(currCity, currUnits);

        render(weather);
    }

    async function updateCity(newCity) {
        currCity = newCity;
        const weather = await getCurrentWeather(currCity, currUnits);

        render(weather);
        events.emit('weatherUpdated', weather.weather[0].icon);
    }

    async function render(weather) {
        try {
            const tempUnits = currUnits === 'metric' ? 'ºC' : 'ºF';
            const windUnits = currUnits === 'metric' ? 'm/s' : 'mph';

            const date = moment.utc((weather.dt + weather.timezone) * 1000);
            const displayDate = date.format('dddd, Do MMM YYYY');
            const displayTime = date.format('hh:mm a');

            $city.text(`${weather.name} (${weather.sys.country})`);
            $date.text(displayDate);
            $time.text(displayTime);
            $icon.attr('src', `media/icons/${iconTranslate[weather.weather[0].icon]}.svg`);
            $temp.text(`${Number.parseInt(weather.main.temp)}${tempUnits}`);
            $desc.text(weather.weather[0].description);
            $windSpeed.text(`${Number.parseInt(weather.wind.speed)} ${windUnits}`);
            $humidity.text(`${weather.main.humidity}%`);
            $feelsLike.text(`${Number.parseInt(weather.main.feels_like)}${tempUnits}`);
        } catch (error) {
            console.log("Could not load today's weather.");
        }
    }
})();

let dayCard = function (card) {
    const $card = $(card);
    const $weekday = $card.find('.weekday');
    const $date = $card.find('.date');
    const $icon = $card.find('.weather-icon');
    const $temp = $card.find('.temperature');
    const $tempUnits = $card.find('.temp-units');
    const $desc = $card.find('.description');

    function render(weather, units) {
        const tempUnits = units === 'metric' ? 'ºC' : 'ºF';

        const date = moment.utc(weather.dt * 1000);
        const displayDate = date.format('Do MMMM');
        const displayWeekDay = date.format('dddd');

        $weekday.text(displayWeekDay);
        $date.text(displayDate);
        $icon.attr('src', `media/icons/${iconTranslate[weather.weather[0].icon]}.svg`);
        $temp.text(Number.parseInt(weather.main.temp));
        $tempUnits.text(tempUnits);
        $desc.text(weather.weather[0].description);
    }

    return {
        render,
    };
};

let nextDaysForecast = (function () {
    const $cityForm = $('#search-city');

    let cards = $('.day-container').map((idx, card) => dayCard(card));
    let currCity;
    let currUnits = 'metric';

    $cityForm.on('submit', submitCity);

    events.on('unitsSwitched', updateUnits);
    events.on('citySwitched', updateCity);

    async function submitCity(e) {
        e.preventDefault();

        const nextCity = $cityForm.find('#city-input')[0].value;
        updateCity(nextCity);
    }

    async function updateUnits(units) {
        currUnits = units;
        const forecast = await get5daysForecast(currCity, currUnits);

        render(forecast);
    }

    async function updateCity(newCity) {
        currCity = newCity;
        const forecast = await get5daysForecast(currCity, currUnits);

        render(forecast);
    }

    function render(forecast) {
        try {
            let forecast5Days = forecast.list.filter(
                (timestamp) => moment(timestamp.dt * 1000).format('k') === '11'
            );

            forecast5Days.forEach((weather, idx) => {
                cards[idx].render(weather, currUnits);
            });
        } catch (error) {
            console.log('Could not load next 5 days forecast.');
        }
    }
})();
