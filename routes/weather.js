const express=require('express');
const axios=require('axios');
const weatherLogger=require('../utils/logger');
const router=express.Router();

router.get('/',async(req,res)=>{
try{
const clientIP=req.ip||req.connection.remoteAddress||'unknown';
const userAgent=req.get('User-Agent')||'';
weatherLogger.logWeatherEndpointAccess(clientIP,userAgent);
const apiKey=process.env.OPENWEATHER_API_KEY;
if(!apiKey){
weatherLogger.error('Weather API key not configured in environment');
return res.status(500).json({success:false,message:'Weather API key not configured'});
}
const city='Cebu City,PH';
const url=`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;
const response=await axios.get(url);
const weatherData=response.data;
const temperature=Math.round(weatherData.main.temp);
const location=weatherData.name;
weatherLogger.logWeatherAPISuccess(temperature,location);
res.json({success:true,data:{temperature:temperature,location:location,condition:weatherData.weather[0].main,description:weatherData.weather[0].description,icon:weatherData.weather[0].icon,humidity:weatherData.main.humidity,pressure:weatherData.main.pressure,windSpeed:weatherData.wind?.speed||0,timestamp:new Date().toISOString()}});
}catch(error){
weatherLogger.logWeatherAPIError(error,true);
res.status(200).json({success:true,data:{temperature:31,location:'Cebu City',condition:'Clear',description:'clear sky',icon:'01d',humidity:65,pressure:1013,windSpeed:3.5,timestamp:new Date().toISOString(),fallback:true},message:'Using fallback weather data'});
}
});

router.get('/forecast',async(req,res)=>{
try{
const apiKey=process.env.OPENWEATHER_API_KEY;
if(!apiKey){
return res.status(500).json({success:false,message:'Weather API key not configured'});
}
const city='Cebu City,PH';
const url=`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric`;
const response=await axios.get(url);
const forecastData=response.data.list;
res.json({success:true,data:forecastData});
}catch(error){
res.status(500).json({success:false,message:'Failed to retrieve forecast data',error:error.message});
}
});

router.get('/forecast/daily',async(req,res)=>{
try{
const apiKey=process.env.OPENWEATHER_API_KEY;
if(!apiKey){
return res.status(500).json({success:false,message:'Weather API key not configured'});
}
const city='Cebu City,PH';
const url=`https://api.openweathermap.org/data/2.5/forecast/daily?q=${city}&appid=${apiKey}&units=metric&cnt=7`;
const response=await axios.get(url);
res.json({success:true,data:response.data});
}catch(error){
res.status(500).json({success:false,message:'Failed to retrieve daily forecast data',error:error.message});
}
});

module.exports=router;