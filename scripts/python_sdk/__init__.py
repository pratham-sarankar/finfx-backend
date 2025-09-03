"""
FinFX Python SDK

A Python SDK for integrating AI bots and other systems with the FinFX backend.
Provides authentication, token management, and signal management capabilities.
"""

from .finfx_sdk import FinFXSDK, create_example_signal

__version__ = "1.0.0"
__all__ = ["FinFXSDK", "create_example_signal"]