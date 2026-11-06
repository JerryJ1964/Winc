# Writing NFC Tags from Computer to Phone (NFC Tools)

This project provides a Python script to send NDEF data from your computer to a phone running **NFC Tools**, enabling you to write NFC tags wirelessly via Bluetooth.

## How it works

1. The script uses **Bluetooth** (RFCOMM/SPP) to connect to your phone.
2. It sends a text/NDRF message to the phone.
3. The **NFC Tools** app (Android) receives the data and prompts you to write the tag.
4. Tap the NFC tag against the phone, and the data is written.

## Prerequisites

- A phone with **NFC Tools** app installed (Android).
- Bluetooth enabled on both computer and phone.
- The NFC Tools app must be running and set to "listen" for incoming Bluetooth data (this may require a specific UUID or SPP profile).

## Installation

1. Clone or copy this folder to your computer:
   ```
   C:\Users\jberg\Winc\writing a tag from a computer to a phone that has NFC Tools installed
   ```

2. Install the Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Usage

Run the script with the Bluetooth MAC address of your phone and the message you want to write:

```bash
python write_tag.py --mac AA:BB:CC:DD:EE:FF --message "Hello from computer!"
```

- `--mac`: The Bluetooth MAC address of your phone (e.g., `00:11:22:33:44:55`).
- `--message`: The NDEF data or plain text to send.

### Finding your phone's Bluetooth MAC address

- **Android**: Go to **Settings → About phone → Status** (or **Bluetooth**), note the "Bluetooth address".
- **iOS**: MAC address is not easily visible; you may need a third-party app.

### Note on UUID

The script uses a placeholder UUID (`0000110A-0000-1000-8000-00805F9B34FB`), which is the **Serial Port Profile (SPP)** UUID. If your NFC Tools app uses a different UUID for Bluetooth data transfer, update the `NFC_TOOLS_UUID` constant in `write_tag.py`.

## Project Structure

```
writing a tag from a computer to a phone that has NFC Tools installed/
├── .vscode/
│   └── settings.json          # VS Code settings (already present)
├── requirements.txt           # Python dependencies
├── write_tag.py               # Main script to send data over Bluetooth
└── README.md                  # This file
```

## Future enhancements

- Support for BLE custom services/characteristics.
- Automatic detection of the phone's Bluetooth service.
- Integration with NFC Tools Tasks to automate actions after writing.
- Command-line options for reading back written tag data.