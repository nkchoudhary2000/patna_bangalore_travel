# Patna to Bangalore Travel Vlog

A React-based web application documenting a journey from Patna to Bangalore. This project features an interactive map, a trip feed with updates, a photo gallery, and an admin panel for managing content.

## Features

- **Interactive Map**: visualizes the journey route using `Leaflet` and `react-leaflet`.
- **Trip Feed**: Displays a timeline of updates and stories from the trip.
- **Gallery Mode**: A dedicated view for browsing trip photos.
- **Admin Panel**: Secure interface for adding new posts and updates.
- **Comments**: Interactive comment section for user engagement.
- **Responsive Design**: Mobile-first layout that works seamlessly on desktop and mobile devices.

## Tech Stack

- **Frontend**: React, Vite
- **Styling**: Tailwind CSS, Framer Motion
- **Map**: Leaflet, React Leaflet
- **Backend/Database**: Firebase (Firestore, Hosting)
- **Icons**: Lucide React

## Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v16 or higher)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)

## Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd patna_bangalore_travel
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Firebase Configuration:**
    - Ensure you have a Firebase project set up.
    - Check `src/firebase.js` and update with your own Firebase configuration keys if necessary.

## Running Locally

To start the development server:

```bash
npm run dev
```

This will start the application at `http://localhost:5173` (or another port if 5173 is busy).

## Building for Production

To create a production-ready build:

```bash
npm run build
```

The build artifacts will be stored in the `dist/` directory.

To preview the production build locally:

```bash
npm run preview
```

## Deployment

This project is configured for deployment with Firebase Hosting.

1.  **Install Firebase CLI** (if not already installed):
    ```bash
    npm install -g firebase-tools
    ```

2.  **Login to Firebase:**
    ```bash
    firebase login
    ```

3.  **Initialize Firebase (if not already done):**
    ```bash
    firebase init
    ```
    - Select **Hosting**.
    - Choose your Firebase project.
    - Set the public directory to `dist`.
    - Configure as a single-page app: **Yes**.

4.  **Deploy:**
    ```bash
    npm run build
    firebase deploy
    ```

## Project Structure

```
patna_bangalore_travel/
├── src/
│   ├── components/      # React components (MapDisplay, TripFeed, etc.)
│   ├── App.jsx          # Main application component & routing
│   ├── firebase.js      # Firebase configuration
│   ├── main.jsx         # Entry point
│   └── index.css        # Global styles & Tailwind imports
├── public/              # Static assets
├── index.html           # HTML template
├── package.json         # Project metadata and scripts
├── tailwind.config.js   # Tailwind CSS configuration
├── vite.config.js       # Vite configuration
└── firebase.json        # Firebase hosting configuration
```
