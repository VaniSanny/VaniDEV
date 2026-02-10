# Discord Bot & Dashboard

This project contains a Discord Bot integrated with an Express Dashboard to manage the bot's activity status.

## Setup

1.  **Install Dependencies**:
    Dependencies should already be installed. If not, run:
    ```bash
    npm install
    ```

2.  **Configuration**:
    Open the `.env` file and replace `YOUR_BOT_TOKEN_HERE` with your actual Discord Bot Token.
    ```env
    TOKEN=your_actual_token_here
    PORT=3000
    ```

3.  **Run the Bot**:
    Start the application using Node.js:
    ```bash
    node index.js
    ```

4.  **Access Dashboard**:
    Open your browser and navigate to:
    `http://localhost:3000`

## Usage

-   Go to the dashboard.
-   Select the **Activity Type** (Playing, Watching, etc.).
-   Enter the **Activity Name** (e.g., "Minecraft").
-   Select the **Status** (Online, Idle, etc.).
-   Click **Update Presence** to change the bot's status on Discord immediately.
