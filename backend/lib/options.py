"""Canonical answer options — mirrored by frontend/src/lib/options.ts."""

GENDERS = ["Male", "Female", "Non-binary", "Other"]
PERSONALITIES = ["Introvert", "Extrovert", "Ambivert"]
QUALITIES = [
    "Loyal", "Kind", "Funny", "Humorous", "Ambitious", "Intellectual", "Confident", "Caring",
    "Creative", "Romantic", "Adventurous", "Shy", "Emotional", "Foodie", "Nerd",
]
DATING_VIBES = ["Gen Z", "Old School", "Hopeless Romantic", "Casual & Fun", "Deep Conversations", "Friends First"]
LIFESTYLES = [
    "Party Lover", "Fitness Enthusiast", "Book Lover", "Traveller", "Movie Buff", "Music Lover", "Gamer", "Food Explorer",
]
INTENTIONS = ["Serious Relationship", "Getting to Know Someone", "Friendship First", "Open to Connections", "Hookup"]

# Questions the admin can reword / re-option from "Form & settings". Keys are fixed; title, hint and options are editable.
QUESTION_KEYS = ["personality", "qualities", "vibe", "lifestyle", "intention"]
DEFAULT_QUESTIONS = {
    "personality": {"title": "Personality", "hint": "", "options": PERSONALITIES},
    "qualities": {"title": "Choose your qualities", "hint": "Pick as many as feel like you", "options": QUALITIES},
    "vibe": {"title": "Dating vibe", "hint": "", "options": DATING_VIBES},
    "lifestyle": {"title": "Lifestyle", "hint": "Select all that apply", "options": LIFESTYLES},
    "intention": {"title": "Relationship type", "hint": "What are you looking for?", "options": INTENTIONS},
}
