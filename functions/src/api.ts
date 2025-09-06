import { Router } from "express";
import { MongoClient } from "mongodb";

import { config } from "./env";
import authenticate from "./firebaseAuth";

export const apiRouter = (client: MongoClient) => {
  const router = Router();

  /**
   * @swagger
   * components:
   *   schemas:
   *     Affito:
   *       type: object
   *       properties:
   *         _id:
   *           type: integer
   *           description: The document"s unique identifier.
   *         stateMaloi:
   *           type: integer
   *           description: The state of the document (0, 1, or 2).
   *         description:
   *           type: string
   *           description: A description of the property.
   *       example:
   *         _id: 97417958
   *         stateMaloi: 1
   *         description: "Appartamento in centro"
   *
   * tags:
   *   - name: Affito
   *     description: Operations related to affito documents
   *   - name: Health
   *     description: API health check
   */

  // API Routes
  /**
   * @swagger
   * /api/affito:
   *   post:
   *     summary: Retrieve a filtered list of all affito documents
   *     tags: [Affito]
   *     requestBody:
   *       required: false
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               priceMin:
   *                 type: number
   *               priceMax:
   *                 type: number
   *               stateMaloi:
   *                 type: number
   *               elevator:
   *                 type: string
   *                 enum: ["Sì", "No"]
   *               floor:
   *                 type: number
   *           example:
   *             priceMin: 100
   *             priceMax: 500
   *             stateMaloi: 1
   *             elevator: "Sì"
   *             floor: 2
   *     responses:
   *       200:
   *         description: A list of documents.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: "#/components/schemas/Affito"
   *                 count:
   *                   type: integer
   *       500:
   *         description: Failed to fetch data from database.
   */
  router.post("/affito", async (req, res) => {
    try {
      const db = client.db(config.mongodb.database);
      const collection = db.collection(config.mongodb.collection);
      const { priceMin, priceMax, stateMaloi, elevator, floor, agentName } = req.body;

      const query: any = { deleted: { $exists: false } };

      if (priceMin !== undefined || priceMax !== undefined) {
        query.price = {};
        if (priceMin !== undefined) {
          query.price.$gte = priceMin;
        }
        if (priceMax !== undefined) {
          query.price.$lte = priceMax;
        }
      }

      if (stateMaloi !== undefined) {
        query.stateMaloi = stateMaloi;
        if (stateMaloi === -1) {
          query.stateMaloi = { $exists: false };
        }
      }

      if (elevator !== undefined) {
        if (elevator === "empty") {
          query["realEstate.properties.featureList.type"] = { "$ne": "elevator" };
        } else {
          query["realEstate.properties.featureList.compactLabel"] = elevator;
        }
      }

      if (floor !== undefined) {
        query["realEstate.properties.featureList.compactLabel"] = floor;
      }

      if (agentName !== undefined) {
        console.log(agentName);
        query["realEstate.advertiser.agency.displayName"] = {"$regex": agentName, "$options": "i"};
      }

      // Get all documents from the collection
      const documents = await collection.find(query).toArray();

      res.json({
        success: true,
        data: documents,
        count: documents.length
      });
    } catch (error) {
      console.error("Error fetching data:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch data from database"
      });
    }
  });

  /**
   * @swagger
   * /api/affito/{id}:
   *   get:
   *     summary: Get a single affito document by its ID
   *     tags: [Affito]
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: integer
   *         required: true
   *         description: Numeric ID of the document to get.
   *     responses:
   *       200:
   *         description: The requested document.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: "#/components/schemas/Affito"
   *       404:
   *         description: Document not found.
   *       500:
   *         description: Failed to fetch document.
   */
  router.get("/affito/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const db = client.db(config.mongodb.database);
      const collection = db.collection(config.mongodb.collection);
      const filter = { _id: parseInt(id) as any };

      // Find document by ID
      const document = await collection.findOne(filter);
      let merror = "";
      if (!document) {
        merror = "Document not found";
        throw new Error(merror);
      }

      res.json({
        success: true,
        data: document
      });
    } catch (error) {
      console.error("Error fetching document:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch document " + error
      });
    }
  });

  /**
   * @swagger
   * /api/affito/{id}/state:
   *   post:
   *     summary: Update the state of an affito document
   *     tags: [Affito]
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: integer
   *         required: true
   *         description: Numeric ID of the document to update.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - stateMaloi
   *             properties:
   *               stateMaloi:
   *                 type: integer
   *                 description: The new state for the document (must be 0, 1, or 2).
   *             example:
   *               stateMaloi: 2
   *     responses:
   *       200:
   *         description: State updated successfully.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *       400:
   *         description: Invalid state value provided.
   *       404:
   *         description: Document not found.
   *       500:
   *         description: Failed to update document.
   */
  router.post("/affito/:id/state", async (req, res) => {
    const user = await authenticate(req, res);
    if (!user) {
      return;
    }

    try {
      const { id } = req.params;
      const { stateMaloi } = req.body;

      const numericState = parseInt(stateMaloi, 10);

      let merror = "";

      if (isNaN(numericState) || ![0, 1, 2].includes(numericState)) {
        merror = "Invalid state value. Must be 0, 1, or 2. Sent: " + stateMaloi;
        throw new Error(merror);
      }

      const db = client.db(config.mongodb.database);
      const collection = db.collection(config.mongodb.collection);
      const filter = { _id: parseInt(id) as any };

      if (user.email != "mariano@aloi.com.br") {
        merror = "Only Mariano Aloi can change the status.";
        throw new Error(merror);
      }

      const result = await collection.updateOne(
        filter,
        { $set: { stateMaloi: numericState, mLastUpdate: new Date().getTime() / 1000, userUpdate: user.email } }
      );

      if (result.matchedCount === 0) {
        merror = "Document not found";
        throw new Error(merror);
      }

      res.json({
        success: true,
        message: "State updated successfully"
      });
    } catch (error) {
      console.error("Error updating document:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update document " + error
      });
    }
    return;
  });

  // Health check endpoint
  /**
   * @swagger
   * /api/health:
   *   get:
   *     summary: Perform a health check
   *     tags: [Health]
   *     responses:
   *       200:
   *         description: Server is running and healthy.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   */
  router.get("/health", (req, res) => {
    res.json({
      success: true,
      message: "Server is running",
      timestamp: new Date().toISOString()
    });
  });

  return router;
};
