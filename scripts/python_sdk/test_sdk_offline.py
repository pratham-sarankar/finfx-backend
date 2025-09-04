#!/usr/bin/env python3
"""
Offline test script for FinFX Python SDK

This script tests the SDK functionality without requiring a running backend.
It verifies input validation, field requirements, and API format compatibility.
"""

import os
import sys
import tempfile
from datetime import datetime
from unittest.mock import patch, MagicMock

# Mock environment variables before importing SDK
os.environ['FINFX_ADMIN_EMAIL'] = 'test@example.com'
os.environ['FINFX_ADMIN_PASSWORD'] = 'testpassword'
os.environ['FINFX_BACKEND_URL'] = 'http://localhost:3000'

# Add current directory to path to import the SDK
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from finfx_sdk import FinFXSDK, create_example_signal


def test_direction_validation():
    """Test direction validation and conversion"""
    print("🔄 Testing direction validation...")
    
    # Test valid directions
    valid_directions = ['long', 'short', 'LONG', 'SHORT', 'Long', 'Short']
    for direction in valid_directions:
        test_signal = {
            "entryTime": "2024-01-15T10:30:00Z",
            "entryPrice": 50000.0,
            "direction": direction,
            "userId": "507f1f77bcf86cd799439011",
            "lotSize": 1.0,
            "pairName": "BTC/USDT"
        }
        
        # Mock SDK to test validation without network calls
        with tempfile.NamedTemporaryFile() as tmp_file:
            sdk = FinFXSDK(token_file=tmp_file.name)
            
            # Mock _make_request to return success
            with patch.object(sdk, '_make_request') as mock_request:
                mock_request.return_value = {"status": "success", "data": {"id": "test123"}}
                
                result = sdk.add_signal(test_signal)
                
                # Verify the request was made with uppercase direction
                if result:
                    args, kwargs = mock_request.call_args
                    sent_data = args[2]  # Third argument is the data
                    if sent_data['direction'] not in ['LONG', 'SHORT']:
                        print(f"❌ Direction '{direction}' not converted to uppercase: {sent_data['direction']}")
                        return False
                else:
                    print(f"❌ Valid direction '{direction}' was rejected")
                    return False
    
    # Test invalid directions
    invalid_directions = ['buy', 'sell', 'invalid', '', None]
    for direction in invalid_directions:
        test_signal = {
            "entryTime": "2024-01-15T10:30:00Z",
            "entryPrice": 50000.0,
            "direction": direction,
            "userId": "507f1f77bcf86cd799439011",
            "lotSize": 1.0,
            "pairName": "BTC/USDT"
        }
        
        with tempfile.NamedTemporaryFile() as tmp_file:
            sdk = FinFXSDK(token_file=tmp_file.name)
            result = sdk.add_signal(test_signal)
            
            if result is not None:
                print(f"❌ Invalid direction '{direction}' was accepted")
                return False
    
    print("✅ Direction validation working correctly")
    return True


def test_required_fields():
    """Test required field validation"""
    print("📝 Testing required fields validation...")
    
    # Base valid signal
    base_signal = {
        "entryTime": "2024-01-15T10:30:00Z",
        "entryPrice": 50000.0,
        "direction": "long",
        "userId": "507f1f77bcf86cd799439011",
        "lotSize": 1.0,
        "pairName": "BTC/USDT"
    }
    
    required_fields = ['entryTime', 'entryPrice', 'direction', 'userId', 'lotSize', 'pairName']
    
    for field in required_fields:
        # Create signal missing this field
        test_signal = base_signal.copy()
        del test_signal[field]
        
        with tempfile.NamedTemporaryFile() as tmp_file:
            sdk = FinFXSDK(token_file=tmp_file.name)
            result = sdk.add_signal(test_signal)
            
            if result is not None:
                print(f"❌ Signal accepted without required field: {field}")
                return False
    
    print("✅ Required field validation working correctly")
    return True


def test_lot_size_validation():
    """Test lot size minimum validation"""
    print("📏 Testing lot size validation...")
    
    # Test invalid lot sizes
    invalid_lot_sizes = [0, -1, 0.05, -0.1]
    
    for lot_size in invalid_lot_sizes:
        test_signal = {
            "entryTime": "2024-01-15T10:30:00Z",
            "entryPrice": 50000.0,
            "direction": "long",
            "userId": "507f1f77bcf86cd799439011",
            "lotSize": lot_size,
            "pairName": "BTC/USDT"
        }
        
        with tempfile.NamedTemporaryFile() as tmp_file:
            sdk = FinFXSDK(token_file=tmp_file.name)
            result = sdk.add_signal(test_signal)
            
            if result is not None:
                print(f"❌ Invalid lot size {lot_size} was accepted")
                return False
    
    # Test valid lot sizes
    valid_lot_sizes = [0.1, 0.5, 1.0, 10.0]
    
    for lot_size in valid_lot_sizes:
        test_signal = {
            "entryTime": "2024-01-15T10:30:00Z",
            "entryPrice": 50000.0,
            "direction": "long",
            "userId": "507f1f77bcf86cd799439011",
            "lotSize": lot_size,
            "pairName": "BTC/USDT"
        }
        
        with tempfile.NamedTemporaryFile() as tmp_file:
            sdk = FinFXSDK(token_file=tmp_file.name)
            
            # Mock successful response
            with patch.object(sdk, '_make_request') as mock_request:
                mock_request.return_value = {"status": "success", "data": {"id": "test123"}}
                result = sdk.add_signal(test_signal)
                
                if result is None:
                    print(f"❌ Valid lot size {lot_size} was rejected")
                    return False
    
    print("✅ Lot size validation working correctly")
    return True


def test_update_signal_validation():
    """Test update signal validation"""
    print("🔄 Testing update signal validation...")
    
    with tempfile.NamedTemporaryFile() as tmp_file:
        sdk = FinFXSDK(token_file=tmp_file.name)
        
        # Test direction validation in updates
        with patch.object(sdk, '_make_request') as mock_request:
            mock_request.return_value = {"status": "success", "data": {"id": "test123"}}
            
            # Valid direction update
            result = sdk.update_signal("test123", {"direction": "short"})
            if result is None:
                print("❌ Valid direction update was rejected")
                return False
            
            # Check that direction was converted to uppercase
            args, kwargs = mock_request.call_args
            sent_data = args[2]
            if sent_data['direction'] != 'SHORT':
                print(f"❌ Direction not converted to uppercase in update: {sent_data['direction']}")
                return False
        
        # Invalid direction update
        result = sdk.update_signal("test123", {"direction": "buy"})
        if result is not None:
            print("❌ Invalid direction update was accepted")
            return False
        
        # Lot size validation in updates
        result = sdk.update_signal("test123", {"lotSize": 0.05})
        if result is not None:
            print("❌ Invalid lot size update was accepted")
            return False
    
    print("✅ Update signal validation working correctly")
    return True


def test_bulk_signals_validation():
    """Test bulk signals validation"""
    print("📦 Testing bulk signals validation...")
    
    with tempfile.NamedTemporaryFile() as tmp_file:
        sdk = FinFXSDK(token_file=tmp_file.name)
        
        # Valid bulk signals
        valid_signals = [
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
                "pairName": "ETH/USDT"
            }
        ]
        
        with patch.object(sdk, '_make_request') as mock_request:
            mock_request.return_value = {"status": "success", "data": {"totalCreated": 2}}
            
            result = sdk.add_bulk_signals("test_bot_id", valid_signals)
            if result is None:
                print("❌ Valid bulk signals were rejected")
                return False
            
            # Check that directions were converted to uppercase
            args, kwargs = mock_request.call_args
            sent_data = args[2]
            sent_signals = sent_data['signals']
            
            for i, signal in enumerate(sent_signals):
                if signal['direction'] not in ['LONG', 'SHORT']:
                    print(f"❌ Signal {i} direction not converted to uppercase: {signal['direction']}")
                    return False
        
        # Invalid bulk signals (missing pairName)
        invalid_signals = [
            {
                "entryTime": "2024-01-15T10:30:00Z",
                "entryPrice": 50000.0,
                "direction": "long"
                # Missing pairName
            }
        ]
        
        result = sdk.add_bulk_signals("test_bot_id", invalid_signals)
        if result is not None:
            print("❌ Invalid bulk signals were accepted")
            return False
    
    print("✅ Bulk signals validation working correctly")
    return True


def test_example_signal():
    """Test the example signal creation function"""
    print("📝 Testing example signal creation...")
    
    example = create_example_signal()
    
    # Check required fields
    required_fields = ['entryTime', 'entryPrice', 'direction', 'userId', 'lotSize', 'pairName']
    for field in required_fields:
        if field not in example:
            print(f"❌ Example signal missing required field: {field}")
            return False
    
    # Check direction is valid
    if example['direction'] not in ['long', 'short']:
        print(f"❌ Example signal has invalid direction: {example['direction']}")
        return False
    
    # Check lot size is valid
    if example['lotSize'] < 0.1:
        print(f"❌ Example signal has invalid lot size: {example['lotSize']}")
        return False
    
    print("✅ Example signal creation working correctly")
    return True


def main():
    """Run all offline tests"""
    print("🧪 Running offline tests for FinFX Python SDK...")
    print("=" * 60)
    
    tests = [
        test_direction_validation,
        test_required_fields,
        test_lot_size_validation,
        test_update_signal_validation,
        test_bulk_signals_validation,
        test_example_signal
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            if test():
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"❌ Test {test.__name__} failed with error: {e}")
            failed += 1
        print()
    
    print("=" * 60)
    print(f"📊 Test Results: {passed} passed, {failed} failed")
    
    if failed == 0:
        print("🎉 All offline tests passed! SDK is ready for use.")
        print("\n💡 Next steps:")
        print("   1. Set up environment variables in .env file")
        print("   2. Replace test user ID with actual user from your database")
        print("   3. Run live tests with test_sdk.py")
        return True
    else:
        print("❌ Some tests failed. Please fix the issues above.")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)