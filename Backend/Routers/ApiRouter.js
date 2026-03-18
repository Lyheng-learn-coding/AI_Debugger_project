const express = require("express");

const router = express.Router();

const { viewResult } = require("../Controller/ApiController");

router.post("/", viewResult);

module.exports = router;
