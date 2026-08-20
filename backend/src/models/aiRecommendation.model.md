# AI Recommendation Model Documentation

## Purpose
Executes MySQL queries for `ai_recommendations` table.

## Functions
- `insertAIRecommendation()`: Saves candidate match object with confidence score.
- `findRecommendationsByCaseId()`: Fetches candidate evaluation history for a case.
- `findRecommendationById()`: Fetches single recommendation by primary key ID.
