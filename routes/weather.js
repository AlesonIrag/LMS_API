const express = require('express');
const axios = require('axios');
const weatherLogger = require('../utils/logger');
const router = express.Router();

/**
 * GET /api/v1/weather
 * Fetch weather data for Cebu City from OpenWeatherMap API
 */
router.get('/', async (req, res) => {
  try {
    // Log API access
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || '';
    weatherLogger.logWeatherEndpointAccess(clientIP, userAgent);

    const apiKey = process.env.OPENWEATHER_API_KEY;

    if (!apiKey) {
      weatherLogger.error('Weather API key not configured in environment');
      return res.status(500).json({
        success: false,
        message: 'Weather API key not configured'
      });
    }

    const city = 'Cebu City,PH';
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;

    // Make request to OpenWeatherMap API
    const response = await axios.get(url);
    const weatherData = response.data;

    const temperature = Math.round(weatherData.main.temp);
    const location = weatherData.name;

    // Log successful API call
    weatherLogger.logWeatherAPISuccess(temperature, location);

    // Return formatted weather data
    res.json({
      success: true,
      data: {
        temperature: temperature,
        location: location,
        condition: weatherData.weather[0].main,
        description: weatherData.weather[0].description,
        icon: weatherData.weather[0].icon,
        humidity: weatherData.main.humidity,
        pressure: weatherData.main.pressure,
        windSpeed: weatherData.wind?.speed || 0,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    // Log API error
    weatherLogger.logWeatherAPIError(error, true);

    // Return fallback data if API fails
    res.status(200).json({
      success: true,
      data: {
        temperature: 31,
        location: 'Cebu City',
        condition: 'Clear',
        description: 'clear sky',
        icon: '01d',
        humidity: 65,
        pressure: 1013,
        windSpeed: 3.5,
        timestamp: new Date().toISOString(),
        fallback: true
      },
      message: 'Using fallback weather data'
    });
  }
});

/**
 * GET /api/v1/weather/forecast
 * Get 5-day weather forecast (optional endpoint)
 */
router.get('/forecast', async (req, res) => {
  try {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: 'Weather API key not configured'
      });
    }

    const city = 'Cebu City,PH';
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric`;

    const response = await axios.get(url);
    const forecastData = response.data;

    // Format forecast data (next 5 days, one entry per day)
    const dailyForecast = [];
    const processedDates = new Set();

    forecastData.list.forEach(item => {
      const date = new Date(item.dt * 1000).toDateString();
      
      if (!processedDates.has(date) && dailyForecast.length < 5) {
        dailyForecast.push({
          date: date,
          temperature: Math.round(item.main.temp),
          condition: item.weather[0].main,
          description: item.weather[0].description,
          icon: item.weather[0].icon
        });
        processedDates.add(date);
      }
    });

    res.json({
      success: true,
      data: dailyForecast
    });

  } catch (error) {
    console.error('Weather Forecast API Error:', error.message);
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch weather forecast'
    });
  }
});

module.exports = router;
