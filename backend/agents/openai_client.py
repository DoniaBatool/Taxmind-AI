"""
OpenAI Client — Shared OpenAI API connection
Saare agents ye import karte hain (gemini_client.py ki jagah)
"""

from openai import OpenAI
from config import settings

# OpenAI client (sync)
client = OpenAI(api_key=settings.openai_api_key)


def call_openai_sync(prompt: str, temperature: float = 0.3) -> str:
    """
    OpenAI API call karo, response text return karo

    Args:
        prompt: Full prompt string
        temperature: 0.1 = deterministic (extraction), 0.5 = creative (writing)

    Returns:
        Response text string
    """
    response = client.chat.completions.create(
        model=settings.openai_model,
        messages=[{"role": "user", "content": prompt}],
        temperature=temperature,
        max_tokens=4096,
    )
    return response.choices[0].message.content


async def call_openai(prompt: str, temperature: float = 0.3) -> str:
    """Async version — chat routes ke liye"""
    from openai import AsyncOpenAI
    async_client = AsyncOpenAI(api_key=settings.openai_api_key)
    response = await async_client.chat.completions.create(
        model=settings.openai_model,
        messages=[{"role": "user", "content": prompt}],
        temperature=temperature,
        max_tokens=4096,
    )
    return response.choices[0].message.content
