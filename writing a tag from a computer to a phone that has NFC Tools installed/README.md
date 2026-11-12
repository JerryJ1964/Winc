# Writing NFC Tags from Computer to Phone (NFC Tools)

This project provides a JavaScript-based solution to send NDEF data from your computer to a phone running **NFC Tools**, enabling you to write NFC tags wirelessly.

## How it works

1. The web app uses **Web Bluetooth API** to connect to your phone running **NFC Tools** app
2. NDEF data is sent over **RFCOMM/SPP** (Serial Port Profile) to the phone
3. The **NFC Tools** app receives the data and prompts you to write the tag
4. Tap the NFC tag against the phone, and the data is written

## Prerequisites

- A phone with **NFC Tools** app installed (Android)
- Bluetooth enabled on both computer and phone
- The **NFC Tools** app must be running and set to "listen" for incoming Bluetooth data
- Modern browser that supports Web Bluetooth (Chrome or Edge on desktop)

## Usage

1. Open `index.html` in a Web Bluetooth-supported browser (Chrome or Edge)
2. Click **"Scan for Device"** to find your phone
3. Select your phone from the list
4. Enter the message/data you want to write in the "Tag Data" field
5. Choose the number of tags and starting number
6. Click **"Write Tags"** to begin writing

## Bluetooth UUID

The app uses the **Serial Port Profile (SPP)** UUID by default: `0000110A-0000-1000-8000-00805F9B34FB`

If your NFC Tools app uses a different UUID for Bluetooth data transfer, you can change it using the UUID selector buttons:
- **SPP (Serial Port)**: `0000110A-0000-1000-8000-00805F9B34FB`
- **OBDE (Data)**: `0000110C-0000-1000-8000-00805F9B34FB`
- **HOGP (Handsfree)**: `00001105-0000-1000-8000-00805F9B34FB`

## Project Structure

```
writing a tag from a computer to a phone that has NFC Tools installed/
├── index.html          # Main HTML page with configuration and write UI
├── app.js              # JavaScript: Bluetooth scanning + NDEF write logic
├── style.css           # All styling merged from both original HTML files
├── package.json        # Node.js package configuration
├── README.md           # This file
└── .vscode/            # VS Code settings