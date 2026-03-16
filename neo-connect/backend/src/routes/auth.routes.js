const { Router } = require('express');
const { authController } = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { authLimiter } = require('../middleware/rateLimit.middleware');
const { loginSchema } = require('../validators/auth.validator');

const router = Router();

router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/verify-otp', authController.verifyOtp);
router.post('/refresh', authController.refresh);
router.post('/logout', authenticate, authController.logout);

module.exports = router;
