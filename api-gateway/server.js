require('dotenv').config();
const express = require('express');
const Config = require('./src');
const proxy = require('express-http-proxy');

const app = express();
app.use(express.json());


// Log incoming requests
app.use((req, res, next) => {
    console.log(`Incoming Request: ${req.method} ${req.url}`);
    next();
});

// Validate all services are defined
Object.entries(Config).forEach(([key, value]) => {
    if (!value) {
        console.error(`Missing environment variable for ${key.toUpperCase()}_SERVICE_URL`);
        process.exit(1);
    }
});

// Log resolved services
console.log("Resolved Services:");
console.table(Config);

const proxyWithLogging = (target) => proxy(target, {
    proxyReqPathResolver: (req) => {
        const fullIncomingPath = req.originalUrl;
        console.log(`Incoming Request: ${req.method} ${fullIncomingPath}`);
        console.log(`Proxying request to: ${target}${fullIncomingPath}`);
        return fullIncomingPath;
    },
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
        if (srcReq.user) {
            proxyReqOpts.headers['X-User-Data'] = encodeURIComponent(JSON.stringify(srcReq.user));
        }
        return proxyReqOpts;
    },
    proxyErrorHandler: (err, req, res) => {
        console.error(`❌ Proxy error for ${req.method} ${req.originalUrl}: ${err.message}`);
        if (res && typeof res.status === 'function') {
            return res.status(502).json({
                error: "Service unavailable",
                message: err.message || "Unknown error",
            });
        } else {
            console.error("⚠️ Response object is missing or not initialized!");
            console.log(req.app.use)
            req.app.use((req, res) => {
                console.log(res);
                res.status(502).json({
                    error: "Service unavailable",
                    message: "The requested service is down or unreachable.",
                });
            });
        }
    }
});


// Forward requests to microservices
app.use('/auth', proxyWithLogging(Config.auth));
app.use('/user/*', proxyWithLogging(Config.user));
app.use('/tournament', proxyWithLogging(Config.tournament));
app.use('/product', proxyWithLogging(Config.product));
app.use('/scoring', proxyWithLogging(Config.scoring));
app.use('/team', proxyWithLogging(Config.team));
app.use('/venue', proxyWithLogging(Config.venue));
app.use('/notifications', proxyWithLogging(Config.notification));

// Start servers
app.listen(Config.PORT, Config.HOST, () => {
    console.log(`API Gateway running on port ${Config.PORT}`);
});
