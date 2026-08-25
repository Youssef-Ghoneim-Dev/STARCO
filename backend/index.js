require("dotenv").config();

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
const whatsapprouter = require("./routers/whatsapp");
const dashboardRouter = require("./routers/dashboard");
const { captureAfterSuccessfulMutation } = require("./services/dashboardStatistics");
const erwhandling = require("./midelwers/Handeling error");

app.use(express.json({
    verify: (req, res, buffer) => {
        if (req.url.startsWith(`${baseUrl}whatsapp/webhook`)) {
            req.rawBody = Buffer.from(buffer);
        }
    }
}));
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));

app.use("/uploads", express.static("uploads"));

process.on("uncaughtException", (error) => {
    console.log("uncaughtException ::", error);
});
app.get("/", (req, res) => {
    res.send(`Backend is running 🚀`);
});
app.use(`${baseUrl}users`, usersrouter);
app.use(`${baseUrl}clients`, clientsrouter);
app.use(`${baseUrl}system`, systemConfiguration);
app.use(`${baseUrl}projects`, captureAfterSuccessfulMutation);
app.use(`${baseUrl}clients`, captureAfterSuccessfulMutation);
app.use(`${baseUrl}projects`, projectsrouter);
app.use(`${baseUrl}whatsapp`, whatsapprouter);
app.use(`${baseUrl}dashboard`, dashboardRouter);
app.use(erwhandling);
const mongoose = require("mongoose")
async function startServer() {
    try {
        await mongoose.connect(process.env.DATABASE_URL);
        console.log("MongoDB Connected");

        app.listen(port, () => {
            console.log(`App is running on port ${port}`);
        });
    } catch (err) {
        console.error(err);
    }
}

startServer();
