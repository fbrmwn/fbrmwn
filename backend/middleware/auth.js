// Simple authentication middleware for admin operations
const adminAuth = (req, res, next) => {
    // For this educational project, we're using simple authentication
    // In production, you should implement proper authentication
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        return res.status(401).json({ 
            error: 'Akses ditolak. Diperlukan autentikasi untuk operasi ini.' 
        });
    }
    
    // Simple token check (in real app, use JWT or proper auth)
    if (authHeader !== 'Bearer admin-token') {
        return res.status(403).json({ 
            error: 'Token tidak valid' 
        });
    }
    
    next();
};

// Optional: Rate limiting middleware
const rateLimit = (windowMs = 15 * 60 * 1000, maxRequests = 100) => {
    const requests = new Map();
    
    return (req, res, next) => {
        const ip = req.ip;
        const now = Date.now();
        const windowStart = now - windowMs;
        
        // Clean old entries
        for (const [key, timestamp] of requests.entries()) {
            if (timestamp < windowStart) {
                requests.delete(key);
            }
        }
        
        // Check rate limit
        const clientRequests = Array.from(requests.entries())
            .filter(([key]) => key.startsWith(ip))
            .length;
        
        if (clientRequests >= maxRequests) {
            return res.status(429).json({
                error: 'Terlalu banyak request. Silakan coba lagi nanti.'
            });
        }
        
        // Add current request
        requests.set(`${ip}-${now}`, now);
        
        next();
    };
};

module.exports = {
    adminAuth,
    rateLimit
};