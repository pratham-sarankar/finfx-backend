from finfx_sdk import FinFXSDK
if __name__=="__main__":
    sdk = FinFXSDK()
    result = sdk.add_signal(
        {
            "botId": "686d3f381d179df0fd5e5480",
            "entryTime": "2025-06-17T10:05:00Z",
            "entryPrice": 1012.09,
            "direction": "LONG"
        } 
    )
    # Get newly created signal id
    signal_id=result['data']['id']
    print(f'New signal created with id {signal_id}')
    
    # Fetch any signal with id
    signal = sdk.get_signal(signal_id)
    print(f"Signal Fetched : {signal}")
    
    # Update signal with the id
    updated_signal = sdk.update_signal(signal_id, {
        "direction": "SHORT",
        "exitTime": "2025-06-17T10:05:00Z",
        "exitPrice": 1012.09
    })
    print(f"Updated Signal : {updated_signal}")