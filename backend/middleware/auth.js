const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
    const authHeader = req.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Authentication required. Please log in." });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: "Token missing. Authentication required." });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Session expired. Please log in again." });
        }
        return res.status(401).json({ message: "Invalid authentication token." });
    }
}

function requireRole(role) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: "Authentication required." });
        }

        if (req.user.role !== role) {
            return res.status(403).json({ message: `Forbidden. Only ${role} accounts can access this resource.` });
        }

        next();
    };
}

module.exports = {
    requireAuth,
    requireRole
};
