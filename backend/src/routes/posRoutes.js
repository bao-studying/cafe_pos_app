const express = require("express");
const router = express.Router();
const posSessionController = require("../controllers/posSessionController");

router.post("/session-login", posSessionController.sessionLogin);
router.patch("/session-logout/:id", posSessionController.sessionLogout);
router.get("/session-logs", posSessionController.getSessionLogs);

module.exports = router;
