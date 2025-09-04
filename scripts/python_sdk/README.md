# FinFX Python SDK

A Python SDK for integrating AI bots and other systems with the FinFX backend. This SDK handles authentication, token management, and provides easy-to-use functions for adding and updating signals.

## Features

- 🔐 **Automatic Authentication**: Handles login and JWT token management
- 🔄 **Token Auto-refresh**: Automatically refreshes expired tokens
- 💾 **Token Persistence**: Stores tokens in a file for reuse across sessions  
- 🚀 **Simple API**: Easy-to-use functions for signal management
- 🤖 **AI Bot Friendly**: Designed specifically for AI trading bots
- ⚡ **Bulk Operations**: Support for bulk signal creation

## Installation

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Set up environment variables by copying the example file:
```bash
cp .env.example .env
```

3. Edit `.env` with your admin credentials:
```bash
FINFX_BACKEND_URL=http://localhost:3000
FINFX_ADMIN_EMAIL=your_admin_email@example.com
FINFX_ADMIN_PASSWORD=your_admin_password
```

## Quick Start

### Basic Usage

```python
from finfx_sdk import FinFXSDK
from datetime import datetime

# Initialize the SDK
sdk = FinFXSDK()

# Create a signal
signal_data = {
    "entryTime": datetime.now().isoformat() + "Z",
    "entryPrice": 50000.0,
    "direction": "long",
    "userId": "507f1f77bcf86cd799439011",  # Valid user ID from your database
    "lotSize": 1.0,
    "pairName": "BTC/USDT",
    "stopLossPrice": 48000.0,
    "targetPrice": 52000.0,
    "pairName": "BTC/USDT"
}

# Add the signal
result = sdk.add_signal(signal_data)
if result:
    print(f"Signal added successfully: {result['data']['id']}")
else:
    print("Failed to add signal")
```

### Update a Signal

```python
# Update an existing signal
signal_id = "674b8c9d123456789abcdef0"
update_data = {
    "exitTime": datetime.now().isoformat() + "Z",
    "exitPrice": 51000.0,
    "exitReason": "target_reached",
    "profitLoss": 1000.0
}

result = sdk.update_signal(signal_id, update_data)
if result:
    print("Signal updated successfully")
```

### Bulk Signal Creation

```python
# Add multiple signals for a bot
bot_id = "674b8c9d123456789abcdef1"
signals = [
    {
        "entryTime": "2024-01-15T10:30:00Z",
        "entryPrice": 50000.0,
        "direction": "long",
        "pairName": "BTC/USDT"
    },
    {
        "entryTime": "2024-01-15T11:00:00Z", 
        "entryPrice": 49500.0,
        "direction": "short",
        "pairName": "BTC/USDT"
    }
]

result = sdk.add_bulk_signals(bot_id, signals)
if result:
    print(f"Added {len(signals)} signals successfully")
```

## API Reference

### FinFXSDK Class

#### Constructor

```python
sdk = FinFXSDK(token_file="token.txt")
```

**Parameters:**
- `token_file` (str, optional): Path to file where auth token will be stored. Defaults to "token.txt".

#### Methods

##### add_signal(signal_data)

Adds a new signal to the system.

**Parameters:**
- `signal_data` (dict): Signal data with the following fields:

**Required fields:**
- `entryTime` (str): ISO 8601 datetime string (e.g., "2024-01-15T10:30:00Z")
- `entryPrice` (float): Entry price
- `direction` (str): Either "long" or "short"
- `userId` (str): MongoDB ObjectId of a valid user in the system
- `lotSize` (float): Lot size for the trade (minimum 0.1)
- `pairName` (str): Trading pair name (e.g., "BTC/USDT")

**Optional fields:**
- `userId` (str): MongoDB ObjectId of the user
- `botId` (str): MongoDB ObjectId of the bot
- `stopLossPrice` (float): Stop loss price
- `targetPrice` (float): Target price
- `tradeId` (str): Trade identifier
- `signalTime` (str): Signal generation time
- `stoploss` (float): Stop loss value
- `target1r` (float): First target (R multiple)
- `target2r` (float): Second target (R multiple)
- `pairName` (str): Trading pair name (e.g., "BTC/USDT")

**Returns:**
- `dict` or `None`: API response if successful, None otherwise

##### update_signal(signal_id, update_data)

Updates an existing signal.

**Parameters:**
- `signal_id` (str): MongoDB ObjectId of the signal to update
- `update_data` (dict): Fields to update (same as add_signal but all optional)

**Additional update fields:**
- `exitTime` (str): ISO 8601 datetime string for exit
- `exitPrice` (float): Exit price
- `exitReason` (str): Reason for exit
- `profitLoss` (float): Profit or loss amount
- `profitLossR` (float): Profit or loss in R multiples
- `trailCount` (int): Trail count

**Returns:**
- `dict` or `None`: API response if successful, None otherwise

##### get_signal(signal_id)

Retrieves a signal by ID.

**Parameters:**
- `signal_id` (str): MongoDB ObjectId of the signal

**Returns:**
- `dict` or `None`: Signal data if successful, None otherwise

##### get_all_signals()

Retrieves all signals (admin only).

**Returns:**
- `dict` or `None`: List of signals if successful, None otherwise

##### add_bulk_signals(bot_id, signals)

Adds multiple signals in bulk for a specific bot.

**Parameters:**
- `bot_id` (str): MongoDB ObjectId of the bot
- `signals` (list): List of signal dictionaries (same format as add_signal)

**Returns:**
- `dict` or `None`: API response if successful, None otherwise

## Environment Variables

The SDK requires the following environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `FINFX_BACKEND_URL` | FinFX backend server URL | `http://localhost:3000` |
| `FINFX_ADMIN_EMAIL` | Admin user email | `admin@example.com` |
| `FINFX_ADMIN_PASSWORD` | Admin user password | `secure_password` |

## Authentication & Token Management

The SDK automatically handles authentication:

1. **First Run**: Authenticates using admin credentials and stores the JWT token
2. **Subsequent Runs**: Reuses the stored token if valid
3. **Token Expiry**: Automatically re-authenticates when the token expires
4. **Token Storage**: Tokens are stored in a local file (default: `token.txt`)

## Error Handling

The SDK includes comprehensive error handling:

- **Network Errors**: Automatic retry for temporary network issues
- **Authentication Errors**: Clear error messages for credential issues
- **Validation Errors**: Input validation with descriptive error messages
- **API Errors**: Proper handling of HTTP error responses

## Integration Examples

### AI Trading Bot Integration

```python
import os
from finfx_sdk import FinFXSDK
from datetime import datetime

class TradingBot:
    def __init__(self):
        self.sdk = FinFXSDK()
    
    def send_signal(self, pair, direction, price, stop_loss=None, target=None):
        """Send a trading signal to FinFX"""
        signal_data = {
            "entryTime": datetime.now().isoformat() + "Z",
            "entryPrice": price,
            "direction": direction,
            "pairName": pair,
            "lotSize": 1.0
        }
        
        if stop_loss:
            signal_data["stopLossPrice"] = stop_loss
        if target:
            signal_data["targetPrice"] = target
            
        result = self.sdk.add_signal(signal_data)
        return result is not None

# Usage
bot = TradingBot()
success = bot.send_signal("BTC/USDT", "buy", 50000, 48000, 52000)
if success:
    print("Signal sent successfully!")
```

### Automated Signal Updates

```python
def update_signal_on_exit(signal_id, exit_price, exit_reason):
    """Update signal when trade exits"""
    sdk = FinFXSDK()
    
    update_data = {
        "exitTime": datetime.now().isoformat() + "Z",
        "exitPrice": exit_price,
        "exitReason": exit_reason
    }
    
    # Calculate profit/loss if entry price is available
    signal = sdk.get_signal(signal_id)
    if signal and signal.get('data'):
        entry_price = signal['data'].get('entryPrice')
        direction = signal['data'].get('direction')
        
        if entry_price and direction:
            if direction in ['long']:
                pnl = exit_price - entry_price
            else:  # direction == 'short'
                pnl = entry_price - exit_price
                
            update_data["profitLoss"] = pnl
    
    result = sdk.update_signal(signal_id, update_data)
    return result is not None
```

## Security Considerations

1. **Environment Variables**: Store credentials in environment variables, never in code
2. **Token Security**: The token file contains sensitive data - ensure proper file permissions
3. **Admin Access**: Only use admin accounts that need signal creation privileges
4. **Network Security**: Use HTTPS in production environments

## Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Check admin credentials in environment variables
   - Ensure the admin user has the correct role in the system
   - Verify the backend URL is correct and accessible

2. **Token Errors**
   - Delete the `token.txt` file to force re-authentication
   - Check file permissions for the token file

3. **API Errors**
   - Check the backend logs for detailed error information
   - Ensure required fields are provided in signal data
   - Validate that direction values are correct

### Debug Mode

Enable debug logging to see detailed API communication:

```python
import logging
logging.basicConfig(level=logging.DEBUG)

sdk = FinFXSDK()
```

## Support

For issues and questions:

1. Check the FinFX backend logs for detailed error information
2. Ensure your admin user has the proper permissions
3. Verify all required fields are provided when creating signals
4. Review the API documentation for field requirements

## Version History

- **1.0.0**: Initial release with authentication and signal management