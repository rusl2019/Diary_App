# Diary App 📝

A simple, secure, cross-platform desktop diary application built with Electron. Your entries are encrypted locally with a password you provide and are never sent over the network.

## Features

- **Write & Save Diary Entries**: A clean and simple interface for writing.
- **Strong Encryption**: Uses AES-256-GCM to encrypt your diary entries before saving.
- **Local First**: All your data is saved locally on your machine.
- **Password Protection**: A password is required to both save (encrypt) and open (decrypt) a diary file.
- **Cross-Platform**: Works on Windows, macOS, and Linux.

## Tech Stack

- **[Electron](https://www.electronjs.org/)**: To build the cross-platform desktop application.
- **[Node.js](https://nodejs.org/)**: For the backend logic, including file system access and cryptography.
- **[electron-builder](https://www.electron.build/)**: To package the application into distributable formats (like `.AppImage`).
- **HTML, CSS & JavaScript**: For the user interface.

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

Make sure you have [Node.js](https://nodejs.org/) and `npm` installed on your system. You can download them from the official website.

### Installation

1.  Clone the repository to your local machine:
    ```sh
    git clone https://github.com/rusl2019/Diary_App.git
    ```
2.  Navigate into the project directory:
    ```sh
    cd Diary_App
    ```
3.  Install the required dependencies:
    ```sh
    npm install
    ```

## Usage

### Running in Development Mode

To start the application in a development environment with developer tools enabled, run:

```sh
npm start
```

### Building the Application

To package the application into a distributable file for your current operating system (e.g., an `.AppImage` on Linux), run:

```sh
npm run dist
```

The output file will be located in the `dist/` directory.

## How It Works

This application prioritizes your privacy. When you save an entry:

1.  The text you wrote and the password you provided are securely sent to the main process.
2.  The password is used as a key to encrypt your text using the AES-256-GCM algorithm.
3.  Only the resulting encrypted text is written to the `.diary` file on your disk.

**Your password is never stored anywhere.** It is only used at the moment of encryption and decryption. If you forget your password, there is no way to recover the data.

## License

Distributed under the MIT License. See `LICENSE` file for more information.
