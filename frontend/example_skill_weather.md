# Weather Assistant Skill

This skill teaches the AI how to help with weather-related queries.

## Description

Enables weather lookups and weather-based recommendations.

## Tool: get_weather

Retrieves current weather information for a given location. The AI can use this to answer questions about current weather conditions, temperature, and provide weather-based advice.

**Parameters:**
- location: City name or coordinates
- units: metric or imperial

## Tool: weather_advice

Provides clothing and activity recommendations based on weather conditions. Helps users decide what to wear or what activities are suitable for the current weather.

**Parameters:**
- temperature: Current temperature
- conditions: Weather conditions (sunny, rainy, cloudy, etc.)

## Examples

User: "What's the weather like in Tokyo?"
AI: Uses get_weather tool to fetch current conditions

User: "Should I bring an umbrella today?"
AI: Uses get_weather to check precipitation and provides advice
