#!/usr/bin/env python3
"""
Test script for FinFX Python SDK

This script tests the basic functionality of the SDK including:
- Authentication
- Token management
- Signal creation
- Signal retrieval
- Signal updates

Run this script to verify the SDK is working correctly.
"""

import os
import sys
import time
import tempfile
from datetime import datetime

# Add current directory to path to import the SDK
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from finfx_sdk import FinFXSDK, create_example_signal


def test_sdk():
    """Test the SDK functionality"""
    print("🧪 Testing FinFX Python SDK...")
    print("=" * 50)
    
    # Check environment variables
    required_vars = ['FINFX_BACKEND_URL', 'FINFX_ADMIN_EMAIL', 'FINFX_ADMIN_PASSWORD']
    missing_vars = []
    
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print("❌ Missing required environment variables:")
        for var in missing_vars:
            print(f"   - {var}")
        print("\nPlease set these variables in your .env file or environment.")
        print("See .env.example for the required format.")
        return False
    
    print("✅ Environment variables configured")
    
    # Use a temporary token file for testing
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as tmp_file:
        token_file = tmp_file.name
    
    try:
        # Initialize SDK
        print(f"\n📡 Initializing SDK with backend: {os.getenv('FINFX_BACKEND_URL')}")
        sdk = FinFXSDK(token_file=token_file)
        
        # Test authentication by making a simple API call
        print("🔐 Testing authentication...")
        signals = sdk.get_all_signals()
        if signals is None:
            print("❌ Authentication failed or API error")
            return False
        
        print("✅ Authentication successful")
        
        # Test signal creation
        print("\n📊 Testing signal creation...")
        test_signal = create_example_signal()
        
        # Add some test-specific data
        test_signal.update({
            "pairName": "TEST/USDT",
            "lotSize": 0.1,
            "stopLossPrice": test_signal["entryPrice"] * 0.95,
            "targetPrice": test_signal["entryPrice"] * 1.05
        })
        
        print(f"Creating signal: {test_signal['direction']} {test_signal['pairName']} at {test_signal['entryPrice']}")
        
        result = sdk.add_signal(test_signal)
        if not result:
            print("❌ Signal creation failed")
            return False
        
        signal_id = result.get('data', {}).get('id')
        if not signal_id:
            print("❌ No signal ID returned")
            return False
        
        print(f"✅ Signal created successfully with ID: {signal_id}")
        
        # Test signal retrieval
        print(f"\n🔍 Testing signal retrieval...")
        retrieved_signal = sdk.get_signal(signal_id)
        if not retrieved_signal:
            print("❌ Failed to retrieve signal")
            return False
        
        signal_data = retrieved_signal.get('data', {})
        if signal_data.get('pairName') != test_signal['pairName']:
            print("❌ Retrieved signal data doesn't match")
            return False
        
        print("✅ Signal retrieved successfully")
        
        # Test signal update
        print(f"\n✏️  Testing signal update...")
        update_data = {
            "exitTime": datetime.now().isoformat() + "Z",
            "exitPrice": test_signal["entryPrice"] * 1.02,
            "exitReason": "test_exit",
            "profitLoss": test_signal["entryPrice"] * 0.02
        }
        
        update_result = sdk.update_signal(signal_id, update_data)
        if not update_result:
            print("❌ Signal update failed")
            return False
        
        print("✅ Signal updated successfully")
        
        # Test token persistence
        print(f"\n💾 Testing token persistence...")
        if os.path.exists(token_file):
            print("✅ Token file created")
            
            # Create new SDK instance to test token loading
            sdk2 = FinFXSDK(token_file=token_file)
            test_signals = sdk2.get_all_signals()
            if test_signals is not None:
                print("✅ Token loaded and reused successfully")
            else:
                print("❌ Failed to reuse saved token")
                return False
        else:
            print("❌ Token file not created")
            return False
        
        print("\n🎉 All tests passed successfully!")
        print("\nSDK is ready for use. You can now integrate it with your AI bots.")
        return True
        
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        return False
        
    finally:
        # Clean up temporary token file
        try:
            if os.path.exists(token_file):
                os.unlink(token_file)
        except:
            pass


def main():
    """Main function"""
    print("FinFX Python SDK Test Suite")
    print("This script will test the SDK functionality.\n")
    
    # Check if we're in the right directory
    if not os.path.exists('finfx_sdk.py'):
        print("❌ Error: finfx_sdk.py not found in current directory")
        print("Please run this script from the python_sdk directory.")
        sys.exit(1)
    
    # Run tests
    success = test_sdk()
    
    if success:
        print("\n" + "=" * 50)
        print("🚀 SDK is ready for integration!")
        print("\nNext steps:")
        print("1. Copy this python_sdk folder to your AI bot project")
        print("2. Install dependencies: pip install -r requirements.txt")
        print("3. Configure your .env file with admin credentials")
        print("4. Import and use the SDK in your bot:")
        print("   from finfx_sdk import FinFXSDK")
        sys.exit(0)
    else:
        print("\n" + "=" * 50)
        print("❌ SDK tests failed")
        print("\nPlease check:")
        print("1. Backend server is running and accessible")
        print("2. Environment variables are correctly set")
        print("3. Admin credentials are valid")
        print("4. Network connectivity to the backend")
        sys.exit(1)


if __name__ == "__main__":
    main()