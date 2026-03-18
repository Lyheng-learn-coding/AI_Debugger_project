require("dotenv").config();
const express = require("express");
const app = express();
const PORT = 3000;

app.use(express.json());

const api = require("./Routers/ApiRouter");

app.use("/api", api);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
