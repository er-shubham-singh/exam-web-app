import express from 'express';
import cors from 'cors';

const app = express();

app.use(express.json());
app.use(cors());

// routes
import question from './routes/question.routes.js'; // make sure this file exists & exports a router
app.use('/api', question);

import domainRoutes from "./routes/domain.route.js";
app.use("/api", domainRoutes);

import paperRoutes from "./routes/paper.routes.js";
app.use("/api", paperRoutes);

import userRoutes from './routes/user.routes.js'
app.use("/api",userRoutes)

import examRoute from "./routes/examLog.route.js"
app.use("/api",examRoute)

import evaluationRoute from './routes/evaluatedResult.routes.js'
app.use("/api",evaluationRoute)

// View Result
import viewResult from './routes/viewResult.routes.js'
app.use("/api",viewResult)

export default app;
