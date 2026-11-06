#!/usr/bin/env python3
"""Write NDEF data to an NFC tag via Bluetooth from your computer.

This script sends NDEF data over Bluetooth to a phone running NFC Tools.
The NFC Tools app must be running and set to listen for incoming Bluetooth
data (via SPP or a custom UUID). Once received, the app will prompt you to
write the tag.

Usage:
    python write_tag.py --mac AA:BB:CC:DD:EE:FF --message "Hello NFC"

Requirements:
    pip install bleak
"""

import argparse
import sys
from bleak import BleakClient, BleakScanner

# UUID for the NFC Tools Bluetooth service (you may need to adjust this)
# This is a placeholder; replace with the actual UUID if known.
NFC_TOOLS_UUID = "0000110A-0000-1000-8000-00805F9B34FB"  # Serial Port Profile UUID


def send_over_bluetooth(mac_address: str, message: str):
    """Connect to the Bluetooth device and send the message."""

    async def send_(client: BleakClient):
        # Write characteristic - adjust UUID/handle as needed
        # For SPP, we can use write_gattChar without a specific UUID, but here we use a placeholder.
        try:
            # Attempt to write to a characteristic; adjust UUID/handle for your setup
            await client.write_gatt_char(NFC_TOOLS_UUID, message.encode())
            print(f"Sent message to {mac_address}: {message}")
        except Exception as e:
            print(f"Failed to send: {e}")

    try:
        client = BleakClient(mac_address)
        client.connect_async().result()
        # Give a moment to connect
        import time
        time.sleep(1)
        client.loop.run_until_complete(send_(client))
        client.disconnect()
    except KeyboardInterrupt:
        print("Cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"Error connecting to {mac_address}: {e}")
        print("Ensure Bluetooth is enabled and the device is pairingable.")


def main():
    parser = argparse.ArgumentParser(description="Send NDEF data to NFC Tools over Bluetooth")
    parser.add_argument("--mac", required=True, help="Bluetooth MAC address of the phone (e.g., AA:BB:CC:DD:EE:FF)")
    parser.add_argument("--message", required=True, help="NDEF data or text to send to the phone")
    args = parser.parse_args()

    print(f"Connecting to {args.mac} and sending: {args.message}")
    send_over_bluetooth(args.mac, args.message)


if __name__ == "__main__":
    main()