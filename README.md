# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript and enable type-aware lint rules. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Authentication Requirement for Editing Descriptions

- **You must be logged in to edit a part description.**
- If you attempt to save an edit while not logged in, you will receive an error message prompting you to log in.
- The save button for editing descriptions is disabled unless you are logged in.

## Edit History Username Fix

- The edit history for part descriptions now correctly shows the username of the logged-in user who made the edit.
- Previously, edits would show as "CurrentUser" or "Anonymous" if not logged in.
- Now, edits are only allowed when logged in, and the correct username is recorded in the edit history.

## Deployment

To deploy this application, you need to build the frontend and run the backend server in a production environment.

### 1. Build the Frontend

From the project root directory, run the following command:

```bash
npm run build
```

This will create a `dist` folder in your project root containing the optimized, static frontend assets. Your production server should be configured to serve the contents of this `dist` folder.

### 2. Configure Production Environment

Ensure you have a `.env` file on your production server with the correct values for your domain, database, and other services:

```
# .env (production example)
PORT=3001
MONGODB_URI="your_production_mongodb_connection_string"
JWT_SECRET="a_very_strong_and_long_random_string_for_production"
FRONTEND_URL="https://www.downpipedaddy.com"
BACKEND_URL="https://www.downpipedaddy.com"
GOOGLE_CLIENT_ID="your_production_google_client_id"
GOOGLE_CLIENT_SECRET="your_production_google_client_secret"
TWILIO_ACCOUNT_SID="your_production_twilio_sid"
TWILIO_AUTH_TOKEN="your_production_twilio_token"
TWILIO_PHONE_NUMBER="your_production_twilio_number"
```

### 3. Run the Backend in Production

On your production server, start the Node.js server. It's highly recommended to use a process manager like `pm2` to keep your application running.

```bash
# Install pm2 globally if you haven't already
npm install pm2 -g

# Start the server with pm2
pm2 start server.js --name "partsflip-api"
```

Your server will now be running in the background. You can monitor it with `pm2 list` and view logs with `pm2 logs partsflip-api`.

### 4. Configure Your Web Server (e.g., Nginx)

You'll need a web server like Nginx to act as a reverse proxy. It will serve your static frontend files and forward API requests to your Node.js backend.

Here's a sample Nginx configuration:

```nginx
server {
    listen 80;
    server_name downpipedaddy.com www.downpipedaddy.com;

    # Serve static frontend files
    location / {
        root /path/to/your/project/dist;
        try_files $uri /index.html;
    }

    # Reverse proxy for API requests
    location /api/ {
        proxy_pass http://localhost:3001; # Assuming your Node app is running on port 3001
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Make sure to replace `/path/to/your/project/dist` and `yourdomain.com` with your actual paths and domain name. After setting this up, restart Nginx.

This concludes the necessary steps to get your site ready for deployment.
