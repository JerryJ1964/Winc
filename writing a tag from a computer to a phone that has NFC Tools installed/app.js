/**
 * NFC Tag Writer - JavaScript
 * Pure front-end: Web Bluetooth + NDEF over RFCOMM/SPP to a phone running NFC Tools.
 *
 * Features:
 *  - Scan for nearby Bluetooth devices
 *  - Select the RFCOMM/SPP UUID (default: 0000110A-0000-1000-8000-00805F9B34FB)
 *  - Generate tag numbers (sequential 5-digit) and NDEF records
 *  - Write NDEF data over Bluetooth to the phone
 *  - Progress reporting and status feedback
 */

(function () {
  'use strict';

  // ---------- State ----------
  const state = {
    devices: [],
    connectedDevice: null,
    connectedCharacteristic: null,
    uuids: {
      spp: '0000110A-0000-1000-8000-00805F9B34FB',
      obdex: '0000110C-0000-1000-8000-00805F9B34FB',
      hoc: '00001105-0000-1000-8000-00805F9B34FB',
    },
    currentUuid: '0000110A-0000-1000-8000-00805F9B34FB',
    tagCount: 1,
    startNumber: 0,
    outputFormat: 'json',
    reportInterval: 500,
    generateLabels: true,
    message: '',
    progress: 0,
    isWriting: false,
    deviceName: '',
  };

  // ---------- DOM refs ----------
  const $ = (id) => document.getElementById(id);

  const elements = {
    scanBtn: $('scanBtn'),
    deviceList: $('deviceList'),
    connectionStatus: $('connectionStatus'),
    writeBtn: $('writeBtn'),
    progressContainer: $('progressContainer'),
    progressFill: $('progressFill'),
    progressText: $('progressText'),
    status: $('status'),
    recordPreview: $('recordPreview'),
    tagCount: $('tagCount'),
    startNumber: $('startNumber'),
    tagData: $('tagData'),
    outputFormat: $('outputFormat'),
    reportInterval: $('reportInterval'),
    generateLabels: $('generateLabels'),
    uuidSpp: $('uuid-spp'),
    uuidObdex: $('uuid-obdex'),
    uuidHoc: $('uuid-hoc'),
    writeNumbers: $('writeNumbers'),
    writeCount: $('writeCount'),
    writeNumbersBtn: $('writeNumbersBtn'),
    numbersStatus: $('numbersStatus'),
  };

  // ---------- Helpers ----------
  function format5Digits(num) {
    return String(num).padStart(5, '0');
  }

  function generateTagNumbers() {
    const start = parseInt(state.startNumber, 10) || 0;
    return Array.from({ length: state.tagCount }, (_, i) => start + i);
  }

  function buildNdefMessage(tagNumber, index) {
    const base = state.outputFormat;
    if (base === 'text') {
      return state.message || 'Hello from NFC Tag Writer';
    }
    if (base === 'uri') {
      return 'urn:uuid:' + (state.message || 'unknown');
    }
    return JSON.stringify({
      tag: format5Digits(tagNumber),
      index: index,
      message: state.message || 'Hello from NFC Tag Writer',
      timestamp: new Date().toISOString(),
    });
  }

  // ---------- UI helpers ----------
  function setStatus(message, type) {
    const el = elements.status;
    el.textContent = message;
    el.className = 'status visible ' + (type || 'info');
  }

  function setConnectionStatus(message, type) {
    elements.connectionStatus.textContent = message;
    elements.connectionStatus.className = 'status visible ' + (type || 'info');
  }

  function setProgress(percent) {
    state.progress = Math.min(100, Math.max(0, percent));
    elements.progressFill.style.width = state.progress + '%';
    elements.progressText.textContent = state.progress + '%';
  }

  function setWriteButtonDisabled(disabled) {
    elements.writeBtn.disabled = disabled;
    if (disabled) {
      elements.writeBtn.textContent = 'Writing...';
    } else {
      elements.writeBtn.textContent = 'Write Tags';
    }
  }

  function showProgressBar(show) {
    elements.progressContainer.classList.toggle('hidden', !show);
  }

  function showDeviceList(show) {
    elements.deviceList.style.display = show ? 'block' : 'none';
  }

  function showPreview() {
    const tagNumbers = generateTagNumbers();
    const lines = tagNumbers.map((num, i) => {
      const msg = buildNdefMessage(num, i);
      return '  Tag ' + format5Digits(num) + ' (' + (i + 1) + '/' + tagNumbers.length + '): ' + msg.slice(0, 80) + (msg.length > 80 ? '...' : '');
    }).join('\n');
    elements.recordPreview.textContent = 'Generated ' + tagNumbers.length + ' tags:\n' + lines;
  }
// ---------- Bluetooth ----------
  function scanDevices() {
    if (!navigator.bluetooth) {
      setStatus('Web Bluetooth API is not supported in this browser. Use Chrome or Edge.', 'error');
      return;
    }
    setStatus('Scanning for devices...');
    showDeviceList(true);
    navigator.bluetooth
      .requestDevice({
        filters: [{ namePrefix: 'NFC' }, { namePrefix: 'Android' }, { namePrefix: 'Bluetooth' }],
        optionalServices: [state.currentUuid],
      })
      .then((device) => {
        state.connectedDevice = device;
        state.deviceName = device.name || 'Unknown';
        setConnectionStatus('Connected to ' + state.deviceName, 'success');
        elements.scanBtn.disabled = true;
        elements.writeBtn.disabled = false;
        showPreview();
      })
      .catch((err) => {
        console.error(err);
        setStatus('Scan failed: ' + err.message, 'error');
        showDeviceList(false);
      });
  }

  // ---------- Write ----------
  function connectAndWrite() {
    if (state.isWriting) return;
    const message = state.message.trim();
    if (!message) {
      setStatus('Please enter some message data first.', 'error');
      return;
    }
    if (!state.connectedDevice) {
      setStatus('No device selected. Please scan for a device first.', 'error');
      return;
    }
    setProgress(0);
    showProgressBar(true);
    state.isWriting = true;
    setWriteButtonDisabled(true);
    setStatus('Connecting to ' + state.deviceName + ' over RFCOMM...', 'info');
    state.connectedDevice.gatt.connect()
      .then((server) => server.getPrimaryService(state.currentUuid))
      .then((service) => service.getCharacteristic(state.currentUuid))
      .then((characteristic) => {
        state.connectedCharacteristic = characteristic;
        return writeBatch(generateTagNumbers());
      })
      .then(() => {
        setStatus('All tags written successfully!', 'success');
        elements.writeBtn.disabled = true;
        elements.writeBtn.textContent = 'Done';
        showPreview();
      })
      .catch((err) => {
        console.error(err);
        setStatus('Write failed: ' + err.message, 'error');
      })
      .finally(() => {
        state.isWriting = false;
        setWriteButtonDisabled(false);
      });
  }

  function writeBatch(tagNumbers) {
    return new Promise((resolve, reject) => {
      let index = 0;
      function writeNext() {
        if (!state.connectedCharacteristic) {
          reject(new Error('No characteristic available'));
          return;
        }
        const message = buildNdefMessage(tagNumbers[index], index);
        state.connectedCharacteristic.value = new TextEncoder().encode(message);
        state.connectedCharacteristic.writeValue(state.connectedCharacteristic.value)
          .then(() => {
            const delay = state.reportInterval || 500;
            setTimeout(() => {
              index++;
              if (index < tagNumbers.length) {
                setProgress((index / tagNumbers.length) * 100);
                writeNext();
              } else {
                resolve();
              }
            }, delay);
          })
          .catch((err) => {
            reject(err);
          });
      }
      writeNext();
    });
  }

  // ---------- Write Numbers ----------
  function writeNumbers() {
    const number = parseInt(elements.writeNumbers.value, 10) || 0;
    const count = Math.min(30, Math.max(1, parseInt(elements.writeCount.value, 10) || 1));
    
    if (!state.connectedDevice) {
      setStatus('No device selected. Please scan for a device first.', 'error');
      elements.numbersStatus.className = 'status visible error';
      elements.numbersStatus.textContent = 'No device selected';
      return;
    }
    
    elements.writeNumbersBtn.disabled = true;
    elements.numbersStatus.className = 'status visible info';
    elements.numbersStatus.textContent = 'Writing ' + count + ' tag(s) with number ' + format5Digits(number);
    setProgress(0);
    showProgressBar(true);
    state.isWriting = true;
    
    const tagNumbers = Array.from({ length: count }, (_, i) => number + i);
    
    state.connectedDevice.gatt.connect()
      .then((server) => server.getPrimaryService(state.currentUuid))
      .then((service) => service.getCharacteristic(state.currentUuid))
      .then((characteristic) => {
        state.connectedCharacteristic = characteristic;
        return writeNumbersBatch(tagNumbers);
      })
      .then(() => {
        setStatus('All numbers written successfully!', 'success');
        elements.writeNumbersBtn.disabled = true;
        elements.numbersStatus.className = 'status visible success';
        elements.numbersStatus.textContent = 'Written ' + count + ' tag(s)';
        showPreview();
      })
      .catch((err) => {
        console.error(err);
        setStatus('Write failed: ' + err.message, 'error');
        elements.numbersStatus.className = 'status visible error';
        elements.numbersStatus.textContent = 'Write failed: ' + err.message;
      })
      .finally(() => {
        state.isWriting = false;
        elements.writeNumbersBtn.disabled = false;
        showProgressBar(false);
      });
  }

  function writeNumbersBatch(tagNumbers) {
    return new Promise((resolve, reject) => {
      let index = 0;
      function writeNext() {
        if (!state.connectedCharacteristic) {
          reject(new Error('No characteristic available'));
          return;
        }
        const message = buildNdefMessage(tagNumbers[index], index);
        state.connectedCharacteristic.value = new TextEncoder().encode(message);
        state.connectedCharacteristic.writeValue(state.connectedCharacteristic.value)
          .then(() => {
            const delay = state.reportInterval || 500;
            setTimeout(() => {
              index++;
              if (index < tagNumbers.length) {
                setProgress((index / tagNumbers.length) * 100);
                writeNext();
              } else {
                resolve();
              }
            }, delay);
          })
          .catch((err) => {
            reject(err);
          });
      }
      writeNext();
    });
  }
// ---------- Event listeners ----------
  elements.scanBtn.addEventListener('click', scanDevices);
  elements.writeBtn.addEventListener('click', connectAndWrite);
  elements.writeNumbersBtn.addEventListener('click', writeNumbers);

  elements.tagCount.addEventListener('input', () => {
    state.tagCount = Math.min(30, Math.max(1, parseInt(elements.tagCount.value, 10) || 1));
  });

  elements.startNumber.addEventListener('input', () => {
    state.startNumber = parseInt(elements.startNumber.value, 10) || 0;
    showPreview();
  });

  elements.tagData.addEventListener('input', () => {
    state.message = elements.tagData.value;
    showPreview();
    elements.writeBtn.disabled = state.message.trim() === '' || !state.connectedDevice;
  });

  elements.outputFormat.addEventListener('change', () => {
    state.outputFormat = elements.outputFormat.value;
    showPreview();
  });

  elements.reportInterval.addEventListener('input', () => {
    state.reportInterval = Math.min(5000, Math.max(100, parseInt(elements.reportInterval.value, 10) || 500));
  });

  elements.generateLabels.addEventListener('change', () => {
    state.generateLabels = elements.generateLabels.checked;
  });

  elements.uuidSpp.addEventListener('click', () => {
    activateUuid(elements.uuidSpp);
  });

  elements.uuidObdex.addEventListener('click', () => {
    activateUuid(elements.uuidObdex);
  });

  elements.uuidHoc.addEventListener('click', () => {
    activateUuid(elements.uuidHoc);
  });

  function activateUuid(btn) {
    elements.uuidSpp.classList.remove('active');
    elements.uuidObdex.classList.remove('active');
    elements.uuidHoc.classList.remove('active');
    btn.classList.add('active');
    state.currentUuid = btn.dataset.uuid;
    setConnectionStatus('UUID changed to: ' + state.currentUuid, 'info');
  }

  showPreview();
  elements.writeBtn.disabled = true;
})();