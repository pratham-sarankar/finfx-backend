"""
FinFX Backend Python SDK

This SDK provides a simple interface for AI bots to add and update signals
in the FinFX system. It handles authentication, token management, and API calls.

Usage:
    from finfx_sdk import FinFXSDK
    
    sdk = FinFXSDK()
    signal_data = {
        "entryTime": "2024-01-15T10:30:00Z",
        "entryPrice": 50000.0,
        "direction": "long",
        "userId": "507f1f77bcf86cd799439011",
        "lotSize": 1.0,
        "pairName": "BTC/USDT"
    }
    result = sdk.add_signal(signal_data)
"""

import os
import json
import time
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import requests

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class FinFXSDK:
    """
    FinFX Backend SDK for Python
    
    Provides authentication and signal management functionality for AI bots
    to interact with the FinFX backend system.
    """
    
    def __init__(self, token_file: str = "token.txt"):
        """
        Initialize the FinFX SDK
        
        Args:
            token_file (str): Path to file where auth token will be stored
        """
        self.base_url = self._get_env_var("FINFX_BACKEND_URL", "http://localhost:3000")
        self.admin_email = self._get_env_var("FINFX_ADMIN_EMAIL")
        self.admin_password = self._get_env_var("FINFX_ADMIN_PASSWORD")
        self.token_file = token_file
        self.token = None
        self.token_expires_at = None
        
        # Load existing token if available
        self._load_token()
    
    def _get_env_var(self, var_name: str, default: Optional[str] = None) -> str:
        """Get environment variable with optional default"""
        value = os.getenv(var_name, default)
        if value is None:
            raise ValueError(f"Environment variable {var_name} is required")
        return value
    
    def _load_token(self) -> None:
        """Load token from file if it exists and is valid"""
        try:
            if os.path.exists(self.token_file):
                with open(self.token_file, 'r') as f:
                    token_data = json.load(f)
                    self.token = token_data.get('token')
                    expires_str = token_data.get('expires_at')
                    if expires_str:
                        self.token_expires_at = datetime.fromisoformat(expires_str)
                        
                        # Check if token is still valid (with 5 minute buffer)
                        if self.token_expires_at > datetime.now() + timedelta(minutes=5):
                            logger.info("Loaded valid token from file")
                            return
                        else:
                            logger.info("Stored token has expired or will expire soon")
                            
                self.token = None
                self.token_expires_at = None
        except Exception as e:
            logger.warning(f"Failed to load token from file: {e}")
            self.token = None
            self.token_expires_at = None
    
    def _save_token(self) -> None:
        """Save token to file"""
        try:
            token_data = {
                'token': self.token,
                'expires_at': self.token_expires_at.isoformat() if self.token_expires_at else None
            }
            with open(self.token_file, 'w') as f:
                json.dump(token_data, f)
            logger.info("Token saved to file")
        except Exception as e:
            logger.error(f"Failed to save token to file: {e}")
    
    def _authenticate(self) -> bool:
        """
        Authenticate with the backend and obtain JWT token
        
        Returns:
            bool: True if authentication successful, False otherwise
        """
        try:
            login_url = f"{self.base_url}/api/auth/login"
            payload = {
                "email": self.admin_email,
                "password": self.admin_password
            }
            
            logger.info("Attempting to authenticate with backend...")
            response = requests.post(login_url, json=payload, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get('token')
                
                if self.token:
                    # JWT tokens typically expire in 7 days (as seen in authController)
                    self.token_expires_at = datetime.now() + timedelta(days=7)
                    self._save_token()
                    logger.info("Authentication successful")
                    return True
                else:
                    logger.error("No token received from authentication")
                    return False
            else:
                logger.error(f"Authentication failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Authentication error: {e}")
            return False
    
    def _ensure_authenticated(self) -> bool:
        """
        Ensure we have a valid authentication token
        
        Returns:
            bool: True if authenticated, False otherwise
        """
        # Check if we have a valid token
        if self.token and self.token_expires_at:
            if self.token_expires_at > datetime.now() + timedelta(minutes=5):
                return True
        
        # Need to authenticate
        return self._authenticate()
    
    def _make_request(self, method: str, endpoint: str, data: Optional[Dict] = None) -> Optional[Dict]:
        """
        Make authenticated request to the API
        
        Args:
            method (str): HTTP method (GET, POST, PUT, DELETE)
            endpoint (str): API endpoint (without base URL)
            data (Dict, optional): Request payload for POST/PUT requests
            
        Returns:
            Dict: Response data if successful, None otherwise
        """
        if not self._ensure_authenticated():
            logger.error("Failed to authenticate")
            return None
        
        try:
            url = f"{self.base_url}{endpoint}"
            headers = {
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json"
            }
            
            response = requests.request(
                method=method,
                url=url,
                headers=headers,
                json=data,
                timeout=30
            )
            
            if response.status_code in [200, 201]:
                return response.json()
            elif response.status_code == 401:
                logger.warning("Token expired, attempting to re-authenticate...")
                self.token = None
                self.token_expires_at = None
                
                # Retry once with new token
                if self._ensure_authenticated():
                    headers["Authorization"] = f"Bearer {self.token}"
                    response = requests.request(
                        method=method,
                        url=url,
                        headers=headers,
                        json=data,
                        timeout=30
                    )
                    if response.status_code in [200, 201]:
                        return response.json()
                
                logger.error("Re-authentication failed")
                return None
            else:
                logger.error(f"API request failed: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"Request error: {e}")
            return None
    
    def add_signal(self, signal_data: Dict[str, Any]) -> Optional[Dict]:
        """
        Add a new signal to the system
        
        Args:
            signal_data (Dict): Signal data containing required fields:
                - entryTime (str): ISO 8601 datetime string
                - entryPrice (float): Entry price
                - direction (str): 'long' or 'short'
                - userId (str): MongoDB ObjectId (required)
                - lotSize (float): Lot size (required, minimum 0.1)
                - pairName (str): Trading pair name (required)
                Optional fields:
                - botId (str): MongoDB ObjectId  
                - stopLossPrice (float): Stop loss price
                - targetPrice (float): Target price
                - tradeId (str): Trade identifier
                - signalTime (str): Signal time
                - stoploss (float): Stop loss value
                - target1r (float): First target
                - target2r (float): Second target
                
        Returns:
            Dict: API response if successful, None otherwise
        """
        # Validate required fields
        required_fields = ['entryTime', 'entryPrice', 'direction', 'userId', 'lotSize', 'pairName']
        for field in required_fields:
            if field not in signal_data:
                logger.error(f"Missing required field: {field}")
                return None
        
        # Validate direction (convert to uppercase for API)
        direction = signal_data.get('direction')
        if not direction or direction.lower() not in ['long', 'short']:
            logger.error(f"Invalid direction: {signal_data.get('direction')}. Must be 'long' or 'short'")
            return None
        direction = direction.lower()
        
        # Validate lotSize minimum
        if signal_data['lotSize'] < 0.1:
            logger.error(f"Invalid lotSize: {signal_data['lotSize']}. Must be at least 0.1")
            return None
        
        # Convert direction to uppercase for API compatibility
        api_data = signal_data.copy()
        api_data['direction'] = direction.upper()
        
        logger.info(f"Adding signal with direction: {api_data['direction']}")
        return self._make_request('POST', '/api/signals', api_data)
    
    def update_signal(self, signal_id: str, update_data: Dict[str, Any]) -> Optional[Dict]:
        """
        Update an existing signal
        
        Args:
            signal_id (str): MongoDB ObjectId of the signal to update
            update_data (Dict): Fields to update (same as add_signal but all optional)
                
        Returns:
            Dict: API response if successful, None otherwise
        """
        if not signal_id:
            logger.error("Signal ID is required for update")
            return None
        
        # Validate direction if provided (convert to uppercase for API)
        api_data = update_data.copy()
        if 'direction' in update_data:
            direction = update_data.get('direction')
            if not direction or direction.lower() not in ['long', 'short']:
                logger.error(f"Invalid direction: {update_data.get('direction')}. Must be 'long' or 'short'")
                return None
            api_data['direction'] = direction.lower().upper()
        
        # Validate lotSize if provided
        if 'lotSize' in update_data and update_data['lotSize'] < 0.1:
            logger.error(f"Invalid lotSize: {update_data['lotSize']}. Must be at least 0.1")
            return None
        
        logger.info(f"Updating signal {signal_id}")
        return self._make_request('PUT', f'/api/signals/{signal_id}', api_data)
    
    def get_signal(self, signal_id: str) -> Optional[Dict]:
        """
        Get a signal by ID
        
        Args:
            signal_id (str): MongoDB ObjectId of the signal
            
        Returns:
            Dict: Signal data if successful, None otherwise
        """
        if not signal_id:
            logger.error("Signal ID is required")
            return None
        
        logger.info(f"Getting signal {signal_id}")
        return self._make_request('GET', f'/api/signals/{signal_id}')
    
    def get_all_signals(self) -> Optional[Dict]:
        """
        Get all signals (admin only)
        
        Returns:
            Dict: List of signals if successful, None otherwise
        """
        logger.info("Getting all signals")
        return self._make_request('GET', '/api/signals')
    
    def add_bulk_signals(self, bot_id: str, signals: list) -> Optional[Dict]:
        """
        Add multiple signals in bulk for a specific bot
        
        Args:
            bot_id (str): MongoDB ObjectId of the bot
            signals (list): List of signal dictionaries (same format as add_signal)
            
        Returns:
            Dict: API response if successful, None otherwise
        """
        if not bot_id:
            logger.error("Bot ID is required for bulk signals")
            return None
        
        if not signals or not isinstance(signals, list):
            logger.error("Signals must be a non-empty list")
            return None
        
        # Validate each signal
        required_fields = ['entryTime', 'entryPrice', 'direction', 'pairName']  # userId and lotSize handled by API
        
        for i, signal in enumerate(signals):
            for field in required_fields:
                if field not in signal:
                    logger.error(f"Signal {i}: Missing required field: {field}")
                    return None
            
            # Validate direction
            direction = signal.get('direction')
            if not direction or direction.lower() not in ['long', 'short']:
                logger.error(f"Signal {i}: Invalid direction: {signal.get('direction')}. Must be 'long' or 'short'")
                return None
            
            # Convert direction to uppercase for API
            signal['direction'] = direction.lower().upper()
        
        bulk_data = {
            "botId": bot_id,
            "signals": signals
        }
        
        logger.info(f"Adding {len(signals)} signals in bulk for bot {bot_id}")
        return self._make_request('POST', '/api/signals/bulk', bulk_data)


def create_example_signal() -> Dict[str, Any]:
    """
    Create an example signal for testing purposes
    
    Returns:
        Dict: Example signal data
    """
    return {
        "entryTime": datetime.now().isoformat() + "Z",
        "entryPrice": 50000.0,
        "direction": "long",
        "userId": "507f1f77bcf86cd799439011",  # Example MongoDB ObjectId
        "lotSize": 1.0,
        "stopLossPrice": 48000.0,
        "targetPrice": 52000.0,
        "pairName": "BTC/USDT"
    }


if __name__ == "__main__":
    """
    Example usage of the FinFX SDK
    """
    try:
        # Initialize SDK
        sdk = FinFXSDK()
        
        # Create and add a test signal
        example_signal = create_example_signal()
        print(f"Adding example signal: {example_signal}")
        
        result = sdk.add_signal(example_signal)
        if result:
            print(f"Signal added successfully: {result}")
            
            # Try to get the signal back
            signal_id = result.get('data', {}).get('id')
            if signal_id:
                retrieved_signal = sdk.get_signal(signal_id)
                print(f"Retrieved signal: {retrieved_signal}")
        else:
            print("Failed to add signal")
            
    except Exception as e:
        logger.error(f"Example execution failed: {e}")