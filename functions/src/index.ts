/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { setGlobalOptions } from "firebase-functions";
import * as logger from "firebase-functions/logger";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function"s options, e.g.
// `onRequest({maxInstances: 5}, (req, res) => {...})`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({maxInstances: 10}) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
//});

import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import path from "path";
import { config } from "./env";
import { apiRouter } from "./api";


const app = express();
const PORT = config.server.port;

// List of allowed origins
const allowedOrigins = [
    "http://localhost:3000",
    "https://affiti.aloi.com.br",
];

// Middleware
app.use(cors({
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],

    origin: function (origin: string | undefined, callback: any) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
            return callback(null, true);
        }
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        } else {
            if (origin.includes("localhost")) {
                allowedOrigins.push(origin);
                return callback(null, true);

            } else {
                return callback(new Error("Not allowed by CORS"));
            }
        }
    },
    credentials: true, // if you need to send cookies or auth headers
}));
app.use(express.json());

// MongoDB connection
let client: MongoClient;
/**
 * Init MOngo and service
 */
async function connectToMongoDB() {
    try {
        // Read the certificate file
        const certPath = path.resolve(config.mongodb.certificatePath);

        // Create MongoDB client with X509 authentication
        client = new MongoClient(config.mongodb.url, {
            ssl: true,
            tlsCertificateKeyFile: certPath,
        });

        await client.connect();
        logger.log("Connected to MongoDB successfully");

        // Test the connection
        const db = client.db(config.mongodb.database);
        await db.admin().ping();
        logger.log("Database ping successful");

        // Swagger (OpenAPI) setup
        const swaggerOptions = {
            swaggerDefinition: {
                openapi: "3.0.0",
                info: {
                    title: "Serveraffito API Documentation",
                    version: "1.0.0",
                    description: "This is the API documentation for the Serveraffito project, " +
                        "allowing interaction with affito documents.",
                },
                servers: [
                    {
                        url: `http://localhost:${PORT}`,
                        description: "Development server",
                    },
                ],
            },
            apis: [path.join(__dirname, "./api.ts")], // Path to the file with API annotations
        };
        const swaggerDocs = swaggerJsdoc(swaggerOptions);
        app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));


        app.get("/", (req, res) => {
            logger.info("Hello logs!", { structuredData: true });
            res.send("Hello World!");
        });

        // API Routes
        app.use("/api", apiRouter(client!));
    } catch (error) {
        logger.error("Failed to connect to MongoDB:", error);
        process.exit(1);
    }
}


// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled error:", err);
    res.status(500).json({
        success: false,
        error: "Internal server error"
    });
});

// Start server
/**
 * Prepare the server
 */
async function startServer() {
    await connectToMongoDB();

    app.listen(PORT, () => {
        logger.log(`Server is running on port ${PORT}`);
        logger.log(`Health check: http://localhost:${PORT}/api/health`);
        logger.log(`Affito data: http://localhost:${PORT}/api/affito`);
        logger.log(`Affito swagger: http://localhost:${PORT}/api-docs`);
    });
}

import { onRequest } from "firebase-functions/v2/https";
exports.api = onRequest(app);


startServer().catch(logger.error);
