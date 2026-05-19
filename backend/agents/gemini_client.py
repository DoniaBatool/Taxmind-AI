"""
Gemini Client — Shared Gemini API connection
Saare agents ye import karte hain
"""

import google.generativeai as genai
from config import settings

# Gemini configure karo (ek baar)
genai.configure(api_key=settings.gemini_api_key)


def get_model(temperature: float = 0.3) -> genai.GenerativeModel:
    """
    Gemini 1.5 Pro model return karo

    Args:
        temperature: 0.0 = deterministic (analysis ke liye)
                     0.7 = creative (report writing ke liye)
    """
    return genai.GenerativeModel(
        model_name=settings.gemini_model,
        generation_config=genai.types.GenerationConfig(
            temperature=temperature,
            max_output_tokens=8192,
        ),
    )


async def call_gemini(prompt: str, temperature: float = 0.3) -> str:
    """
    Gemini API call karo, response text return karo

    Args:
        prompt: Full prompt string
        temperature: Response creativity level

    Returns:
        Response text
    """
    model = get_model(temperature=temperature)
    response = await model.generate_content_async(prompt)
    return response.text


def call_gemini_sync(prompt: str, temperature: float = 0.3) -> str:
    """Synchronous version (background tasks ke liye)"""
    model = get_model(temperature=temperature)
    response = model.generate_content(prompt)
    return response.text
