// This script can be used to fetch and display weather data from your backend API
// and update the DOM accordingly. Make sure your backend serves the correct endpoints.

document.addEventListener('DOMContentLoaded', () => {
    const weatherInfo = document.getElementById('weather-info');
    const updated = document.getElementById('updated');
    const manualBtn = document.getElementById('manual-update');

    // Map weather conditions to emoji icons
    function getWeatherIcon(condition) {
        const icons = {
            'Clear': '☀️',
            'Sunny': '☀️',
            'Partly Cloudy': '⛅',
            'Cloudy': '☁️',
            'Overcast': '☁️',
            'Rain': '🌧️',
            'Showers': '🌦️',
            'Thunderstorm': '⛈️',
            'Snow': '❄️',
            'Fog': '🌫️',
            'Mist': '🌫️',
            'Windy': '💨',
            'Hail': '🌨️',
            'Drizzle': '🌦️',
            'Sleet': '🌨️',
            'Tornado': '🌪️',
            'Hurricane': '🌀',
            'Sandstorm': '🌪️',
            'Smoke': '💨'
        };
        return icons[condition] || '🌡️';
    }

    async function fetchWeather() {
        try {
            const res = await fetch('/weather');
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            const icon = getWeatherIcon(data.condition);
            weatherInfo.innerHTML = `
                <div class="weather-icon">${icon}</div>
                <span><strong>Temperature:</strong> ${data.temperature} °C</span>
                <span><strong>Humidity:</strong> ${data.humidity} %</span>
                <span><strong>Condition:</strong> ${data.condition}</span>
            `;
            updated.textContent = 'Last updated: ' + new Date().toLocaleTimeString();
        } catch (e) {
            weatherInfo.innerHTML = '<span style="color:red;">Error loading weather data.</span>';
        }
    }

    if (manualBtn) {
        manualBtn.addEventListener('click', async () => {
            manualBtn.disabled = true;
            manualBtn.textContent = 'Updating...';
            try {
                const res = await fetch('/weather/manual-update', { method: 'POST' });
                if (!res.ok) throw new Error('Manual update failed');
                await fetchWeather();
            } catch (e) {
                alert('Manual update failed.');
            } finally {
                manualBtn.disabled = false;
                manualBtn.textContent = 'Manual Update';
            }
        });
    }

    // Auto update every 30 seconds
    fetchWeather();
    setInterval(fetchWeather, 30000);
});