const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;
require('dotenv').config();

app.use(cors());
app.use(express.json());


// Add MongoDB Start

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@myclusterone.mhcenxj.mongodb.net/?retryWrites=true&w=majority&appName=MyClusterOne`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // await client.connect();

        // DATA CONNECTION START....
        const dataCollection = client.db('data').collection('books')
        const borrowedBooksCollection = client.db('data').collection('borrowedBooks');
        // DATA CONNECTION END....

        // CURD OPERATION START.
        // ----------------------------------------------------------------------------------


        // GET ALL DATA START.........................
        // GET ALL DATA START.
        app.get('/books', async (req, res) => {
            const result = await dataCollection.find().toArray();
            res.send(result);
        })
        // GET ALL DATA END.
        // GET SINGLE DATA START.
        app.get('/books/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await dataCollection.findOne(query);
            res.send(result);
        })
        // GET SINGLE DATA END.
        // GET ALL DATA END..........................

        // POST UPDATA DELETE OPERATION START................
        // POST DATA START.
        app.post('/books', async (req, res) => {
            const newData = req.body;
            const result = await dataCollection.insertOne(newData);
            res.send(result);
        })
        // POST DATA END.

        // UPDATE DATA START.
        app.put('/books/:id', async (req, res) => {
            const updatedData = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: updatedData,
            };

            const result = await dataCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        })
        // UPDATE DATA END.

        // GET BORROWED BOOKS BY USER EMAIL
        app.get('/borrowed-books', async (req, res) => {
            const userEmail = req.query.email;
            if (!userEmail) {
                return res.status(400).send({ message: 'Email query parameter is required.' });
            }
            const query = { userEmail: userEmail };
            const result = await borrowedBooksCollection.find(query).toArray();
            res.send(result);
        });

        // ADD A BORROWED BOOK (When a user borrows a book)
        // Enhanced POST /borrowed-books (with check for already borrowed)
        app.post('/borrowed-books', async (req, res) => {
            const borrowedBookData = req.body;
            const { userEmail, bookId } = borrowedBookData;
            try {
                const existingBorrow = await borrowedBooksCollection.findOne({ userEmail, bookId });
                if (existingBorrow) {
                    return res.status(400).send({ message: 'You have already borrowed this book.' });
                }
                // Validate bookId format before proceeding
                if (!ObjectId.isValid(bookId)) {
                    return res.status(400).send({ message: 'Invalid Book ID format provided.' });
                }
                const result = await borrowedBooksCollection.insertOne(borrowedBookData);
                await dataCollection.updateOne(
                    { _id: new ObjectId(bookId) },
                    { $inc: { quantity: -1 } }
                );
                res.status(201).send(result); 
            } catch (error) {
                console.error("Error in /borrowed-books POST route:", error);
                res.status(500).send({ message: "Internal Server Error during borrow operation." });
            }
        });
        // INCREMENT BOOK QUANTITY (When a book is returned)
        // This uses $inc to efficiently increase the quantity in the 'books' collection
        app.patch('/book-quantity-inc/:bookId', async (req, res) => {
            const id = req.params.bookId;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $inc: { quantity: 1 }
            };
            const result = await dataCollection.updateOne(filter, updateDoc);
            if (result.matchedCount === 0) {
                return res.status(404).send({ message: 'Book not found.' });
            }
            res.send(result);
        });

        // DELETE BORROWED BOOK ENTRY (After returning)
        app.delete('/borrowed-books/:borrowedBookId', async (req, res) => {
            const id = req.params.borrowedBookId;
            const query = { _id: new ObjectId(id) };
            const result = await borrowedBooksCollection.deleteOne(query);
            if (result.deletedCount === 0) {
                return res.status(404).send({ message: 'Borrowed book entry not found.' });
            }
            res.send({ message: 'Borrowed book entry deleted successfully.' });
        });

        // POST UPDATA DELETE OPERATION END...................

        // ----------------------------------------------------------------------------------
        // CURD OPERATION END.
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // await client.close();
    }
}
run().catch(console.dir);

// Add MongoDB End

app.get('/', (req, res) => {
    res.send('Library management system is running...!');
})

app.listen(port, () => {
    console.log(`server side app listening on port ${port}`);
})