const express = require("express");
const app = express();
const port = process.env.PORT || 3000;

const baseUrl = "/api/v1/";

const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const usersrouter = require("./routers/users");
const clientsrouter = require("./routers/clients");
const systemConfiguration = require("./routers/systemConfiguration");
const projectsrouter = require("./routers/projects");
const draftsrouter = require("./routers/drafts");
const erwhandling = require("./midelwers/Handeling error");

require("dotenv").config();

const mongoose = require("mongoose");
console.log(process.env.DATABASE_URL);
mongoose.connect(process.env.DATABASE_URL)
    .then(() => console.log("MongoDB Connected"))
    .catch(console.error);

app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));

app.use("/uploads", express.static("uploads"));

process.on("uncaughtException", (error) => {
    console.log("uncaughtException ::", error);
});
app.get("/", (req, res) => {
    res.send("Backend is running 🚀");
});
app.use(`${baseUrl}users`, usersrouter);
app.use(`${baseUrl}clients`, clientsrouter);
app.use(`${baseUrl}system`, systemConfiguration);
app.use(`${baseUrl}projects`, projectsrouter);
app.use(`${baseUrl}drafts`, draftsrouter);
app.use(erwhandling);
app.listen(port, () => {
    console.log(`App is running on port ${port}`);
});