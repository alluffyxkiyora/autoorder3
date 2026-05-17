const express = require('express');
const session = require('express-session');
const path = require('path');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

const config = require('./config');
const Payment = require('./payment/payment');
const { createPteroUser, createPteroServer } = require('./pterodactyl');

const app = express();
const payment = new Payment();

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(session({
  secret: 'futuristic-order-panel-2024',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// In-memory storage untuk orders (Vercel serverless)
const orders = new Map();

// Routes
app.get('/', (req, res) => {
  res.render('index', { 
    error: req.query.error,
    success: req.query.success 
  });
});

app.post('/order', async (req, res) => {
  const { username, ram } = req.body;
  
  // Validasi
  if (!username || username.length < 3 || !/^[a-zA-Z0-9_-]+$/.test(username)) {
    return res.json({ success: false, message: 'Username minimal 3 karakter dan hanya huruf, angka, _, -' });
  }
  
  const ramConfig = {
    '1GB': { ram: 1024, cpu: 100, disk: 1024, price: 1000 },
    '2GB': { ram: 2048, cpu: 100, disk: 1024, price: 2000 },
    '3GB': { ram: 3072, cpu: 100, disk: 1024, price: 3000 },
    '4GB': { ram: 4096, cpu: 100, disk: 1024, price: 4000 },
    '5GB': { ram: 5120, cpu: 100, disk: 1024, price: 5000 },
    '6GB': { ram: 6144, cpu: 100, disk: 1024, price: 6000 },
    '7GB': { ram: 7168, cpu: 100, disk: 1024, price: 7000 },
    '8GB': { ram: 8192, cpu: 100, disk: 1024, price: 8000 },
    '9GB': { ram: 9216, cpu: 100, disk: 1024, price: 9000 },
    '10GB': { ram: 10240, cpu: 100, disk: 1024, price: 10000 },
    '11GB': { ram: 11264, cpu: 100, disk: 1024, price: 11000 },
    'UNLI': { ram: 0, cpu: 0, disk: 0, price: 12000 }
  };

  if (!ramConfig[ram]) {
    return res.json({ success: false, message: 'Paket RAM tidak valid' });
  }

  try {
    const orderData = await payment.createQris(ramConfig[ram].price);
    
    if (!orderData.success) {
      return res.json({ success: false, message: orderData.message });
    }

    const orderId = uuidv4();
    const order = {
      id: orderId,
      username,
      ram: ram,
      ramConfig: ramConfig[ram],
      amount: orderData.amount,
      qr: orderData.qr,
      checkout: orderData.checkout,
      expired: new Date(Date.now() + 5 * 60 * 1000), // 5 menit
      createdAt: new Date()
    };

    orders.set(orderId, order);
    
    req.session.orderId = orderId;
    
    res.json({ 
      success: true, 
      orderId,
      qr: orderData.qr,
      checkout: orderData.checkout,
      amount: orderData.amount,
      expired: orderData.expired
    });
  } catch (error) {
    console.error('Order creation error:', error);
    res.json({ success: false, message: 'Gagal membuat pembayaran' });
  }
});

app.get('/payment/:orderId', async (req, res) => {
  const { orderId } = req.params;
  const order = orders.get(orderId);
  
  if (!order) {
    return res.redirect('/?error=Pesanan tidak ditemukan');
  }
  
  res.render('payment', { order });
});

app.post('/check-status', async (req, res) => {
  const { orderId } = req.body;
  const order = orders.get(orderId);
  
  if (!order) {
    return res.json({ success: false, message: 'Pesanan tidak ditemukan' });
  }
  
  try {
    const status = await payment.statusQris(order.id);
    
    if (status.success && status.status === 'paid') {
      // Buat panel Pterodactyl
      try {
        console.log('Creating Pterodactyl user & server for:', order.username);
        
        const user = await createPteroUser(order.username, config);
        const server = await createPteroServer(user.data.attributes.id, order, config);
        
        order.panel = {
          userId: user.data.attributes.id,
          serverId: server.data.attributes.id,
          username: order.username,
          password: server.data.attributes.username + ':' + server.data.attributes.password,
          domain: config.domain
        };
        
        order.status = 'completed';
        console.log('✅ Panel created successfully:', order.panel);
        
        res.json({ success: true, status: 'paid', completed: true, panel: order.panel });
      } catch (pteroError) {
        console.error('Pterodactyl error:', pteroError);
        order.status = 'payment_success_but_panel_failed';
        res.json({ success: true, status: 'paid', error: 'Pembayaran sukses tapi gagal buat panel' });
      }
    } else {
      res.json({ success: true, status: status.status || 'pending' });
    }
  } catch (error) {
    console.error('Status check error:', error);
    res.json({ success: false, message: 'Gagal cek status' });
  }
});

app.get('/success/:orderId', (req, res) => {
  const { orderId } = req.params;
  const order = orders.get(orderId);
  
  if (!order || !order.panel) {
    return res.redirect('/?error=Pesanan tidak valid atau belum selesai');
  }
  
  res.render('success', { order });
});

// Pterodactyl helper functions
async function createPteroUser(username, config) {
  const axios = require('axios');
  
  const response = await axios.post(`${config.domain}/api/application/users`, {
    username: username,
    email: `${username}@panel.local`,
    first_name: username,
    last_name: 'User',
    language: 'en',
    password: Math.random().toString(36).slice(-12)
  }, {
    headers: {
      'Authorization': `Bearer ${config.apikey}`,
      'Accept': 'Application/vnd.pterodactyl.v1+json',
      'Content-Type': 'application/json'
    }
  });
  
  console.log('✅ Pterodactyl user created:', username);
  return response.data;
}

async function createPteroServer(userId, order, config) {
  const axios = require('axios');
  
  const serverConfig = {
    name: `${order.username}-server`,
    description: `Server ${order.ram} - Created by Order Panel`,
    user: userId,
    nest: parseInt(config.nestid),
    egg: parseInt(config.eggid),
    docker_image: "ghcr.io/pterodactyl/yolks:omega",
    startup: "./start.sh",
    limits: {
      memory: order.ramConfig.ram,
      swap: 0,
      disk: order.ramConfig.disk,
      io: 500,
      cpu: order.ramConfig.cpu
    },
    environment: {
      "MAX_MEMORY": order.ramConfig.ram.toString(),
      "AUTO_UPDATE": "0"
    },
    features: ["bungeecord"],
    allocation: {
      default: parseInt(config.locid),
      assign: [],
      auto: true
    },
    deploy: {
      locations: [parseInt(config.locid)],
      dedicated_ip: false,
      port_range: []
    }
  };
  
  const response = await axios.post(`${config.domain}/api/application/servers`, serverConfig, {
    headers: {
      'Authorization': `Bearer ${config.apikey}`,
      'Accept': 'Application/vnd.pterodactyl.v1+json',
      'Content-Type': 'application/json'
    }
  });
  
  console.log('✅ Pterodactyl server created:', order.ram);
  return response.data;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Futuristic Order Panel running on port ${PORT}`);
});