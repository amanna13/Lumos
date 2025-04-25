# How to Get Owner Access in Lumos

The Lumos application has different levels of access:

1. **Regular User** - Can submit proposals and vote
2. **Admin** - Can view admin dashboard and perform some administrative actions
3. **Owner** - Has full access to all features including phase management

## Gaining Owner Access

To get owner privileges:

1. Open the file: `Frontend/src/context/BlockchainContext.jsx`

2. Find the `connect()` function and locate this section:
   ```javascript
   const ownerAddresses = [
     "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4".toLowerCase(), // Example owner address
     "0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2".toLowerCase(), // Example backup owner
     // Add your wallet address here to gain owner access
   ];
   ```

3. Add your wallet address to the array, for example:
   ```javascript
   const ownerAddresses = [
     "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4".toLowerCase(), // Example owner address
     "0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2".toLowerCase(), // Example backup owner
     "0xYOUR_WALLET_ADDRESS_HERE".toLowerCase(), // Your wallet
   ];
   ```

4. Save the file and restart the application

5. Connect your wallet

6. You should now see the "Owner Access" badge in the admin dashboard

## Confirming Your Owner Status

You can confirm you have owner privileges in several ways:

1. In the admin dashboard, you'll see an "Owner Access" badge in the top right corner
2. You'll have access to the phase control panel
3. In the "Current Status" panel, your role will show as "Owner (Full Access)"

## Getting Your Wallet Address

1. Connect MetaMask to the application
2. Click on your account in MetaMask
3. Your address will be copied to clipboard
4. Make sure to convert it to lowercase when adding it to the array
