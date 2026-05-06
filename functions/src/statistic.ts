import { Router } from "express";
import { MongoClient } from "mongodb";
import { config } from "./env";

export const statisticRouter = (client: MongoClient) => {
  const router = Router();


  /**
   * @swagger
   * /statistic/affiti:
   *   get:
   *     summary: Retrieve a simplified list of all active affito documents for statistics
   *     description: Returns a list of documents that are not marked as deleted, including their ID, state, title, price, and properties.
   *     tags: [Statistics]
   *     responses:
   *       200:
   *         description: A list of simplified affito documents.
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
   *                     type: object
   *                     properties:
   *                       _id:
   *                         type: integer
   *                       stateMaloi:
   *                         type: integer
   *                       realEstate:
   *                         type: object
   *                         properties:
   *                           title:
   *                             type: string
   *                           price:
   *                             type: number
   *                           properties:
   *                             type: object
   *                 count:
   *                   type: integer
   *       500:
   *         description: Failed to fetch data from database.
   */

  router.get("/affiti", async (req, res) => {
    try {
      const db = client.db(config.mongodb.database);
      const collection = db.collection(config.mongodb.collection);


      const query: any = [
        {
          "$match": {
            "deleted": {
              "$exists": false
            },
            "type": { $exists: true },
            "powerproperties.location.province": { $exists: true }
          }
        }, {
          "$project": {
            "_id": 1,
            "stateMaloi": 1,
            "type": 1,
            "realEstate": {
              "properties": "$powerproperties",
              "title": 1,
              "price": 1
            }
          }
        }
      ];


      const documents = await collection.aggregate(query).toArray();

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

  return router;
};
