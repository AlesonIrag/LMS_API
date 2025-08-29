const axios = require('axios');
require('dotenv').config();

async function testWeatherAPI() {
  try {
    console.log('Testing OpenWeatherMap API directly...');
    
    const apiKey = process.env.OPENWEATHER_API_KEY;
    console.log('API Key:', apiKey ? 'Found' : 'Not found');
    
    if (!apiKey) {
      console.error('❌ OPENWEATHER_API_KEY not found in .env file');
      return;
    }

    const city = 'Cebu City,PH';
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;
    
    console.log('Making request to:', url.replace(apiKey, 'HIDDEN_API_KEY'));
    
    const response = await axios.get(url);
    const data = response.data;
    
    console.log('✅ Weather API Response:');
    console.log({
      temperature: Math.round(data.main.temp) + '°C',
      location: data.name,
      condition: data.weather[0].main,
      description: data.weather[0].description,
      humidity: data.main.humidity + '%',
      pressure: data.main.pressure + ' hPa'
    });
    
  } catch (error) {
    console.error('❌ Weather API Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testWeatherAPI();
