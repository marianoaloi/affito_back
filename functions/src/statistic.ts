import { Router } from "express";
import { MongoClient } from "mongodb";
import { config } from "./env";

export const statisticRouter = (client: MongoClient) => {
    const router = Router();

    router.get("/affiti", async (req, res) => {
        try {
            const db = client.db(config.mongodb.database);
            const collection = db.collection(config.mongodb.collection);


      const query: any = [
        {
          '$match': {
            'deleted': {
              '$exists': false
            }
          }
        }, {
          '$project': {
            '_id': 1,
            'stateMaloi': 1,
            'realEstate': {
              'properties': '$powerproperties',
              'title': 1,
              'price': 1
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
