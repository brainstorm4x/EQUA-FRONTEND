# Mobile Deep Link Testing Guide

## Test Scenario: Registration with Deep Link

### Prerequisites
- Mobile device (iOS or Android)
- Phantom or Solflare app installed
- Chrome or Safari browser
- Devnet SOL in wallet

### Test Steps

1. **Open UNIYAA in mobile browser**
   - Navigate to https://uniyaa-frontend.netlify.app
   - Open browser DevTools (Chrome Remote Debugging)

2. **Initiate Registration**
   - Click "Select Wallet"
   - Choose Phantom or Solflare
   - Fill registration form
   - Click "Register"

3. **Check Console Before Deep Link**
   Expected logs:
   ```
   💾 [StateManager] Transaction state saved: {type: "registration", publicKey: "Abc..."}
   📱 [MobileRegistration] Calling wallet.signTransaction()...
   ```

4. **Deep Link to Wallet App**
   - Browser should redirect to wallet app
   - Wallet app should show transaction approval screen

5. **Approve Transaction**
   - Tap "Approve" in wallet app
   - Wait for confirmation

6. **Return to Browser**
   - Browser should automatically return to UNIYAA
   - **CRITICAL CHECK:** Page should detect pending transaction

7. **Check Console After Return**
   Expected logs:
   ```
   📦 [StateManager] State restored: {type: "registration", age: "3s", publicKey: "Abc..."}
   🔄 [MintPage] Restoring pending transaction: registration
   ✅ [MintPage] Registration completed during deep link!
   🗑️ [StateManager] State cleared
   ```

8. **Verify Registration**
   - Dashboard should show registered state
   - Token balance should appear

### Expected Behavior

✅ **PASS:**
- State persists during deep link
- Registration completes after return
- State is cleared

❌ **FAIL:**
- "Registration incomplete" error
- User must click "Register" again
- State not cleared (check localStorage)

### Debugging

Check localStorage:
```javascript
localStorage.getItem('uniyaa_pending_transaction')
```

If stuck, clear manually:
```javascript
localStorage.removeItem('uniyaa_pending_transaction')
```

### Known Issues

1. **Browser kills tab during deep link**
   - iOS Safari aggressive memory management
   - State should restore on tab reactivation

2. **User cancels in wallet app**
   - Returns to browser
   - State cleared with error message

3. **Network delays**
   - Transaction may take 10-30 seconds
   - State manager has 5-minute timeout
