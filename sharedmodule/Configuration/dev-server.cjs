const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the current directory
app.use(express.static('.'));

// Serve the main HTML file
app.get('/', (req, res) => {
  const htmlPath = path.join(__dirname, 'improved-real-config-demo.html');
  if (fs.existsSync(htmlPath)) {
    res.sendFile(htmlPath);
  } else {
    res.status(404).send('Demo HTML file not found');
  }
});

// API endpoint to get the module status
app.get('/api/status', (req, res) => {
  res.json({
    module: 'Configuration',
    version: '1.0.0',
    status: 'running',
    features: ['config-generator', 'config-parser', 'file-system', 'storage']
  });
});

// API endpoint to get available services
app.get('/api/services', (req, res) => {
  res.json({
    services: [
      { name: 'ConfigGenerator', status: 'available' },
      { name: 'ConfigParser', status: 'available' },
      { name: 'FileSystemService', status: 'available' },
      { name: 'StorageService', status: 'available' }
    ]
  });
});

app.listen(PORT, () => {
  console.log(`Configuration WebUI Development Server running at http://localhost:${PORT}`);
});